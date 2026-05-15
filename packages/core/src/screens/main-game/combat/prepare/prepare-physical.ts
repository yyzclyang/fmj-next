import { PlayerFightingFrame, type FightingCharacter, type Monster, type Player } from '@/characters';
import type { AttackAction, CombatAction, CoopAction } from '@/combat/combat-actions';
import { captureCombatLogStates, logCombatAction, logCombatFighterEffects, logCombatMiss } from '@/combat/combat-log';
import {
  applyMagicAttack,
  applyOnHitStatuses,
  calcConfusionSelfDamage,
  calcPhysicalDamage,
  isSleeping,
  rollCombatRandom,
  spendMagicMp,
} from '@/combat/combat-effects';
import type { CombatActionAnimation } from '../animations/animation-types';
import { CoopCombatAnimation } from '../animations/coop-animation';
import { FleeCombatAnimation } from '../animations/flee-animation';
import { PhysicalCombatAnimation } from '../animations/physical-animation';
import { StaticCombatAnimation } from '../animations/raise-animations';
import {
  type CombatPrepareContext,
  type PreparedCombatAction,
  noPreparedAction,
  preparedAction,
} from './action-preparer-types';
import {
  createMissAnimation,
  getAnimationPoint,
  isMagicMissed,
  isPhysicalMissed,
  rollGuardedPlayerTarget,
} from '../flow/action-utils';
import { captureFighterStates, createRaiseAnimations } from '../flow/post-action';
import { getAliveReplacementMonster, getAliveReplacementPlayer, isMonster } from '../actions/targeting';

export function prepareDefendAction(
  ctx: CombatPrepareContext,
  action: CombatAction & { kind: 'defend' }
): PreparedCombatAction {
  action.actor.fightingSprite!.currentFrame = PlayerFightingFrame.Defend;
  logCombatAction(`${action.actor.name}防御`);
  return preparedAction(action, new StaticCombatAnimation(ctx.actionInterval));
}

export function prepareFleeAction(
  ctx: CombatPrepareContext,
  action: CombatAction & { kind: 'flee' }
): PreparedCombatAction {
  const succeed = ctx.session.isRandomFight && canPlayerFlee(action.actor, ctx.session.monsters[0] ?? null);
  const prepared = { ...action, succeed };
  logCombatAction(`${action.actor.name}${succeed ? '逃跑成功' : '逃跑失败'}`);
  return preparedAction(prepared, new FleeCombatAnimation(action.actor, succeed));
}

export function prepareAttackAction(ctx: CombatPrepareContext, action: AttackAction): PreparedCombatAction {
  if (!action.target.isAlive && action.target !== action.actor) {
    const nextTarget = isMonster(action.target, ctx.session.monsters)
      ? getAliveReplacementMonster(action.target, ctx.session.monsters)
      : getAliveReplacementPlayer(action.target as Player, ctx.session.players);
    if (!nextTarget) return noPreparedAction();
    action.target = nextTarget;
  }
  const before = captureFighterStates([action.target]);
  const logBefore = captureCombatLogStates([action.target]);
  const targetIsPlayer = ctx.session.players.includes(action.target as Player);
  const selfAttack = action.actor === action.target;
  const targetIsGuarded = selfAttack ? false : rollGuardedPlayerTarget(ctx.session, action.actor, action.target);
  const randomRoll = rollCombatRandom();
  const missed = selfAttack ? false : isPhysicalMissed(ctx.game, action.actor, action.target, true, randomRoll);
  const damage = missed
    ? 0
    : selfAttack
      ? calcConfusionSelfDamage(action.actor, randomRoll)
      : calcPhysicalDamage(
          action.actor,
          action.target,
          targetIsPlayer,
          ctx.game.damageFormula,
          targetIsGuarded,
          randomRoll
        );
  if (!missed) {
    action.target.hp = Math.max(0, action.target.hp - damage);
    if (!selfAttack) applyOnHitStatuses(action.actor, action.target);
  }
  const hpDiffOverrides = new Map<FightingCharacter, number>();
  if (selfAttack && damage > 0) hpDiffOverrides.set(action.target, -damage);
  const animation = new PhysicalCombatAnimation({
    actor: action.actor,
    targets: [action.target],
    moveTo: action.target,
    raiseAnimations: missed
      ? [createMissAnimation(ctx.game, action.target)]
      : createRaiseAnimations(ctx.game, before, [action.target], hpDiffOverrides),
    targetIsPlayer: ctx.session.players.includes(action.target as Player),
    guardedTargets: !missed && targetIsGuarded ? new Set([action.target]) : undefined,
  });
  logCombatAction(`${action.actor.name}攻击${action.target.name}`);
  if (missed) {
    logCombatMiss(action.actor, action.target);
  } else {
    logCombatFighterEffects(`${action.actor.name}攻击${action.target.name}`, logBefore, [action.target]);
  }
  return preparedAction(action, animation);
}

export function prepareAttackAllAction(
  ctx: CombatPrepareContext,
  action: CombatAction & { kind: 'attackAll' }
): PreparedCombatAction {
  const targets = action.targets.filter(target => target.isAlive);
  if (targets.length === 0) return noPreparedAction();
  const before = captureFighterStates(targets);
  const logBefore = captureCombatLogStates(targets);
  const misses: CombatActionAnimation[] = [];
  const missedTargets: FightingCharacter[] = [];
  const guardedTargets = new Set<FightingCharacter>();
  for (const target of targets) {
    const targetIsPlayer = ctx.session.players.includes(target as Player);
    const targetIsGuarded = rollGuardedPlayerTarget(ctx.session, action.actor, target);
    const randomRoll = rollCombatRandom();
    if (isPhysicalMissed(ctx.game, action.actor, target, true, randomRoll)) {
      misses.push(createMissAnimation(ctx.game, target));
      missedTargets.push(target);
      continue;
    }
    if (targetIsGuarded) guardedTargets.add(target);
    const damage = calcPhysicalDamage(
      action.actor,
      target,
      targetIsPlayer,
      ctx.game.damageFormula,
      targetIsGuarded,
      randomRoll
    );
    target.hp = Math.max(0, target.hp - damage);
    applyOnHitStatuses(action.actor, target);
  }
  const animation = new PhysicalCombatAnimation({
    actor: action.actor,
    targets,
    moveTo: { x: 44, y: 14 },
    raiseAnimations: [...createRaiseAnimations(ctx.game, before, targets), ...misses],
    targetIsPlayer: ctx.session.players.includes(targets[0] as Player),
    guardedTargets,
  });
  logCombatAction(`${action.actor.name}攻击全体`);
  for (const target of missedTargets) logCombatMiss(action.actor, target);
  logCombatFighterEffects(`${action.actor.name}攻击全体`, logBefore, targets);
  return preparedAction(action, animation);
}

export function prepareCoopAction(ctx: CombatPrepareContext, action: CoopAction): PreparedCombatAction {
  const actors = action.actors.filter(actor => actor.isAlive && !isSleeping(actor));
  if (actors.length < 2) return noPreparedAction();
  const targets = action.targetAll
    ? ctx.session.monsters.filter(monster => monster.isAlive)
    : action.targets.filter(monster => monster.isAlive);
  if (targets.length === 0) return noPreparedAction();
  const before = captureFighterStates([...actors, ...targets]);
  const effectFighters = [...targets, ...actors];
  const logBefore = captureCombatLogStates(effectFighters);
  const misses: CombatActionAnimation[] = [];
  const missedPairs: Array<{ actor: FightingCharacter; target: FightingCharacter }> = [];
  const actionLabel = action.magic ? `${actors[0]!.name}等施展${action.magic.name}` : `${actors[0]!.name}等合击`;
  if (action.magic) {
    for (const actor of actors) {
      if (!spendMagicMp(actor, action.magic)) {
        ctx.setMessage('真气不足');
        logCombatAction(`${actor.name}施展${action.magic.name}失败: 真气不足`);
        continue;
      }
      for (const target of targets) {
        const randomRoll = rollCombatRandom();
        const missed = isMagicMissed(ctx.game, actor, target, true, randomRoll);
        if (missed && (action.magic.hpEffect !== 0 || action.magic.mpEffect !== 0)) {
          misses.push(createMissAnimation(ctx.game, target));
          missedPairs.push({ actor, target });
        }
        applyMagicAttack(actor, action.magic, target, ctx.game.damageFormula, false, randomRoll, missed);
      }
    }
  } else {
    for (const actor of actors) {
      for (const target of targets) {
        const randomRoll = rollCombatRandom();
        if (isPhysicalMissed(ctx.game, actor, target, true, randomRoll)) {
          misses.push(createMissAnimation(ctx.game, target));
          missedPairs.push({ actor, target });
          continue;
        }
        const damage = Math.trunc(
          calcPhysicalDamage(actor, target, false, ctx.game.damageFormula, false, randomRoll) * 1.6
        );
        target.hp = Math.max(0, target.hp - damage);
        applyOnHitStatuses(actor, target);
      }
    }
  }
  logCombatAction(actionLabel);
  for (const item of missedPairs)
    logCombatMiss(item.actor, item.target, action.magic ? `施展${action.magic.name}攻击` : '合击');
  logCombatFighterEffects(actionLabel, logBefore, effectFighters);
  return preparedAction(
    action,
    new CoopCombatAnimation({
      actors,
      targets,
      srs: action.magic?.animation ?? ctx.game.datLib.getSrs(2, 240),
      srsPoint: action.targetAll ? { x: 0, y: 0 } : getAnimationPoint(targets, false),
      raiseAnimations: [...createRaiseAnimations(ctx.game, before, [...targets, ...actors]), ...misses],
    })
  );
}

export function prepareNopAction(ctx: CombatPrepareContext, actor: FightingCharacter): PreparedCombatAction {
  logCombatAction(`${actor.name}无法行动`);
  return preparedAction(
    { kind: 'nop', actor: actor as Player | Monster },
    new StaticCombatAnimation(ctx.actionInterval)
  );
}

function canPlayerFlee(player: Player, firstMonster: Monster | null): boolean {
  const roll = rollCombatRandom();
  const playerLuck = roll % (Math.max(0, player.luck) + 1);
  const playerAgility = roll % (Math.max(0, player.agility) + 1);
  const monsterLuck = firstMonster?.isAlive ? roll % (Math.max(0, firstMonster.luck) + 1) : 0;
  const monsterAgility = firstMonster?.isAlive ? roll % (Math.max(0, firstMonster.agility) + 1) : 0;
  return playerLuck + playerAgility > monsterLuck + monsterAgility;
}
