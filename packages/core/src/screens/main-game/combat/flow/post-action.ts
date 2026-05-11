import { Player, type FightingCharacter, type Monster } from '@/characters';
import type { CombatAction } from '@/combat/combat-actions';
import { applyPoisonPostEffect, decayFighterStatuses } from '@/combat/combat-effects';
import type { Game } from '@/game/game';
import {
  RaiseCombatAnimation,
  RaiseGroupCombatAnimation,
  setPlayerFrameByState,
  type CombatActionAnimation,
} from '../animations';

interface FighterStateSnapshot {
  readonly hp: number;
  readonly mp: number;
  readonly statuses: readonly { readonly value: number; readonly round: number }[];
}

export function captureFighterStates(fighters: readonly FightingCharacter[]): Map<FightingCharacter, FighterStateSnapshot> {
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
  fighters: readonly FightingCharacter[]
): CombatActionAnimation[] {
  const res: CombatActionAnimation[] = [];
  for (const fighter of fighters) {
    const snapshot = before.get(fighter);
    const sprite = fighter.fightingSprite;
    if (!snapshot || !sprite) continue;
    const hpDiff = fighter.hp - snapshot.hp;
    const statusFlags = getActiveStatusDiffFlags(snapshot, fighter);
    if (hpDiff === 0 && statusFlags === 0) continue;
    res.push(new RaiseCombatAnimation(game, sprite.combatX, sprite.combatY, hpDiff, statusFlags));
  }
  return res;
}

// C 引擎在动作后结算玩家每回合 HP/MP、毒和状态回合，这里保持同一顺序。
export function finishActionState(game: Game, action: CombatAction): CombatActionAnimation | null {
  const actors = action.kind === 'coop' ? action.actors : [action.actor];
  const aliveActors = actors.filter(actor => actor.isAlive);
  const before = captureFighterStates(aliveActors);
  for (const actor of aliveActors) {
    if (actor instanceof Player) applyTurnPlayerEffects(actor);
    applyPoisonPostEffect(actor);
  }
  const raises = createRaiseAnimations(game, before, aliveActors);
  for (const actor of actors) decayFighterStatuses(actor);
  return raises.length > 0 ? new RaiseGroupCombatAnimation(raises, aliveActors) : null;
}

export function resetFighterFrames(players: readonly Player[], monsters: readonly Monster[]): void {
  for (const player of players) {
    setPlayerFrameByState(player);
  }
  for (const monster of monsters) {
    if (monster.isAlive && monster.fightingSprite) monster.fightingSprite.currentFrame = 1;
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
  if (player.hpPerRound !== 0) player.hp = clampFighterValue(player.hp + player.hpPerRound, 0, player.hpMax);
  if (player.mpPerRound !== 0) player.mp = clampFighterValue(player.mp + player.mpPerRound, 0, player.mpMax);
}

function clampFighterValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
