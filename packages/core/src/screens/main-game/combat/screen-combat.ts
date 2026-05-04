import {
  type ActionIconIndex,
  type CombatAction,
  type CombatMedicineGoods,
  type CombatPhase,
  type CombatThrowableGoods,
  type MonsterTargetMode,
  type PlayerTargetMode,
} from '@/combat/combat-actions';
import type { CombatFinishResult, CombatSession } from '@/combat/combat-runtime';
import type { Monster, Player } from '@/characters';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { CombatActionPreparer } from './combat-action-preparer';
import { CombatActionQueue, type CombatActionQueueResult } from './combat-action-queue';
import { useGoodsFromBag } from './combat-action-utils';
import { createThrowGoodsSelection, createUseGoodsSelection, type CombatGoodsActionSelection } from './combat-goods-actions';
import { CombatGoodsMenu } from './combat-goods-menu';
import { CombatInputHandler } from './combat-input';
import { CombatLossAnimation } from './combat-loss-animation';
import { CombatMagicMenu } from './combat-magic-menu';
import { CombatMenuController } from './combat-menu-controller';
import { canSelectCoopTarget, createCoopPlayerAction } from './combat-coop-actions';
import {
  createAutoAttackActions,
  createDisabledPlayerAction,
  createFleeActions,
  createMonsterTargetAction,
  createPlayerTargetAction,
  createRepeatedPlayerActions,
} from './combat-player-actions';
import {
  getFirstAliveMonsterIndex,
  getFirstAlivePlayerIndex,
  getNextAlivePlayerIndex,
  getPreviousAlivePlayerIndex,
} from './combat-targeting';
import { CombatRenderer } from './combat-renderer';
import { completeRound, triggerRoundEvent } from './combat-round';
import { ScreenCombatSuccess } from './screen-combat-success';

export interface ScreenCombatOptions {
  readonly allowDebugWin?: boolean;
}

const ACTION_INTERVAL = 520;
const MESSAGE_INTERVAL = 1200;

// 战斗 screen 负责 UI 和动作队列调度，具体数值效果放在 combat 模块保持和 Kotlin actions 对齐。
export class ScreenCombat extends BaseScreen {
  private readonly renderer: CombatRenderer;
  private readonly actionQueue: CombatActionQueue;
  private readonly goodsMenu: CombatGoodsMenu;
  private readonly inputHandler: CombatInputHandler;
  private readonly magicMenu: CombatMagicMenu;
  private readonly menuController: CombatMenuController;
  private successScreen: ScreenCombatSuccess | null = null;
  private lossAnimation: CombatLossAnimation | null = null;
  private phase: CombatPhase = 'selectAction';
  private currentPlayerIndex = 0;
  private targetIndex = 0;
  private playerTargetIndex = 0;
  private actionIconIndex: ActionIconIndex = 1;
  private miscIndex = 0;
  private combatGoodsIndex = 0;
  private statusPlayerIndex = 0;
  private roundCount = 0;
  private roundEventTriggered = false;
  private autoAttack = false;
  private readonly lastPlayerActions: Map<number, CombatAction>;
  private monsterTargetMode: MonsterTargetMode = { kind: 'attack' };
  private playerTargetMode: PlayerTargetMode | null = null;
  private message = '';
  private messageElapsed = 0;

  constructor(
    game: Game,
    private readonly session: CombatSession,
    private readonly options: ScreenCombatOptions = {}
  ) {
    super(game);
    this.renderer = new CombatRenderer(game);
    const actionPreparer = new CombatActionPreparer({
      game,
      session,
      actionInterval: ACTION_INTERVAL,
      setMessage: (message, duration) => this.setMessage(message, duration),
    });
    this.actionQueue = new CombatActionQueue({
      game,
      session,
      actionPreparer,
      actionInterval: ACTION_INTERVAL,
    });
    this.goodsMenu = new CombatGoodsMenu({
      game,
      screenStack: this.screenStack,
      players: session.players,
      setMessage: message => this.setMessage(message),
      onCancel: () => {
        this.phase = 'goodsMenu';
      },
      onConfirmThrowGoods: goods => this.confirmThrowGoods(goods),
      onConfirmUseGoods: goods => this.confirmUseGoods(goods),
    });
    this.magicMenu = new CombatMagicMenu({
      game,
      screenStack: this.screenStack,
      players: session.players,
      monsters: session.monsters,
      getCurrentPlayer: () => this.currentPlayer,
      ensureSelectedMonster: () => this.ensureSelectedMonster(),
      setMessage: message => this.setMessage(message),
      setPhase: phase => {
        this.phase = phase;
      },
      setMonsterTargetMode: mode => {
        this.monsterTargetMode = mode;
      },
      setPlayerTargetMode: mode => {
        this.playerTargetMode = mode;
      },
      setPlayerTargetIndex: index => {
        this.playerTargetIndex = index;
      },
      confirmPlayerAction: action => this.confirmPlayerAction(action),
      startSuccess: () => this.startSuccess(),
    });
    this.menuController = new CombatMenuController({
      getCurrentPlayer: () => this.currentPlayer,
      getCurrentPlayerIndex: () => this.currentPlayerIndex,
      ensureSelectedMonster: () => this.ensureSelectedMonster(),
      setPhase: phase => {
        this.phase = phase;
      },
      setMiscIndex: index => {
        this.miscIndex = index;
      },
      setCombatGoodsIndex: index => {
        this.combatGoodsIndex = index;
      },
      setStatusPlayerIndex: index => {
        this.statusPlayerIndex = index;
      },
      setMonsterTargetMode: mode => {
        this.monsterTargetMode = mode;
      },
      openMagicMenu: () => this.magicMenu.open(),
      startCoopTargetSelect: () => this.startCoopTargetSelect(),
      startAutoAttack: () => this.startAutoAttack(),
      confirmDefend: () => this.confirmDefend(),
      confirmFlee: () => this.confirmFlee(),
      goodsMenu: this.goodsMenu,
    });
    this.inputHandler = new CombatInputHandler({
      getPhase: () => this.phase,
      setPhase: phase => {
        this.phase = phase;
      },
      getCurrentPlayer: () => this.currentPlayer,
      getPlayerTargetMode: () => this.playerTargetMode,
      clearPlayerTargetMode: () => {
        this.playerTargetMode = null;
      },
      getMonsters: () => this.session.monsters,
      getPlayers: () => this.session.players,
      getTargetIndex: () => this.targetIndex,
      setTargetIndex: index => {
        this.targetIndex = index;
      },
      getPlayerTargetIndex: () => this.playerTargetIndex,
      setPlayerTargetIndex: index => {
        this.playerTargetIndex = index;
      },
      getMiscIndex: () => this.miscIndex,
      setMiscIndex: index => {
        this.miscIndex = index;
      },
      getCombatGoodsIndex: () => this.combatGoodsIndex,
      setCombatGoodsIndex: index => {
        this.combatGoodsIndex = index;
      },
      setActionIconIndex: index => {
        this.actionIconIndex = index;
      },
      confirmActionIcon: () => this.menuController.confirmActionIcon(this.actionIconIndex),
      repeatLastActions: () => this.repeatLastActions(),
      cancelPlayerAction: () => this.cancelPlayerAction(),
      confirmMonsterTarget: () => this.confirmMonsterTarget(),
      confirmPlayerTarget: () => this.confirmPlayerTarget(),
      confirmMiscItem: () => this.menuController.confirmMiscItem(this.miscIndex),
      confirmCombatGoodsMenuItem: () => this.menuController.confirmCombatGoodsMenuItem(this.combatGoodsIndex),
      selectStatusPlayer: step => this.selectStatusPlayer(step),
    });
    this.lastPlayerActions = session.getLastPlayerActions();
    this.currentPlayerIndex = getFirstAlivePlayerIndex(this.session.players);
    this.statusPlayerIndex = Math.max(0, this.currentPlayerIndex);
    this.targetIndex = getFirstAliveMonsterIndex(this.session.monsters);
  }

  override update(delta: number): void {
    if (this.lossAnimation) {
      if (!this.lossAnimation.update(delta)) this.finish('loss');
      return;
    }
    if (this.successScreen?.update(delta)) {
      this.finish('win');
      return;
    }
    if (this.messageElapsed > 0) {
      this.messageElapsed = Math.max(0, this.messageElapsed - delta);
    }
    if (this.phase === 'selectAction') {
      this.triggerRoundEventOnce();
      if (this.autoAttack) {
        this.generateAutoAttackRound();
        return;
      }
      this.autoSelectDisabledPlayerAction();
    }
    if (this.phase === 'performing') {
      this.updateActionQueue(delta);
    }
  }

  draw(surface: Surface): void {
    this.renderer.draw(surface, {
      session: this.session,
      phase: this.phase,
      autoAttack: this.autoAttack,
      successScreen: this.successScreen,
      animation: this.lossAnimation ?? this.actionQueue.currentAnimation,
      actionIconIndex: this.actionIconIndex,
      miscIndex: this.miscIndex,
      combatGoodsIndex: this.combatGoodsIndex,
      statusPlayerIndex: this.statusPlayerIndex,
      currentPlayer: this.currentPlayer,
      currentMonster: this.currentUiMonster,
      currentTargetPlayer: this.currentTargetPlayer,
      message: this.message,
      showMessage: this.messageElapsed > 0,
    });
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (this.successScreen) {
      this.successScreen.skip();
      return;
    }
    if (this.lossAnimation) return;

    if (this.options.allowDebugWin && key === KeyCode.PageDown) {
      this.startSuccess();
      return;
    }
    if (this.autoAttack) {
      if (key === KeyCode.Cancel) this.autoAttack = false;
      return;
    }
    if (this.phase === 'performing') return;
    this.inputHandler.onKey(key);
  }

  private confirmMonsterTarget(): void {
    const player = this.currentPlayer;
    const monster = this.currentMonster;
    if (!player || !monster) throw new Error('确认目标时缺少可行动角色或目标');
    const result = createMonsterTargetAction(player, monster, this.monsterTargetMode, this.session.players, this.session.monsters);
    if (result.kind === 'coop') {
      this.confirmCoopAction(monster);
      return;
    }
    if (result.goodsToUse) useGoodsFromBag(this.game, result.goodsToUse);
    this.confirmPlayerAction(result.action);
  }

  private autoSelectDisabledPlayerAction(): void {
    const action = createDisabledPlayerAction(this.currentPlayer);
    if (action) this.confirmPlayerAction(action, false);
  }

  private startCoopTargetSelect(): void {
    if (!canSelectCoopTarget(this.session.players, this.currentPlayer)) return;
    if (!this.ensureSelectedMonster()) return;
    this.monsterTargetMode = { kind: 'coop' };
    this.phase = 'selectTarget';
  }

  private confirmCoopAction(monster: Monster): void {
    const action = createCoopPlayerAction(this.session.players, this.currentPlayer, monster, this.session.monsters);
    if (!action) return;
    this.actionQueue.clearAndRestoreItems();
    this.actionQueue.push(action);
    for (const actor of action.actors) {
      this.rememberPlayerAction(actor, action);
    }
    this.startPerforming();
  }

  private confirmPlayerTarget(): void {
    const mode = this.playerTargetMode;
    const player = this.currentPlayer;
    const target = this.currentTargetPlayer;
    if (!mode || !player || !target) throw new Error('确认玩家目标时状态不完整');
    const result = createPlayerTargetAction(player, target, mode);
    if (result.goodsToUse) useGoodsFromBag(this.game, result.goodsToUse);
    this.confirmPlayerAction(result.action);
    this.playerTargetMode = null;
  }

  private confirmThrowGoods(goods: CombatThrowableGoods): void {
    const player = this.currentPlayer;
    if (!player) throw new Error('投掷道具时缺少当前角色');
    this.applyGoodsSelection(createThrowGoodsSelection(player, goods, this.session.monsters));
  }

  private confirmUseGoods(goods: CombatMedicineGoods): void {
    const player = this.currentPlayer;
    if (!player) throw new Error('使用道具时缺少当前角色');
    this.applyGoodsSelection(createUseGoodsSelection(player, goods, this.session.players));
  }

  private applyGoodsSelection(selection: CombatGoodsActionSelection): void {
    if (selection.kind === 'none') return;
    if (selection.kind === 'action') {
      useGoodsFromBag(this.game, selection.goodsToUse);
      this.confirmPlayerAction(selection.action);
      return;
    }
    if (selection.kind === 'monsterTarget') {
      if (!this.ensureSelectedMonster()) return;
      this.monsterTargetMode = selection.mode;
      this.phase = 'selectTarget';
      return;
    }
    this.playerTargetIndex = selection.targetIndex;
    this.playerTargetMode = selection.mode;
    this.phase = 'selectPlayerTarget';
  }

  private confirmDefend(): void {
    const player = this.currentPlayer;
    if (!player) throw new Error('防御时缺少当前角色');
    player.fightingSprite!.currentFrame = 9;
    this.confirmPlayerAction({ kind: 'defend', actor: player });
  }

  private confirmFlee(): void {
    for (const action of createFleeActions(this.session.players, this.currentPlayerIndex, this.session.isRandomFight)) {
      this.actionQueue.push(action);
    }
    this.startPerforming();
  }

  private confirmPlayerAction(action: CombatAction, remember = true): void {
    this.actionQueue.push(action);
    if (remember && this.currentPlayer) this.rememberPlayerAction(this.currentPlayer, action);
    const nextIndex = getNextAlivePlayerIndex(this.session.players, this.currentPlayerIndex);
    if (nextIndex < 0) {
      this.startPerforming();
      return;
    }
    this.currentPlayerIndex = nextIndex;
    this.actionIconIndex = 1;
    this.phase = 'selectAction';
  }

  private cancelPlayerAction(): void {
    const previousIndex = getPreviousAlivePlayerIndex(this.session.players, this.currentPlayerIndex);
    if (previousIndex < 0) return;
    this.actionQueue.popAndRestore();
    this.currentPlayerIndex = previousIndex;
    this.actionIconIndex = 1;
    this.phase = 'selectAction';
  }

  private startAutoAttack(): void {
    this.actionQueue.clearAndRestoreItems();
    this.autoAttack = true;
    this.phase = 'selectAction';
  }

  private generateAutoAttackRound(): void {
    const actions = createAutoAttackActions(this.session.players, this.session.monsters);
    if (!actions) {
      this.startSuccess();
      return;
    }
    this.actionQueue.clearAndRestoreItems();
    for (const action of actions) {
      this.actionQueue.push(action);
    }
    this.startPerforming();
  }

  private repeatLastActions(): void {
    const actions = createRepeatedPlayerActions({
      players: this.session.players,
      monsters: this.session.monsters,
      lastPlayerActions: this.lastPlayerActions,
      bag: this.game.bag,
    });
    if (actions.length === 0) return;
    this.actionQueue.clearAndRestoreItems();
    for (const item of actions) {
      this.actionQueue.push(item.action);
      for (const index of item.rememberIndexes) {
        const player = this.session.players[index];
        if (player) this.rememberPlayerAction(player, item.action);
      }
    }
    if (this.actionQueue.length > 0) this.startPerforming();
  }

  private startPerforming(): void {
    this.actionQueue.startPerforming();
    this.phase = 'performing';
  }

  private updateActionQueue(delta: number): void {
    this.handleActionQueueResult(this.actionQueue.update(delta));
  }

  private handleActionQueueResult(result: CombatActionQueueResult): void {
    if (result.kind === 'running') return;
    if (result.kind === 'finishRound') {
      this.finishRound();
      return;
    }
    if (result.kind === 'startSuccess') {
      this.startSuccess();
      return;
    }
    this.finishOrStartLoss(result.result);
  }

  private finishRound(): void {
    const result = completeRound(this.session, this.roundCount);
    if (result.kind === 'startSuccess') {
      this.startSuccess();
      return;
    }
    if (result.kind === 'finish') {
      this.finishOrStartLoss(result.result);
      return;
    }

    this.roundCount = result.roundCount;
    this.currentPlayerIndex = result.currentPlayerIndex;
    this.targetIndex = result.targetIndex;
    this.actionIconIndex = 1;
    this.miscIndex = 0;
    this.roundEventTriggered = false;
    this.phase = 'selectAction';
  }

  private startSuccess(): void {
    this.phase = 'success';
    this.successScreen = new ScreenCombatSuccess(this.game, this.session.settleWin());
  }

  private finishOrStartLoss(result: CombatFinishResult): void {
    if (result === 'loss' && this.session.isRandomFight) {
      this.startLossAnimation();
      return;
    }
    this.finish(result);
  }

  private startLossAnimation(): void {
    if (this.lossAnimation) return;
    this.actionQueue.clearAndRestoreItems();
    this.autoAttack = false;
    this.messageElapsed = 0;
    this.phase = 'performing';
    this.lossAnimation = new CombatLossAnimation(this.game);
  }

  private finish(result: CombatFinishResult): void {
    this.close();
    this.session.finish(result);
  }

  private ensureSelectedMonster(): boolean {
    const monster = this.currentMonster;
    if (monster?.isAlive) return true;
    const index = getFirstAliveMonsterIndex(this.session.monsters);
    if (index < 0) return false;
    this.targetIndex = index;
    return true;
  }

  private selectStatusPlayer(step: 1 | -1): void {
    const count = this.session.players.length;
    if (count === 0) throw new Error('查看战斗状态时没有角色');
    this.statusPlayerIndex = (this.statusPlayerIndex + step + count) % count;
  }

  private get currentPlayer(): Player | null {
    return this.session.players[this.currentPlayerIndex] ?? null;
  }

  private get currentMonster(): Monster | null {
    return this.session.monsters[this.targetIndex] ?? null;
  }

  private get currentUiMonster(): Monster | null {
    return this.phase === 'selectTarget'
      ? this.ensureSelectedMonster() ? this.currentMonster : null
      : this.currentMonster;
  }

  private get currentTargetPlayer(): Player | null {
    return this.session.players[this.playerTargetIndex] ?? null;
  }

  private rememberPlayerAction(player: Player, action: CombatAction): void {
    this.lastPlayerActions.set(player.index, action);
    this.session.rememberPlayerAction(player.index, action);
  }

  private triggerRoundEventOnce(): void {
    if (this.session.isRandomFight || this.roundEventTriggered) return;
    this.roundEventTriggered = true;
    triggerRoundEvent(this.session, this.roundCount);
  }

  private setMessage(message: string, duration = MESSAGE_INTERVAL): void {
    this.message = message;
    this.messageElapsed = duration;
  }
}
