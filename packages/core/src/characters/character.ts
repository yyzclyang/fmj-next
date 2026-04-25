import { ResBase } from '@/lib/res-base';
import { KeyCode } from '@/shared/key-code';
import type { WalkingSprite } from './walking-sprite';

export type Direction = typeof KeyCode.Up | typeof KeyCode.Right | typeof KeyCode.Down | typeof KeyCode.Left;

export const CharacterState = {
  Stop: 0,
  ForceMove: 1,
  Walking: 2,
  Pause: 3,
  Active: 4,
} as const;

export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState];

export interface CharacterData {
  readonly type: number;
  readonly index: number;
  readonly name: string;
  readonly state: CharacterState;
  readonly direction: Direction;
  readonly step: number;
  readonly mapX: number;
  readonly mapY: number;
  readonly walkingSprite: WalkingSprite | null;
}

export abstract class Character extends ResBase {
  name: string;
  state: CharacterState;
  direction: Direction;
  step: number;
  mapX: number;
  mapY: number;
  walkingSprite: WalkingSprite | null;

  protected constructor(data: CharacterData) {
    super();
    this.type = data.type;
    this.index = data.index;
    this.name = data.name;
    this.state = data.state;
    this.direction = data.direction;
    this.step = data.step;
    this.mapX = data.mapX;
    this.mapY = data.mapY;
    this.walkingSprite = data.walkingSprite;
  }

  // 角色资源由 DatLib 构造；保留空实现只是为了兼容 ResBase 体系。
  setData(): void {}
}
