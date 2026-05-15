import type { MagicAttackAction, MagicHelpAction, SpecialMagicAction } from '@/combat/combat-actions';
import {
  captureCombatLogStates,
  logCombatAction,
  logCombatEffect,
  logCombatFighterEffects,
  logCombatMiss,
} from '@/combat/combat-log';
import { applyMagicAttack, applyMagicHelp, rollCombatRandom, spendMagicMp } from '@/combat/combat-effects';
import type { FightingCharacter, Player } from '@/characters';
import { MagicAuxiliary, MagicRestore } from '@/magic';
import type { CombatActionAnimation } from '../animations/animation-types';
import { CastCombatAnimation } from '../animations/cast-animation';
import {
  type CombatPrepareContext,
  type PreparedCombatAction,
  noPreparedAction,
  preparedAction,
} from './action-preparer-types';
import { createMissAnimation, getAnimationPoint, isMagicMissed, rollGuardedPlayerTarget } from '../flow/action-utils';
import { captureFighterStates, createRaiseAnimations } from '../flow/post-action';
import { prepareAttackAction, prepareAttackAllAction, prepareNopAction } from './prepare-physical';
import { canAttackAllTargets } from '../actions/attack-all';
import { getAliveReplacementTarget, getFirstAliveMonster } from '../actions/targeting';

export function prepareRolledBackMagicAction(
  ctx: CombatPrepareContext,
  action: MagicAttackAction | MagicHelpAction
): PreparedCombatAction {
  if (canAttackAllTargets(action.actor, ctx.session.players)) {
    const targets = getRollbackAttackAllTargets(ctx, action.actor);
    return targets.length > 0
      ? prepareAttackAllAction(ctx, { kind: 'attackAll', actor: action.actor, targets })
      : prepareNopAction(ctx, action.actor);
  }
  const target = getRollbackAttackTarget(ctx, action.actor);
  return target ? prepareAttackAction(ctx, { kind: 'attack', actor: action.actor, target }) : prepareNopAction(ctx, action.actor);
}

function getRollbackAttackAllTargets(
  ctx: CombatPrepareContext,
  actor: MagicAttackAction['actor']
): readonly FightingCharacter[] {
  return ctx.session.players.includes(actor as Player)
    ? ctx.session.monsters.filter(monster => monster.isAlive)
    : ctx.session.players.filter(player => player.isAlive);
}

function getRollbackAttackTarget(
  ctx: CombatPrepareContext,
  actor: MagicAttackAction['actor']
): FightingCharacter | null {
  if (ctx.session.players.includes(actor as Player)) return getFirstAliveMonster(ctx.session.monsters);
  return ctx.session.players.find(player => player.isAlive) ?? null;
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
  const logBefore = captureCombatLogStates([action.actor, ...finalTargets]);
  const misses: CombatActionAnimation[] = [];
  const missedTargets: Array<(typeof finalTargets)[number]> = [];
  const guardedTargets = new Set<FightingCharacter>();
  if (!spendMagicMp(action.actor, action.magic)) {
    ctx.setMessage('真气不足');
    logCombatAction(`${action.actor.name}施展${action.magic.name}失败: 真气不足`);
    return prepareRolledBackMagicAction(ctx, action);
  }

  for (const target of finalTargets) {
    const targetIsGuarded = rollGuardedPlayerTarget(ctx.session, action.actor, target);
    const randomRoll = rollCombatRandom();
    const missed = isMagicMissed(ctx.game, action.actor, target, true, randomRoll);
    if (missed && hasMagicDamageEffect(action.magic)) {
      misses.push(createMissAnimation(ctx.game, target));
      missedTargets.push(target);
    }
    if (targetIsGuarded) guardedTargets.add(target);
    applyMagicAttack(action.actor, action.magic, target, ctx.game.damageFormula, targetIsGuarded, randomRoll, missed);
  }
  const animation = new CastCombatAnimation({
    actor: action.actor,
    targets: finalTargets,
    srs: action.magic.animation,
    srsPoint: getAnimationPoint(finalTargets, action.targetAll),
    raiseAnimations: [...createRaiseAnimations(ctx.game, before, [...finalTargets, action.actor]), ...misses],
    hitTargets: true,
    guardedTargets,
  });
  const actionLabel = `${action.actor.name}施展${action.magic.name}`;
  logCombatAction(actionLabel);
  for (const target of missedTargets) logCombatMiss(action.actor, target, `施展${action.magic.name}攻击`);
  logCombatFighterEffects(actionLabel, logBefore, [action.actor, ...finalTargets]);
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
  const logBefore = captureCombatLogStates([action.actor, ...finalTargets]);
  if (!spendMagicMp(action.actor, action.magic)) {
    ctx.setMessage('真气不足');
    logCombatAction(`${action.actor.name}施展${action.magic.name}失败: 真气不足`);
    return prepareRolledBackMagicAction(ctx, action);
  }

  const before = captureFighterStates(finalTargets);
  for (const target of finalTargets) {
    applyMagicHelp(action.magic, target);
  }
  const hpDiffOverrides = createMagicHelpHpDiffOverrides(action, finalTargets);
  const animation = new CastCombatAnimation({
    actor: action.actor,
    targets: finalTargets,
    srs: action.magic.animation,
    srsPoint: getAnimationPoint(finalTargets, action.targetAll),
    raiseAnimations: createRaiseAnimations(ctx.game, before, finalTargets, hpDiffOverrides),
    hitTargets: false,
  });
  const actionLabel = `${action.actor.name}施展${action.magic.name}`;
  logCombatAction(actionLabel);
  logCombatFighterEffects(actionLabel, logBefore, [action.actor, ...finalTargets]);
  return preparedAction(action, animation);
}

export function prepareSpecialMagicAction(ctx: CombatPrepareContext, action: SpecialMagicAction): PreparedCombatAction {
  if (!action.target.isAlive) {
    const target = getFirstAliveMonster(ctx.session.monsters);
    if (!target) return noPreparedAction();
    action.target = target;
  }
  const steal = action.target.tryStealGoods();
  logCombatAction(`${action.actor.name}施展${action.magic.name}`);
  if (steal) {
    const goods = ctx.game.bag.addGoods(steal.type, steal.index, 1);
    if (!goods) throw new Error(`战斗偷取物品不存在: GRS ${steal.type}-${steal.index}`);
    ctx.setMessage(`获得${goods.name}`);
    logCombatEffect(`${action.actor.name}从${action.target.name}获得${goods.name}`);
  } else {
    logCombatEffect(`${action.actor.name}偷取${action.target.name}失败`);
  }
  return preparedAction(
    action,
    new CastCombatAnimation({
      actor: action.actor,
      targets: [action.target],
      srs: action.magic.animation,
      srsPoint: getAnimationPoint([action.target], false),
      raiseAnimations: [],
      hitTargets: false,
    })
  );
}

function hasMagicDamageEffect(magic: MagicAttackAction['magic']): boolean {
  return magic.hpEffect !== 0 || magic.mpEffect !== 0;
}

function createMagicHelpHpDiffOverrides(
  action: MagicHelpAction,
  targets: readonly FightingCharacter[]
): ReadonlyMap<FightingCharacter, number> | undefined {
  if (!(action.magic instanceof MagicRestore) || action.magic.hp <= 0) return undefined;
  const res = new Map<FightingCharacter, number>();
  for (const target of targets) res.set(target, action.magic.hp);
  return res;
}
