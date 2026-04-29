import { Player, type FightingCharacter, type FightingSprite } from '@/characters';
import { isSleeping } from '@/combat/combat-effects';

export const FRAME_INTERVAL = 50;
export const PHYSICAL_MOVE_FRAMES = 5;
export const CAST_PRE_FRAMES = 10;

export interface SpriteSnapshot {
  readonly sprite: FightingSprite;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
}

export function snapshotSprite(fighter: FightingCharacter): SpriteSnapshot | null {
  const sprite = fighter.fightingSprite;
  return sprite ? { sprite, x: sprite.combatX, y: sprite.combatY, frame: sprite.currentFrame } : null;
}

export function restoreSprite(snapshot: SpriteSnapshot | null): void {
  if (!snapshot) return;
  snapshot.sprite.setCombatPos(snapshot.x, snapshot.y);
  snapshot.sprite.currentFrame = snapshot.frame;
}

export function setPhysicalAttackFrame(actor: FightingCharacter, frame: number, total: number): void {
  const sprite = actor.fightingSprite;
  if (!sprite) return;
  if (actor instanceof Player) {
    sprite.currentFrame = Math.trunc((5 * frame) / total) + 1;
  } else {
    sprite.currentFrame = Math.trunc((sprite.frameCount * frame) / total) + 1;
  }
}

export function setPlayerFrameByState(player: Player): void {
  const sprite = player.fightingSprite;
  if (!sprite) return;
  sprite.currentFrame = player.hp <= 0 ? 12 : isSleeping(player) || player.hp < player.maxHp / 4 ? 11 : 1;
}
