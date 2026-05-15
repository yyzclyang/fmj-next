import type { CombatAction } from '@/combat/combat-actions';
import type { CombatFinishResult, CombatSession } from '@/combat/combat-runtime';
import { isConfusing, isSleeping } from '@/combat/combat-effects';
import { Player } from '@/characters';
import type { Game } from '@/game/game';
import { createLogger } from '@/utils/logger';
import type { CombatActionAnimation } from '../animations/animation-types';
import { setPlayerFrameByState } from '../animations/animation-sprite';
import { clearActionQueueAndRestoreItems, getActionPriority, restoreActionGoods } from './action-utils';
import { type CombatActionPreparer, type PreparedCombatAction } from '../prepare/action-preparer';
import { applyPreActionState, finishActionState, resetFighterFrames as resetCombatFighterFrames } from './post-action';
import { hasAlivePlayers, isAllMonsterDead } from '../actions/targeting';

const logger = createLogger('战斗');

export type CombatActionQueueResult =
  | { readonly kind: 'running' }
  | { readonly kind: 'finishRound' }
  | { readonly kind: 'startSuccess' }
  | { readonly kind: 'finish'; readonly result: CombatFinishResult };

interface CombatActionQueueOptions {
  readonly game: Game;
  readonly session: CombatSession;
  readonly actionPreparer: CombatActionPreparer;
  readonly actionInterval: number;
}

// 动作队列负责一轮战斗的执行推进，ScreenCombat 只根据返回结果切换阶段。
export class CombatActionQueue {
  private readonly queue: CombatAction[] = [];
  private currentAction: CombatAction | null = null;
  private animation: CombatActionAnimation | null = null;
  private pendingPreAction: CombatAction | null = null;
  private pendingActionResult: CombatFinishResult | null | undefined;
  private actionElapsed = 0;

  constructor(private readonly options: CombatActionQueueOptions) {}

  get length(): number {
    return this.queue.length;
  }

  get currentAnimation(): CombatActionAnimation | null {
    return this.animation;
  }

  push(action: CombatAction): void {
    this.queue.push(action);
  }

  popAndRestore(): CombatAction {
    const action = this.queue.pop();
    if (!action) throw new Error('取消角色行动时没有可撤销的动作');
    restoreActionGoods(this.game, action);
    if (action.kind === 'defend' && action.actor instanceof Player) setPlayerFrameByState(action.actor);
    logger.log('队列', `撤销 ${describeAction(action)}`);
    return action;
  }

  clear(): void {
    this.queue.length = 0;
    this.pendingPreAction = null;
    this.session.clearDefendingPlayers();
    resetCombatFighterFrames(this.session.players, this.session.monsters);
  }

  clearAndRestoreItems(): void {
    if (this.queue.length > 0) logger.log('队列', `清空并归还道具 数量=${this.queue.length}`);
    clearActionQueueAndRestoreItems(this.game, this.queue);
    this.session.clearDefendingPlayers();
    resetCombatFighterFrames(this.session.players, this.session.monsters);
  }

  startPerforming(): void {
    this.session.clearDefendingPlayers();
    this.registerDefendingPlayers();
    this.resetFighterFrames();
    const playerActionCount = this.queue.length;
    const monsterActionCount = this.appendMonsterActions();
    this.queue.sort((a, b) => getActionPriority(b) - getActionPriority(a));
    this.currentAction = null;
    this.animation = null;
    this.pendingPreAction = null;
    this.actionElapsed = 0;
    logger.log(
      '队列',
      `回合开始 玩家动作=${playerActionCount}, 怪物动作=${monsterActionCount}, 总数=${this.queue.length}`
    );
    logger.log('队列', `行动顺序=${this.queue.map(describeAction).join(' -> ') || '空'}`);
  }

  update(delta: number): CombatActionQueueResult {
    if (this.pendingActionResult !== undefined) {
      if (this.animation?.update(delta)) return { kind: 'running' };
      const result = this.pendingActionResult;
      this.pendingActionResult = undefined;
      this.animation = null;
      this.actionElapsed = 0;
      this.resetFighterFrames();
      return this.completePendingAction(result);
    }

    if (this.pendingPreAction) {
      if (this.animation?.update(delta)) return { kind: 'running' };
      const action = this.pendingPreAction;
      this.pendingPreAction = null;
      this.animation = null;
      this.actionElapsed = 0;
      this.resetFighterFrames();
      this.applyPreparedAction(this.options.actionPreparer.prepare(action));
    }

    while (!this.currentAction) {
      const next = this.queue.shift();
      if (!next) {
        this.session.clearDefendingPlayers();
        resetCombatFighterFrames(this.session.players, this.session.monsters);
        logger.log('队列', '回合动作执行完毕');
        return { kind: 'finishRound' };
      }
      const preAnimation = applyPreActionState(this.game, next);
      if (preAnimation) {
        this.pendingPreAction = next;
        this.animation = preAnimation;
        return { kind: 'running' };
      }
      const prepared = this.options.actionPreparer.prepare(next);
      this.applyPreparedAction(prepared);
    }

    if (this.animation) {
      if (this.animation.update(delta)) return { kind: 'running' };
    } else {
      this.actionElapsed += delta;
      if (this.actionElapsed < this.options.actionInterval) return { kind: 'running' };
    }

    const action = this.currentAction;
    if (!action) throw new Error('战斗动作队列执行状态异常');
    const result = this.getActionResult(action);
    if (result === 'flee' || this.isCombatResolved()) {
      this.currentAction = null;
      this.animation = null;
      this.actionElapsed = 0;
      this.resetFighterFrames();
      return this.completePendingAction(result);
    }
    const postAnimation = finishActionState(this.game, action);
    this.currentAction = null;
    this.actionElapsed = 0;
    this.resetFighterFrames();
    if (postAnimation) {
      this.animation = postAnimation;
      this.pendingActionResult = result;
      return { kind: 'running' };
    }
    this.animation = null;
    return this.completePendingAction(result);
  }

  private applyPreparedAction(prepared: PreparedCombatAction): void {
    this.animation = prepared.animation;
    this.currentAction = prepared.action;
  }

  private appendMonsterActions(): number {
    let count = 0;
    for (const monster of this.session.monsters) {
      if (!monster.isAlive) continue;
      this.queue.push({ kind: 'monsterAuto', actor: monster });
      count += 1;
    }
    return count;
  }

  private registerDefendingPlayers(): void {
    for (const action of this.queue) {
      if (action.kind !== 'defend') continue;
      if (!action.actor.isAlive || isSleeping(action.actor) || isConfusing(action.actor)) continue;
      this.session.setPlayerDefending(action.actor);
    }
  }

  private resetFighterFrames(): void {
    resetCombatFighterFrames(this.session.players, this.session.monsters, player =>
      this.session.isPlayerDefending(player)
    );
  }

  private completePendingAction(result: CombatFinishResult | null): CombatActionQueueResult {
    if (result) {
      logger.log('队列', `战斗结束 ${result}`);
      this.clearAndRestoreItems();
      return { kind: 'finish', result };
    }
    if (isAllMonsterDead(this.session.monsters)) {
      logger.log('队列', '怪物全灭，进入胜利结算');
      this.clearAndRestoreItems();
      return { kind: 'startSuccess' };
    }
    if (!hasAlivePlayers(this.session.players)) {
      logger.log('队列', '队伍全灭');
      this.clearAndRestoreItems();
      return { kind: 'finish', result: 'loss' };
    }
    return { kind: 'running' };
  }

  private isCombatResolved(): boolean {
    return isAllMonsterDead(this.session.monsters) || !hasAlivePlayers(this.session.players);
  }

  private getActionResult(action: CombatAction): CombatFinishResult | null {
    if (action.kind === 'flee' && action.succeed) return 'flee';
    return null;
  }

  private get game(): Game {
    return this.options.game;
  }

  private get session(): CombatSession {
    return this.options.session;
  }
}

function describeAction(action: CombatAction): string {
  const actorName = action.actor.name;
  switch (action.kind) {
    case 'attack':
      return `${actorName} 普攻 ${action.target.name}`;
    case 'attackAll':
      return `${actorName} 群攻 ${formatNames(action.targets)}`;
    case 'defend':
      return `${actorName} 防御`;
    case 'flee':
      return `${actorName} 逃跑 ${formatFleeResult(action.succeed)}`;
    case 'throwItem':
      return `${actorName} 投掷 ${action.goods.name} -> ${formatNames(action.targets)}`;
    case 'useItem':
      return `${actorName} 使用 ${action.goods.name} -> ${formatNames(action.targets)}`;
    case 'magicAttack':
      return `${actorName} 攻击法术 ${action.magic.name} -> ${formatNames(action.targets)}`;
    case 'magicHelp':
      return `${actorName} 辅助法术 ${action.magic.name} -> ${formatNames(action.targets)}`;
    case 'specialMagic':
      return `${actorName} 特殊法术 ${action.magic.name} -> ${action.target.name}`;
    case 'monsterAuto':
      return `${actorName} 自动行动`;
    case 'coop':
      return `${actorName} 合体 ${action.magic?.name ?? '无'} -> ${formatNames(action.targets)}`;
    case 'nop':
      return `${actorName} 空动作`;
  }
}

function formatNames(items: readonly { name: string }[]): string {
  return items.map(item => item.name).join(',');
}

function formatFleeResult(succeed: boolean | undefined): string {
  if (succeed === true) return '成功';
  if (succeed === false) return '失败';
  return '待定';
}
