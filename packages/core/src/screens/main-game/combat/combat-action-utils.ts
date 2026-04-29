import type { FightingCharacter } from '@/characters';
import type { CombatAction, CombatMedicineGoods } from '@/combat/combat-actions';
import { getComputedSpeed, randomMiss } from '@/combat/combat-effects';
import type { Game } from '@/game/game';
import type { BaseGoods } from '@/goods';
import { GoodsMedicine } from '@/goods';
import type { ResSrs } from '@/lib/res-srs';
import { MissCombatAnimation, type CombatActionAnimation, type CombatPoint } from './combat-animations';

// 动作工具只处理战斗执行阶段的通用细节，避免 ScreenCombat 同时承担背包和动画杂务。
export function getActionPriority(action: CombatAction): number {
  if (action.kind === 'flee') return getComputedSpeed(action.actor) * 100;
  if (action.kind === 'coop') return action.actor.defend;
  return getComputedSpeed(action.actor);
}

export function isMissed(game: Game, attacker: FightingCharacter, target: FightingCharacter, allowMiss = true): boolean {
  return randomMiss(attacker, target, game.state.allowFightMiss, allowMiss);
}

export function createMissAnimation(game: Game, fighter: FightingCharacter): CombatActionAnimation {
  const sprite = fighter.fightingSprite;
  if (!sprite) throw new Error(`战斗 Miss 动画缺少角色图: ${fighter.name}`);
  return new MissCombatAnimation(game, sprite.combatX, sprite.combatY - Math.trunc(sprite.height / 2));
}

export function getAnimationPoint(targets: readonly FightingCharacter[], _isAll: boolean): CombatPoint {
  const target = targets[0];
  const sprite = target?.fightingSprite;
  return sprite ? { x: sprite.combatX, y: sprite.combatY - Math.trunc(sprite.height / 2) } : { x: 0, y: 0 };
}

export function getGoodsUseAnimation(game: Game, goods: CombatMedicineGoods): ResSrs | null {
  return goods instanceof GoodsMedicine ? goods.animation : game.datLib.getSrs(2, 1);
}

export function useGoodsFromBag(game: Game, goods: BaseGoods): void {
  if (!game.bag.useGoodsNum(goods.type, goods.index, 1)) {
    throw new Error(`战斗使用道具时背包数量不足: GRS ${goods.type}-${goods.index}`);
  }
}

export function restoreActionGoods(game: Game, action: CombatAction): void {
  if (action.kind !== 'throwItem' && action.kind !== 'useItem') return;
  if (!game.bag.addGoods(action.goods.type, action.goods.index, 1)) {
    throw new Error(`战斗归还道具失败: GRS ${action.goods.type}-${action.goods.index}`);
  }
}

export function clearActionQueueAndRestoreItems(game: Game, actionQueue: CombatAction[]): void {
  for (const action of actionQueue) {
    restoreActionGoods(game, action);
  }
  actionQueue.length = 0;
}
