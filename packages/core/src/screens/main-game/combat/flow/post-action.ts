import { MonsterFightingFrame, Player, PlayerFightingFrame, type FightingCharacter, type Monster } from '@/characters';
import type { CombatAction } from '@/combat/combat-actions';
import { captureCombatLogStates, logCombatFighterEffects } from '@/combat/combat-log';
import { applyPoisonPostEffect, decayFighterStatuses } from '@/combat/combat-effects';
import type { Game } from '@/game/game';
import type { CombatActionAnimation } from '../animations/animation-types';
import { setPlayerFrameByState } from '../animations/animation-sprite';
import { RaiseCombatAnimation, RaiseGroupCombatAnimation } from '../animations/raise-animations';

interface FighterStateSnapshot {
  readonly hp: number;
  readonly mp: number;
  readonly statuses: readonly { readonly value: number; readonly round: number }[];
}

export function captureFighterStates(
  fighters: readonly FightingCharacter[]
): Map<FightingCharacter, FighterStateSnapshot> {
  const res = new Map<FightingCharacter, FighterStateSnapshot>();
  for (const fighter of fighters) {
    if (res.has(fighter)) continue;
    res.set(fighter, {
      hp: fighter.hp,
      mp: fighter.mp,
      statuses: fighter.activeStatuses.slots.map(status => ({ value: status.value, round: status.round })),
    });
  }
  return res;
}

export function createRaiseAnimations(
  game: Game,
  before: Map<FightingCharacter, FighterStateSnapshot>,
  fighters: readonly FightingCharacter[],
  hpDiffOverrides?: ReadonlyMap<FightingCharacter, number>
): CombatActionAnimation[] {
  const res: CombatActionAnimation[] = [];
  for (const fighter of fighters) {
    const snapshot = before.get(fighter);
    const sprite = fighter.fightingSprite;
    if (!snapshot || !sprite) continue;
    const hpDiff = hpDiffOverrides?.get(fighter) ?? fighter.hp - snapshot.hp;
    const statusFlags = getActiveStatusDiffFlags(snapshot, fighter);
    if (hpDiff === 0 && statusFlags === 0) continue;
    res.push(new RaiseCombatAnimation(game, sprite.combatX, sprite.combatY, hpDiff, statusFlags));
  }
  return res;
}

export function applyPreActionState(game: Game, action: CombatAction): CombatActionAnimation | null {
  const actors = action.kind === 'coop' ? action.actors : [action.actor];
  const players = actors.filter((actor): actor is Player => actor instanceof Player && actor.isAlive);
  if (players.length === 0) return null;
  const before = captureFighterStates(players);
  const logBefore = captureCombatLogStates(players);
  for (const player of players) applyTurnPlayerEffects(player);
  const raises = createRaiseAnimations(game, before, players);
  logCombatFighterEffects('动作前状态', logBefore, players);
  return raises.length > 0 ? new RaiseGroupCombatAnimation(raises, players) : null;
}

// C 引擎在动作后结算毒和状态回合；玩家每回合 HP/MP 已在动作前处理。
export function finishActionState(game: Game, action: CombatAction): CombatActionAnimation | null {
  const actors = action.kind === 'coop' ? action.actors : [action.actor];
  const aliveActors = actors.filter(actor => actor.isAlive);
  const before = captureFighterStates(aliveActors);
  const logBefore = captureCombatLogStates(aliveActors);
  const hpDiffOverrides = new Map<FightingCharacter, number>();
  const poisonActors: FightingCharacter[] = [];
  for (const actor of aliveActors) {
    const poisonDamage = applyPoisonPostEffect(actor);
    if (poisonDamage > 0) {
      hpDiffOverrides.set(actor, -poisonDamage);
      poisonActors.push(actor);
    }
  }
  const raises = createRaiseAnimations(game, before, aliveActors, hpDiffOverrides);
  for (const actor of actors) decayFighterStatuses(actor);
  logCombatFighterEffects('动作后状态', logBefore, aliveActors);
  return raises.length > 0 ? new RaiseGroupCombatAnimation(raises, aliveActors, poisonActors) : null;
}

export function resetFighterFrames(
  players: readonly Player[],
  monsters: readonly Monster[],
  isPlayerDefending: (player: Player) => boolean = () => false
): void {
  for (const player of players) {
    if (player.isAlive && isPlayerDefending(player) && player.fightingSprite) {
      player.fightingSprite.currentFrame = PlayerFightingFrame.Defend;
    } else {
      setPlayerFrameByState(player);
    }
  }
  for (const monster of monsters) {
    if (monster.isAlive && monster.fightingSprite) monster.fightingSprite.currentFrame = MonsterFightingFrame.Idle;
  }
}

function getActiveStatusDiffFlags(snapshot: FighterStateSnapshot, fighter: FightingCharacter): number {
  let flags = 0;
  for (let i = 0; i < fighter.activeStatuses.slots.length; i += 1) {
    const oldStatus = snapshot.statuses[i];
    const status = fighter.activeStatuses.slots[i];
    if (!oldStatus || !status || (oldStatus.value === status.value && oldStatus.round === status.round)) continue;
    flags |= 1 << i;
  }
  return flags;
}

function applyTurnPlayerEffects(player: Player): void {
  if (player.hpPerRound !== 0) player.hp = clampFighterValue(player.hp + player.hpPerRound, 0, player.totalHpMax);
  if (player.mpPerRound !== 0) player.mp = clampFighterValue(player.mp + player.mpPerRound, 0, player.totalMpMax);
}

function clampFighterValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
