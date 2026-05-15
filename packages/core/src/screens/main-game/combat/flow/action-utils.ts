import type { FightingCharacter, Monster, Player } from '@/characters';
import type { CombatAction, CombatMedicineGoods } from '@/combat/combat-actions';
import {
  getComputedAgility,
  randomMagicMiss,
  randomPhysicalMiss,
  rollRandomPlayerGuard,
} from '@/combat/combat-effects';
import type { CombatSession } from '@/combat/combat-runtime';
import type { Game } from '@/game/game';
import type { BaseGoods } from '@/goods';
import { GoodsMedicine } from '@/goods';
import type { ResSrs } from '@/lib/res-srs';
import type { CombatActionAnimation, CombatPoint } from '../animations/animation-types';
import { MissCombatAnimation } from '../animations/raise-animations';

// 动作工具只处理战斗执行阶段的通用细节，避免 ScreenCombat 同时承担背包和动画杂务。
export function getActionPriority(action: CombatAction): number {
  if (action.kind === 'defend') return Number.MAX_SAFE_INTEGER;
  if (action.kind === 'flee') return getComputedAgility(action.actor) * 100;
  if (action.kind === 'coop') return action.actor.defense;
  return getComputedAgility(action.actor);
}

export function isPhysicalMissed(
  game: Game,
  attacker: FightingCharacter,
  target: FightingCharacter,
  allowMiss = true,
  randomRoll?: number
): boolean {
  return randomPhysicalMiss(attacker, target, game.state.allowFightMiss, allowMiss, randomRoll);
}

export function isMagicMissed(
  game: Game,
  attacker: FightingCharacter,
  target: FightingCharacter,
  allowMiss = true,
  randomRoll?: number
): boolean {
  return randomMagicMiss(attacker, target, game.state.allowFightMiss, allowMiss, randomRoll);
}

export function rollGuardedPlayerTarget(
  session: CombatSession,
  actor: FightingCharacter,
  target: FightingCharacter
): boolean {
  const player = target as Player;
  if (!session.players.includes(player)) return false;
  const defending = session.isPlayerDefending(player);
  return defending || (session.monsters.includes(actor as Monster) && rollRandomPlayerGuard(player, defending));
}

export function createMissAnimation(game: Game, fighter: FightingCharacter): CombatActionAnimation {
  const sprite = fighter.fightingSprite;
  if (!sprite) throw new Error(`战斗 Miss 动画缺少角色图: ${fighter.name}`);
  return new MissCombatAnimation(game, sprite.combatX, sprite.combatY);
}

export function getAnimationPoint(targets: readonly FightingCharacter[], _isAll: boolean): CombatPoint {
  const target = targets[0];
  const sprite = target?.fightingSprite;
  return sprite ? { x: sprite.combatX, y: sprite.combatY - Math.trunc(sprite.height / 2) } : { x: 0, y: 0 };
}

export function getGoodsAnimationPoint(targets: readonly FightingCharacter[], isAll: boolean): CombatPoint {
  const target = targets[0];
  const sprite = target?.fightingSprite;
  if (!sprite) return { x: 0, y: 0 };
  return { x: sprite.combatX, y: isAll ? sprite.combatY - Math.trunc(sprite.height / 2) : sprite.combatY };
}

export function getGoodsUseAnimation(game: Game, goods: CombatMedicineGoods): ResSrs | null {
  return goods instanceof GoodsMedicine ? goods.animation : game.datLib.getSrs(2, 1);
}

export function useGoodsFromBag(game: Game, goods: BaseGoods): void {
  if (!game.bag.consumeGoods(goods.type, goods.index, 1)) {
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
