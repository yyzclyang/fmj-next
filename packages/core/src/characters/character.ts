import { ResBase } from '@/lib/res-base';
import type { WalkingSprite } from './walking-sprite';

export const Direction = {
  North: 1,
  East: 2,
  South: 3,
  West: 4,
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

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
}
