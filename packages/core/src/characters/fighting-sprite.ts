import { type ResImage } from '@/lib/res-image';

// 玩家 PIC 3 战斗图的固定帧约定；怪物 ACP 3 只保证 Idle，其余按资源帧数播放。
export const PlayerFightingFrame = {
  Idle: 1,
  GuardedHit: 8,
  Defend: 9,
  Hit: 10,
  Weak: 11,
  Dead: 12,
} as const;
export type PlayerFightingFrame = (typeof PlayerFightingFrame)[keyof typeof PlayerFightingFrame];

export const PlayerFightingFrameRange = {
  PhysicalAttack: { start: 1, end: 5 },
  MagicCast: { start: 6, end: 8 },
} as const;
export type PlayerFightingFrameRange = (typeof PlayerFightingFrameRange)[keyof typeof PlayerFightingFrameRange];

export const MonsterFightingFrame = {
  Idle: 1,
} as const;
export type MonsterFightingFrame = (typeof MonsterFightingFrame)[keyof typeof MonsterFightingFrame];

// 战斗图在角色资源解析时绑定图片
export class FightingSprite {
  currentFrame: number = PlayerFightingFrame.Idle;
  combatX = 0;
  combatY = 0;

  constructor(readonly image: ResImage) {}

  get width(): number {
    return this.image.width;
  }

  get height(): number {
    return this.image.height;
  }

  get frameCount(): number {
    return this.image.number;
  }

  setCombatPos(x: number, y: number): void {
    this.combatX = x;
    this.combatY = y;
  }

  move(dx: number, dy: number): void {
    this.combatX += dx;
    this.combatY += dy;
  }
}
