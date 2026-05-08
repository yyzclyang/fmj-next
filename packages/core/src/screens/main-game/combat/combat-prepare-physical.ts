import type { FightingCharacter, Monster, Player } from '@/characters';
import type { AttackAction, CombatAction, CoopAction } from '@/combat/combat-actions';
import { applyMagicAttack, applyAttackBuff, calcPhysicalDamage, isSleeping, spendMagicMp } from '@/combat/combat-effects';
import {
  CoopCombatAnimation,
  FleeCombatAnimation,
  PhysicalCombatAnimation,
  StaticCombatAnimation,
  type CombatActionAnimation,
} from './combat-animations';
import {
  type CombatPrepareContext,
  type PreparedCombatAction,
  noPreparedAction,
  preparedAction,
} from './combat-action-preparer-types';
import { createMissAnimation, getAnimationPoint, isMissed } from './combat-action-utils';
import { captureFighterStates, createRaiseAnimations } from './combat-post-action';
import { getFirstAliveMonster, getRandomAlivePlayer, isMonster } from './combat-targeting';

export function prepareDefendAction(ctx: CombatPrepareContext, action: CombatAction & { kind: 'defend' }): PreparedCombatAction {
  action.actor.fightingSprite!.currentFrame = 9;
  ctx.setMessage(`${action.actor.name}防御`);
  return preparedAction(action, new StaticCombatAnimation(ctx.actionInterval));
}

export function prepareFleeAction(ctx: CombatPrepareContext, action: CombatAction & { kind: 'flee' }): PreparedCombatAction {
  ctx.setMessage(`${action.actor.name}${action.succeed ? '逃跑成功' : '逃跑失败'}`);
  return preparedAction(action, new FleeCombatAnimation(action.actor, action.succeed));
}

export function prepareAttackAction(ctx: CombatPrepareContext, action: AttackAction): PreparedCombatAction {
  if (!action.target.isAlive && action.target !== action.actor) {
    const nextTarget = isMonster(action.target, ctx.session.monsters)
      ? getFirstAliveMonster(ctx.session.monsters)
      : getRandomAlivePlayer(ctx.session.players);
    if (!nextTarget) return noPreparedAction();
    action.target = nextTarget;
  }
  const before = captureFighterStates([action.target]);
  const missed = isMissed(ctx.game, action.actor, action.target, action.actor !== action.target);
  const damage = missed ? 0 : calcPhysicalDamage(action.actor, action.target, ctx.session.players.includes(action.target as Player));
  if (!missed) {
    action.target.hp = Math.max(0, action.target.hp - damage);
    applyAttackBuff(action.actor, action.target);
  }
  const animation = new PhysicalCombatAnimation({
    actor: action.actor,
    targets: [action.target],
    moveTo: action.target,
    raises: missed ? [createMissAnimation(ctx.game, action.target)] : createRaiseAnimations(ctx.game, before, [action.target]),
    targetIsPlayer: ctx.session.players.includes(action.target as Player),
  });
  ctx.setMessage(`${action.actor.name}攻击${action.target.name} ${missed ? 'Miss' : damage}`);
  return preparedAction(action, animation);
}

export function prepareAttackAllAction(ctx: CombatPrepareContext, action: CombatAction & { kind: 'attackAll' }): PreparedCombatAction {
  const targets = action.targets.filter(target => target.isAlive);
  if (targets.length === 0) return noPreparedAction();
  const before = captureFighterStates(targets);
  const misses: CombatActionAnimation[] = [];
  for (const target of targets) {
    if (isMissed(ctx.game, action.actor, target)) {
      misses.push(createMissAnimation(ctx.game, target));
      continue;
    }
    const damage = calcPhysicalDamage(action.actor, target, ctx.session.players.includes(target as Player));
    target.hp = Math.max(0, target.hp - damage);
    applyAttackBuff(action.actor, target);
  }
  const animation = new PhysicalCombatAnimation({
    actor: action.actor,
    targets,
    moveTo: { x: 44, y: 14 },
    raises: [...createRaiseAnimations(ctx.game, before, targets), ...misses],
    targetIsPlayer: ctx.session.players.includes(targets[0] as Player),
  });
  ctx.setMessage(`${action.actor.name}攻击全体`);
  return preparedAction(action, animation);
}

export function prepareCoopAction(ctx: CombatPrepareContext, action: CoopAction): PreparedCombatAction {
  const actors = action.actors.filter(actor => actor.isAlive && !isSleeping(actor));
  if (actors.length < 2) return noPreparedAction();
  const targets = action.targetAll ? ctx.session.monsters.filter(monster => monster.isAlive) : action.targets.filter(monster => monster.isAlive);
  if (targets.length === 0) return noPreparedAction();
  const before = captureFighterStates([...actors, ...targets]);
  const misses: CombatActionAnimation[] = [];
  if (action.magic) {
    for (const actor of actors) {
      if (!spendMagicMp(actor, action.magic)) {
        ctx.setMessage('真气不足');
        continue;
      }
      for (const target of targets) {
        if (isMissed(ctx.game, actor, target)) {
          misses.push(createMissAnimation(ctx.game, target));
          continue;
        }
        applyMagicAttack(actor, action.magic, target, ctx.game.engineOptions.magicDamageFormula);
      }
    }
    ctx.setMessage(`${actors[0]!.name}等施展${action.magic.magicName}`);
  } else {
    for (const actor of actors) {
      for (const target of targets) {
        if (isMissed(ctx.game, actor, target)) {
          misses.push(createMissAnimation(ctx.game, target));
          continue;
        }
        const damage = Math.trunc(calcPhysicalDamage(actor, target, false) * 1.6);
        target.hp = Math.max(0, target.hp - damage);
        applyAttackBuff(actor, target);
      }
    }
    ctx.setMessage(`${actors[0]!.name}等合击`);
  }
  return preparedAction(action, new CoopCombatAnimation({
    actors,
    targets,
    srs: action.magic?.magicAni ?? ctx.game.datLib.getSrs(2, 240),
    srsPoint: action.targetAll ? { x: 0, y: 0 } : getAnimationPoint(targets, false),
    raises: [...createRaiseAnimations(ctx.game, before, [...targets, ...actors]), ...misses],
  }));
}

export function prepareNopAction(ctx: CombatPrepareContext, actor: FightingCharacter): PreparedCombatAction {
  ctx.setMessage(`${actor.name}无法行动`);
  return preparedAction({ kind: 'nop', actor: actor as Player | Monster }, new StaticCombatAnimation(ctx.actionInterval));
}
