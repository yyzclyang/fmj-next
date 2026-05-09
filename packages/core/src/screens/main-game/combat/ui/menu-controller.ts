import type { Player } from '@/characters';
import type { ActionIconIndex, CombatPhase, MonsterTargetMode } from '@/combat/combat-actions';
import type { CombatGoodsMenu } from './goods-menu';
import {
  selectActionIcon,
  selectCombatGoodsMenuItem,
  selectMiscMenuItem,
} from './menu-selection';

interface CombatMenuControllerOptions {
  readonly getCurrentPlayer: () => Player | null;
  readonly getCurrentPlayerIndex: () => number;
  readonly ensureSelectedMonster: () => boolean;
  readonly setPhase: (phase: CombatPhase) => void;
  readonly setMiscIndex: (index: number) => void;
  readonly setCombatGoodsIndex: (index: number) => void;
  readonly setStatusPlayerIndex: (index: number) => void;
  readonly setMonsterTargetMode: (mode: MonsterTargetMode) => void;
  readonly openMagicMenu: () => void;
  readonly startCoopTargetSelect: () => void;
  readonly startAutoAttack: () => void;
  readonly confirmDefend: () => void;
  readonly confirmFlee: () => void;
  readonly goodsMenu: CombatGoodsMenu;
}

// 菜单控制器负责把菜单索引的选择结果落到 screen 状态和子菜单打开动作上。
export class CombatMenuController {
  constructor(private readonly options: CombatMenuControllerOptions) {}

  confirmActionIcon(index: ActionIconIndex): void {
    const selection = selectActionIcon(index, this.options.getCurrentPlayer());
    if (selection.kind === 'target') {
      if (this.options.ensureSelectedMonster()) {
        this.options.setMonsterTargetMode(selection.mode);
        this.options.setPhase('selectTarget');
      }
      return;
    }
    if (selection.kind === 'magic') {
      this.options.openMagicMenu();
      return;
    }
    if (selection.kind === 'miscMenu') {
      this.options.setPhase('miscMenu');
      this.options.setMiscIndex(0);
      return;
    }
    if (selection.kind === 'coopTarget') {
      this.options.startCoopTargetSelect();
    }
  }

  confirmMiscItem(index: number): void {
    const selection = selectMiscMenuItem(index);
    if (selection === 'autoAttack') {
      this.options.startAutoAttack();
      return;
    }
    if (selection === 'goodsMenu') {
      this.options.setPhase('goodsMenu');
      this.options.setCombatGoodsIndex(0);
      return;
    }
    if (selection === 'defend') {
      this.options.confirmDefend();
      return;
    }
    if (selection === 'flee') {
      this.options.confirmFlee();
      return;
    }
    if (selection === 'statusMenu') {
      this.options.setStatusPlayerIndex(Math.max(0, this.options.getCurrentPlayerIndex()));
      this.options.setPhase('statusMenu');
    }
  }

  confirmCombatGoodsMenuItem(index: number): void {
    const selection = selectCombatGoodsMenuItem(index);
    if (selection === 'equipment') {
      this.options.goodsMenu.openEquipmentList();
      return;
    }
    if (selection === 'throw') {
      this.options.goodsMenu.openGoodsList('throw');
      return;
    }
    if (selection === 'use') {
      this.options.goodsMenu.openGoodsList('use');
    }
  }
}
