import type { Monster, Player } from '@/characters';
import {
  type CombatAction,
  type CombatMedicineGoods,
  type CombatThrowableGoods,
  type MonsterTargetMode,
  type PlayerTargetMode,
} from '@/combat/combat-actions';
import { GoodsMedicine, GoodsMedicineLife } from '@/goods';
import { getFirstTargetPlayerIndex } from './combat-targeting';

export type CombatGoodsActionSelection =
  | { readonly kind: 'action'; readonly action: CombatAction; readonly goodsToUse: CombatMedicineGoods | CombatThrowableGoods }
  | { readonly kind: 'monsterTarget'; readonly mode: MonsterTargetMode }
  | { readonly kind: 'playerTarget'; readonly mode: PlayerTargetMode; readonly targetIndex: number }
  | { readonly kind: 'none' };

export function createThrowGoodsSelection(
  player: Player,
  goods: CombatThrowableGoods,
  monsters: readonly Monster[]
): CombatGoodsActionSelection {
  if (goods.effectAll()) {
    return {
      kind: 'action',
      action: { kind: 'throwItem', actor: player, goods, targets: monsters.filter(monster => monster.isAlive), targetAll: true },
      goodsToUse: goods,
    };
  }
  return { kind: 'monsterTarget', mode: { kind: 'throwItem', goods } };
}

export function createUseGoodsSelection(
  player: Player,
  goods: CombatMedicineGoods,
  players: readonly Player[]
): CombatGoodsActionSelection {
  if (goods instanceof GoodsMedicine && goods.effectAll()) {
    return {
      kind: 'action',
      action: { kind: 'useItem', actor: player, goods, targets: players, targetAll: true },
      goodsToUse: goods,
    };
  }
  const allowDead = goods instanceof GoodsMedicineLife;
  const targetIndex = getFirstTargetPlayerIndex(players, allowDead);
  if (targetIndex < 0) return { kind: 'none' };
  return { kind: 'playerTarget', mode: { kind: 'useItem', goods, allowDead }, targetIndex };
}
