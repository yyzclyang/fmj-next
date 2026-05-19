import {
  MonsterFightingFrame,
  Player,
  PlayerFightingFrame,
  PlayerFightingFrameRange,
  type FightingCharacter,
  type FightingSprite,
} from '@/characters';
import { isSleeping } from '@/combat/combat-effects';
import type { Surface } from '@/rendering/surface';
import { FIXED_STEP_MS } from '@/utils/constants';
import type { CombatActionAnimation } from './animation-types';

export const COMBAT_FRAME_INTERVAL = 2 * FIXED_STEP_MS; // 战斗动画的基础逻辑帧间隔，单位毫秒。

export const PHYSICAL_ATTACK_MOVE_FRAMES = 6; // 普攻从原位移动到目标附近的逻辑帧数。
export const FLEE_MOVE_FRAMES = 6; // 逃跑向下离场的移动逻辑帧数。
export const FLEE_FAIL_FRAMES = 3; // 逃跑失败后停留在受挫姿态的逻辑帧数。
export const MAGIC_CAST_PRE_FRAMES = 8; // 普通施法前摇的逻辑帧数。
export const MAGIC_SRS_ITERATIONS = 2; // 普通魔法 SRS 每次 update 推进的内部帧数，越大越快。
export const COOP_MOVE_FRAMES = 6; // 合击角色移动到集合点的逻辑帧数。
export const COOP_CAST_PRE_FRAMES = 6; // 合击施法前摇的逻辑帧数。
export const COOP_SRS_ITERATIONS = 1; // 合击魔法 SRS 每次 update 推进的内部帧数，越大越快。
export const MISS_FLOAT_STEPS = 4; // Miss 图片上浮的逻辑步数。
export const RAISE_NUMBER_FLOAT_STEPS = 4; // 战斗数字上浮的逻辑步数。
export const STATUS_EFFECT_SRS_ITERATIONS = 1; // 异常状态特效 SRS 每次 update 推进的内部帧数。

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
  return fighters.map(snapshotSprite).filter((item): item is SpriteSnapshot => item !== null);
}

export function restoreSprite(snapshot: SpriteSnapshot | null): void {
  if (!snapshot) return;
  snapshot.sprite.setCombatPos(snapshot.x, snapshot.y);
  snapshot.sprite.currentFrame = snapshot.frame;
}

export function restoreSprites(snapshots: readonly SpriteSnapshot[]): void {
  for (const snapshot of snapshots) restoreSprite(snapshot);
}

export function advanceFrameTimer(
  frame: number,
  elapsed: number,
  delta: number,
  frameInterval = COMBAT_FRAME_INTERVAL
): { frame: number; elapsed: number } {
  let nextFrame = frame;
  let nextElapsed = elapsed + delta;
  while (nextElapsed >= frameInterval) {
    nextElapsed -= frameInterval;
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
    const range = PlayerFightingFrameRange.PhysicalAttack;
    sprite.currentFrame = Math.trunc((getFrameSpan(range) * frame) / total) + range.start;
  } else {
    sprite.currentFrame = Math.trunc((sprite.frameCount * frame) / total) + MonsterFightingFrame.Idle;
  }
}

export function setPlayerCastFrame(snapshot: SpriteSnapshot, frame: number, totalFrames: number): void {
  const range = PlayerFightingFrameRange.MagicCast;
  snapshot.sprite.currentFrame = Math.trunc((frame * getFrameSpan(range)) / totalFrames) + range.start;
}

function getFrameSpan(range: PlayerFightingFrameRange): number {
  return range.end - range.start + 1;
}

export function setPlayerFrameByState(player: Player): void {
  const sprite = player.fightingSprite;
  if (!sprite) return;
  sprite.currentFrame =
    player.hp <= 0
      ? PlayerFightingFrame.Dead
      : isSleeping(player) || player.hp < player.totalHpMax / 4
        ? PlayerFightingFrame.Weak
        : PlayerFightingFrame.Idle;
}
