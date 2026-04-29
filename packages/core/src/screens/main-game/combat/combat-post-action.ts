import { Player, type FightingCharacter, type Monster } from '@/characters';
import type { CombatAction } from '@/combat/combat-actions';
import { applyPoisonPostEffect, decayFighterBuffs } from '@/combat/combat-effects';
import type { Game } from '@/game/game';
import { GoodsDecorations } from '@/goods';
import {
  RaiseCombatAnimation,
  RaiseGroupCombatAnimation,
  setPlayerFrameByState,
  type CombatActionAnimation,
} from './combat-animations';

interface FighterStateSnapshot {
  readonly hp: number;
  readonly mp: number;
  readonly debuffs: readonly { readonly value: number; readonly round: number }[];
}

export function captureFighterStates(fighters: readonly FightingCharacter[]): Map<FightingCharacter, FighterStateSnapshot> {
  const res = new Map<FightingCharacter, FighterStateSnapshot>();
  for (const fighter of fighters) {
    if (res.has(fighter)) continue;
    res.set(fighter, {
      hp: fighter.hp,
      mp: fighter.mp,
      debuffs: fighter.debuff.buffs.map(buff => ({ value: buff.value, round: buff.round })),
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
    const buffMask = getDebuffDiffMask(snapshot, fighter);
    if (hpDiff === 0 && buffMask === 0) continue;
    res.push(new RaiseCombatAnimation(game, sprite.combatX, sprite.combatY - Math.trunc(sprite.height / 2), hpDiff, buffMask));
  }
  return res;
}

// Kotlin 在每个动作后结算饰品、中毒和状态回合，这里保持同一顺序。
export function finishActionState(game: Game, action: CombatAction): CombatActionAnimation | null {
  const actors = action.kind === 'coop' ? action.actors : [action.actor];
  const aliveActors = actors.filter(actor => actor.isAlive);
  const before = captureFighterStates(aliveActors);
  for (const actor of aliveActors) {
    if (actor instanceof Player) applyTurnEquipmentEffects(actor);
    applyPoisonPostEffect(actor);
  }
  const raises = createRaiseAnimations(game, before, aliveActors);
  for (const actor of actors) decayFighterBuffs(actor);
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

function getDebuffDiffMask(snapshot: FighterStateSnapshot, fighter: FightingCharacter): number {
  let mask = 0;
  for (let i = 0; i < fighter.debuff.buffs.length; i += 1) {
    const oldBuff = snapshot.debuffs[i];
    const buff = fighter.debuff.buffs[i];
    if (!oldBuff || !buff || (oldBuff.value === buff.value && oldBuff.round === buff.round)) continue;
    mask |= 1 << i;
  }
  return mask;
}

function applyTurnEquipmentEffects(player: Player): void {
  for (const equipment of player.equipment.slice(0, 2)) {
    if (!(equipment instanceof GoodsDecorations)) continue;
    player.hp = Math.min(player.maxHp, player.hp + equipment.hp);
    player.mp = Math.min(player.maxMp, player.mp + equipment.mp);
  }
}
