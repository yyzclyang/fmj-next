import type { MagicAttackAction, MagicHelpAction, SpecialMagicAction } from '@/combat/combat-actions';
import { applyMagicAttack, applyMagicHelp, spendMagicMp } from '@/combat/combat-effects';
import type { Player } from '@/characters';
import { MagicAuxiliary } from '@/magic';
import { CastCombatAnimation, StaticCombatAnimation, type CombatActionAnimation } from './combat-animations';
import {
  type CombatPrepareContext,
  type PreparedCombatAction,
  noPreparedAction,
  preparedAction,
} from './combat-action-preparer-types';
import { createMissAnimation, getAnimationPoint, isMissed } from './combat-action-utils';
import { captureFighterStates, createRaiseAnimations } from './combat-post-action';
import { prepareAttackAction, prepareNopAction } from './combat-prepare-physical';
import { getAliveReplacementTarget, getFirstAliveMonster } from './combat-targeting';

export function prepareRolledBackMagicAction(
  ctx: CombatPrepareContext,
  action: MagicAttackAction | MagicHelpAction
): PreparedCombatAction {
  if (action.kind === 'magicAttack') {
    const targets = action.targets.filter(target => target.isAlive);
    if (targets.length > 0) return prepareAttackAction(ctx, { kind: 'attack', actor: action.actor, target: targets[0]! });
  }
  const target = ctx.session.players.includes(action.actor as Player)
    ? getFirstAliveMonster(ctx.session.monsters)
    : ctx.session.players.find(player => player.isAlive) ?? null;
  return target ? prepareAttackAction(ctx, { kind: 'attack', actor: action.actor, target }) : prepareNopAction(ctx, action.actor);
}

export function prepareMagicAttackAction(ctx: CombatPrepareContext, action: MagicAttackAction): PreparedCombatAction {
  const targets = [...action.targets];
  const aliveTargets = targets.filter(target => target.isAlive);
  let finalTargets = aliveTargets;
  if (!action.targetAll && finalTargets.length === 0) {
    const target = targets[0];
    const replacement = target ? getAliveReplacementTarget(target, ctx.session.monsters, ctx.session.players) : null;
    finalTargets = replacement ? [replacement] : [];
  }
  if (finalTargets.length === 0) return noPreparedAction();
  const before = captureFighterStates([action.actor, ...finalTargets]);
  const misses: CombatActionAnimation[] = [];
  const singleMissed = !action.targetAll && finalTargets.length === 1 && isMissed(ctx.game, action.actor, finalTargets[0]!);
  if (!singleMissed && !spendMagicMp(action.actor, action.magic)) {
    ctx.setMessage('真气不足');
    return preparedAction(action, new StaticCombatAnimation(ctx.actionInterval));
  }

  for (const target of finalTargets) {
    if (singleMissed || (action.targetAll && isMissed(ctx.game, action.actor, target))) {
      misses.push(createMissAnimation(ctx.game, target));
      continue;
    }
    applyMagicAttack(action.actor, action.magic, target, ctx.game.profile.compat?.magicDamageFormula);
  }
  const animation = new CastCombatAnimation({
    actor: action.actor,
    targets: finalTargets,
    srs: action.magic.magicAni,
    srsPoint: getAnimationPoint(finalTargets, action.targetAll),
    raises: [...createRaiseAnimations(ctx.game, before, [...finalTargets, action.actor]), ...misses],
    hitTargets: true,
  });
  ctx.setMessage(`${action.actor.name}施展${action.magic.magicName}`);
  return preparedAction(action, animation);
}

export function prepareMagicHelpAction(ctx: CombatPrepareContext, action: MagicHelpAction): PreparedCombatAction {
  const targets = [...action.targets];
  let finalTargets = action.magic instanceof MagicAuxiliary ? targets : targets.filter(target => target.isAlive);
  if (!action.targetAll && finalTargets.length === 0) {
    const target = targets[0];
    const replacement = target ? getAliveReplacementTarget(target, ctx.session.monsters, ctx.session.players) : null;
    finalTargets = replacement ? [replacement] : [];
  }
  if (finalTargets.length === 0) return noPreparedAction();
  if (!spendMagicMp(action.actor, action.magic)) {
    ctx.setMessage('真气不足');
    return preparedAction(action, new StaticCombatAnimation(ctx.actionInterval));
  }

  const before = captureFighterStates(finalTargets);
  for (const target of finalTargets) {
    applyMagicHelp(action.magic, target);
  }
  const animation = new CastCombatAnimation({
    actor: action.actor,
    targets: finalTargets,
    srs: action.magic.magicAni,
    srsPoint: getAnimationPoint(finalTargets, action.targetAll),
    raises: createRaiseAnimations(ctx.game, before, finalTargets),
    hitTargets: false,
  });
  ctx.setMessage(`${action.actor.name}施展${action.magic.magicName}`);
  return preparedAction(action, animation);
}

export function prepareSpecialMagicAction(ctx: CombatPrepareContext, action: SpecialMagicAction): PreparedCombatAction {
  if (!action.target.isAlive) {
    const target = getFirstAliveMonster(ctx.session.monsters);
    if (!target) return noPreparedAction();
    action.target = target;
  }
  const steal = action.target.tryStealGoods();
  if (steal) {
    const goods = ctx.game.bag.addGoods(steal.type, steal.index, 1);
    if (!goods) throw new Error(`战斗偷取物品不存在: GRS ${steal.type}-${steal.index}`);
    ctx.setMessage(`获得${goods.name}`);
  } else {
    ctx.setMessage(`${action.actor.name}施展${action.magic.magicName}`);
  }
  return preparedAction(action, new CastCombatAnimation({
    actor: action.actor,
    targets: [action.target],
    srs: action.magic.magicAni,
    srsPoint: getAnimationPoint([action.target], false),
    raises: [],
    hitTargets: false,
  }));
}
