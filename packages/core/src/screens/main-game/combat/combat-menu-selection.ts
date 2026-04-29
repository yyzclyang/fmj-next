import type { Player } from '@/characters';
import { isSealed } from '@/combat/combat-effects';
import type { ActionIconIndex, MonsterTargetMode } from '@/combat/combat-actions';
import {
  COMBAT_GOODS_MENU_ITEMS,
  MISC_MENU_ITEMS,
  type CombatGoodsMenuSelection,
  type MiscMenuSelection,
} from './combat-menu-items';

export type ActionIconSelection =
  | { readonly kind: 'target'; readonly mode: MonsterTargetMode }
  | { readonly kind: 'magic' }
  | { readonly kind: 'miscMenu' }
  | { readonly kind: 'coopTarget' }
  | { readonly kind: 'none' };

// 菜单选择函数只把索引翻译成意图，不直接修改 screen 状态。
export function selectActionIcon(index: ActionIconIndex, currentPlayer: Player | null): ActionIconSelection {
  switch (index) {
    case 1:
      return { kind: 'target', mode: { kind: 'attack' } };
    case 2:
      return currentPlayer && isSealed(currentPlayer) ? { kind: 'none' } : { kind: 'magic' };
    case 3:
      return { kind: 'miscMenu' };
    case 4:
      return { kind: 'coopTarget' };
  }
}

export function selectMiscMenuItem(index: number): MiscMenuSelection {
  return MISC_MENU_ITEMS[index]?.selection ?? 'none';
}

export function selectCombatGoodsMenuItem(index: number): CombatGoodsMenuSelection {
  return COMBAT_GOODS_MENU_ITEMS[index]?.selection ?? 'none';
}
