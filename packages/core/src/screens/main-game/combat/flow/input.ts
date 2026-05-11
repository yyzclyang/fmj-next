import type { Player, Monster } from '@/characters';
import type { ActionIconIndex, CombatPhase, PlayerTargetMode } from '@/combat/combat-actions';
import { isSealed } from '@/combat/combat-effects';
import { KeyCode } from '@/shared/key-code';
import { moveSelectionWrap } from '@/screens/main-game/menu/menu-select';
import { selectAliveMonsterIndex, selectTargetPlayerIndex } from '../actions/targeting';
import { COMBAT_GOODS_ITEMS, MISC_ITEMS } from '../ui/menu-items';

interface CombatInputHandlerOptions {
  readonly getPhase: () => CombatPhase;
  readonly setPhase: (phase: CombatPhase) => void;
  readonly getCurrentPlayer: () => Player | null;
  readonly getPlayerTargetMode: () => PlayerTargetMode | null;
  readonly clearPlayerTargetMode: () => void;
  readonly getMonsters: () => readonly Monster[];
  readonly getPlayers: () => readonly Player[];
  readonly getTargetIndex: () => number;
  readonly setTargetIndex: (index: number) => void;
  readonly getPlayerTargetIndex: () => number;
  readonly setPlayerTargetIndex: (index: number) => void;
  readonly getMiscIndex: () => number;
  readonly setMiscIndex: (index: number) => void;
  readonly getCombatGoodsIndex: () => number;
  readonly setCombatGoodsIndex: (index: number) => void;
  readonly setActionIconIndex: (index: ActionIconIndex) => void;
  readonly confirmActionIcon: () => void;
  readonly repeatLastActions: () => void;
  readonly cancelPlayerAction: () => void;
  readonly confirmMonsterTarget: () => void;
  readonly confirmPlayerTarget: () => void;
  readonly confirmMiscItem: () => void;
  readonly confirmCombatGoodsMenuItem: () => void;
  readonly selectStatusPlayer: (step: 1 | -1) => void;
}

// 输入处理器只把按键翻译成战斗意图，具体动作由 ScreenCombat 的回调完成。
export class CombatInputHandler {
  constructor(private readonly options: CombatInputHandlerOptions) {}

  onKey(key: KeyCode): void {
    const phase = this.options.getPhase();
    if (phase === 'selectTarget') {
      this.onTargetKey(key);
      return;
    }
    if (phase === 'selectPlayerTarget') {
      this.onPlayerTargetKey(key);
      return;
    }
    if (phase === 'miscMenu') {
      this.onMiscKey(key);
      return;
    }
    if (phase === 'goodsMenu') {
      this.onGoodsKey(key);
      return;
    }
    if (phase === 'statusMenu') {
      this.onStatusKey(key);
      return;
    }
    this.onActionKey(key);
  }

  private onActionKey(key: KeyCode): void {
    switch (key) {
      case KeyCode.Up:
        this.options.setActionIconIndex(1);
        return;
      case KeyCode.Left:
        if (this.currentPlayerSealed()) return;
        this.options.setActionIconIndex(2);
        return;
      case KeyCode.Down:
        this.options.setActionIconIndex(3);
        return;
      case KeyCode.Right:
        this.options.setActionIconIndex(4);
        return;
      case KeyCode.Enter:
        this.options.confirmActionIcon();
        return;
      case KeyCode.Repeat:
        this.options.repeatLastActions();
        return;
      case KeyCode.Cancel:
        this.options.cancelPlayerAction();
        return;
    }
  }

  private onTargetKey(key: KeyCode): void {
    switch (key) {
      case KeyCode.Left:
        this.options.setTargetIndex(
          selectAliveMonsterIndex(this.options.getMonsters(), this.options.getTargetIndex(), -1)
        );
        return;
      case KeyCode.Right:
        this.options.setTargetIndex(
          selectAliveMonsterIndex(this.options.getMonsters(), this.options.getTargetIndex(), 1)
        );
        return;
      case KeyCode.Enter:
        this.options.confirmMonsterTarget();
        return;
      case KeyCode.Cancel:
        this.options.setPhase('selectAction');
        return;
    }
  }

  private onMiscKey(key: KeyCode): void {
    switch (key) {
      case KeyCode.Up:
        this.options.setMiscIndex((this.options.getMiscIndex() + MISC_ITEMS.length - 1) % MISC_ITEMS.length);
        return;
      case KeyCode.Down:
        this.options.setMiscIndex((this.options.getMiscIndex() + 1) % MISC_ITEMS.length);
        return;
      case KeyCode.Enter:
        this.options.confirmMiscItem();
        return;
      case KeyCode.Cancel:
        this.options.setPhase('selectAction');
        return;
    }
  }

  private onPlayerTargetKey(key: KeyCode): void {
    switch (key) {
      case KeyCode.Left:
        this.selectPlayerTarget(-1);
        return;
      case KeyCode.Right:
        this.selectPlayerTarget(1);
        return;
      case KeyCode.Enter:
        this.options.confirmPlayerTarget();
        return;
      case KeyCode.Cancel:
        this.options.setPhase('selectAction');
        this.options.clearPlayerTargetMode();
        return;
    }
  }

  private onGoodsKey(key: KeyCode): void {
    switch (key) {
      case KeyCode.Up:
        this.options.setCombatGoodsIndex(
          moveSelectionWrap(this.options.getCombatGoodsIndex(), -1, COMBAT_GOODS_ITEMS.length)
        );
        return;
      case KeyCode.Down:
        this.options.setCombatGoodsIndex(
          moveSelectionWrap(this.options.getCombatGoodsIndex(), 1, COMBAT_GOODS_ITEMS.length)
        );
        return;
      case KeyCode.Enter:
        this.options.confirmCombatGoodsMenuItem();
        return;
      case KeyCode.Cancel:
        this.options.setPhase('miscMenu');
        return;
    }
  }

  private onStatusKey(key: KeyCode): void {
    switch (key) {
      case KeyCode.Right:
      case KeyCode.Down:
      case KeyCode.PageDown:
      case KeyCode.Enter:
        this.options.selectStatusPlayer(1);
        return;
      case KeyCode.Left:
      case KeyCode.Up:
      case KeyCode.PageUp:
        this.options.selectStatusPlayer(-1);
        return;
      case KeyCode.Cancel:
        this.options.setPhase('miscMenu');
        return;
    }
  }

  private selectPlayerTarget(step: 1 | -1): void {
    const mode = this.options.getPlayerTargetMode();
    if (!mode) throw new Error('选择玩家目标时没有目标模式');
    this.options.setPlayerTargetIndex(
      selectTargetPlayerIndex(this.options.getPlayers(), this.options.getPlayerTargetIndex(), mode.allowDead, step)
    );
  }

  private currentPlayerSealed(): boolean {
    const player = this.options.getCurrentPlayer();
    return !!player && isSealed(player);
  }
}
