import { Player, type FightingCharacter, type FightingSprite } from '@/characters';
import { isSleeping } from '@/combat/combat-effects';
import type { Surface } from '@/rendering/surface';
import type { CombatActionAnimation } from './animation-types';

export const FRAME_INTERVAL = 40;
export const PHYSICAL_MOVE_FRAMES = 10;
export const CAST_PRE_FRAMES = 20;

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

export function snapshotSprites(fighters: readonly FightingCharacter[]): SpriteSnapshot[] {
  return fighters.map(snapshotSprite).filter((item): item is SpriteSnapshot => item != null);
}

export function restoreSprite(snapshot: SpriteSnapshot | null): void {
  if (!snapshot) return;
  snapshot.sprite.setCombatPos(snapshot.x, snapshot.y);
  snapshot.sprite.currentFrame = snapshot.frame;
}

export function restoreSprites(snapshots: readonly SpriteSnapshot[]): void {
  for (const snapshot of snapshots) restoreSprite(snapshot);
}

export function advanceFrameTimer(frame: number, elapsed: number, delta: number): { frame: number; elapsed: number } {
  let nextFrame = frame;
  let nextElapsed = elapsed + delta;
  while (nextElapsed >= FRAME_INTERVAL) {
    nextElapsed -= FRAME_INTERVAL;
    nextFrame += 1;
  }
  return { frame: nextFrame, elapsed: nextElapsed };
}

export function updateActiveAnimations(animations: CombatActionAnimation[], delta: number): boolean {
  for (let i = animations.length - 1; i >= 0; i -= 1) {
    if (!animations[i]!.update(delta)) animations.splice(i, 1);
  }
  return animations.length > 0;
}

export function drawActiveAnimations(surface: Surface, animations: readonly CombatActionAnimation[]): void {
  for (const animation of animations) animation.draw(surface);
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

export function setPlayerCastFrame(snapshot: SpriteSnapshot, frame: number): void {
  snapshot.sprite.currentFrame = Math.trunc((frame * 3) / CAST_PRE_FRAMES) + 6;
}

export function setPlayerFrameByState(player: Player): void {
  const sprite = player.fightingSprite;
  if (!sprite) return;
  sprite.currentFrame = player.hp <= 0 ? 12 : isSleeping(player) || player.hp < player.hpMax / 4 ? 11 : 1;
}
