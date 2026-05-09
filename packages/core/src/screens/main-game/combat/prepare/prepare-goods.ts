import type { ThrowItemAction, UseItemAction } from '@/combat/combat-actions';
import { applyThrownGoods } from '@/combat/combat-effects';
import { GoodsMedicineLife } from '@/goods';
import { CastCombatAnimation } from '../animations';
import {
  type CombatPrepareContext,
  type PreparedCombatAction,
  noPreparedAction,
  preparedAction,
} from './action-preparer-types';
import { getGoodsAnimationPoint, getGoodsUseAnimation, restoreActionGoods } from '../flow/action-utils';
import { captureFighterStates, createRaiseAnimations } from '../flow/post-action';
import { getFirstAliveMonster, getRandomAlivePlayer } from '../actions/targeting';

export function prepareThrowItemAction(ctx: CombatPrepareContext, action: ThrowItemAction): PreparedCombatAction {
  const targets = action.targetAll ? ctx.session.monsters.filter(monster => monster.isAlive) : [...action.targets];
  const aliveTargets = targets.filter(monster => monster.isAlive);
  const replacement = getFirstAliveMonster(ctx.session.monsters);
  const finalTargets = aliveTargets.length > 0 ? aliveTargets : replacement ? [replacement] : [];
  if (finalTargets.length === 0) {
    restoreActionGoods(ctx.game, action);
    return noPreparedAction();
  }

  const before = captureFighterStates(finalTargets);
  for (const target of finalTargets) {
    applyThrownGoods(action.goods, target);
  }
  const animation = new CastCombatAnimation({
    actor: action.actor,
    targets: finalTargets,
    srs: action.goods.animation,
    srsPoint: getGoodsAnimationPoint(finalTargets, action.targetAll),
    raises: createRaiseAnimations(ctx.game, before, finalTargets),
    hitTargets: true,
  });
  ctx.setMessage(`${action.actor.name}投掷${action.goods.name}`);
  return preparedAction(action, animation);
}

export function prepareUseItemAction(ctx: CombatPrepareContext, action: UseItemAction): PreparedCombatAction {
  const targets = action.targetAll ? ctx.session.players : [...action.targets];
  let finalTargets = action.goods instanceof GoodsMedicineLife ? targets : targets.filter(player => player.isAlive);
  if (finalTargets.length === 0 && !(action.goods instanceof GoodsMedicineLife)) {
    const target = getRandomAlivePlayer(ctx.session.players);
    finalTargets = target ? [target] : [];
  }
  if (finalTargets.length === 0) {
    restoreActionGoods(ctx.game, action);
    return noPreparedAction();
  }

  const before = captureFighterStates(finalTargets);
  for (const target of finalTargets) {
    action.goods.eat(target);
  }
  const animation = new CastCombatAnimation({
    actor: action.actor,
    targets: finalTargets,
    srs: getGoodsUseAnimation(ctx.game, action.goods),
    srsPoint: getGoodsAnimationPoint(finalTargets, action.targetAll),
    raises: createRaiseAnimations(ctx.game, before, finalTargets),
    hitTargets: false,
  });
  ctx.setMessage(`${action.actor.name}使用${action.goods.name}`);
  return preparedAction(action, animation);
}
