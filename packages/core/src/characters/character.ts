import { ResBase } from '@/lib/res-base';
import type { ResourceKey, ResourceType } from '@/lib/resource-utils';
import type { ResImage } from '@/lib/res-image';
import type { BaseGoods, GoodsEquipment } from '@/goods';
import type { ResMagicChain } from '@/magic';
import { KeyCode } from '@/shared/key-code';
import type { FightingSprite } from './fighting-sprite';
import type { ResLevelupChain } from './res-levelup-chain';
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

export type ResourceRef = ResourceKey;

export interface CharacterResourceProvider {
  createWalkingSprite(type: number, index: number): WalkingSprite | null;
  createFightingSprite(resType: ResourceType, index: number): FightingSprite | null;
  getImage(resType: ResourceType, type: number, index: number): ResImage | null;
  getEquipment(type: number, index: number): GoodsEquipment | null;
  getGoods(type: number, index: number): BaseGoods | null;
  getMagicChain(index: number): ResMagicChain | null;
  getLevelupChain(index: number): ResLevelupChain | null;
}

export abstract class Character extends ResBase {
  constructor(protected readonly resources: CharacterResourceProvider) {
    super();
  }
  name = '';
  state: CharacterState = CharacterState.Stop;
  direction: Direction = KeyCode.Down;
  step = 0;
  mapX = 0;
  mapY = 0;
  walkingSprite: WalkingSprite | null = null;

  protected createWalkingSprite(type: number, index: number): WalkingSprite | null {
    return this.resources.createWalkingSprite(type, index);
  }

  protected createFightingSprite(resType: ResourceType, index: number): FightingSprite | null {
    return this.resources.createFightingSprite(resType, index);
  }

  protected loadImage(resType: ResourceType, type: number, index: number): ResImage | null {
    return this.resources.getImage(resType, type, index);
  }

  protected loadEquipment(type: number, index: number): GoodsEquipment | null {
    return this.resources.getEquipment(type, index);
  }

  protected loadGoods(type: number, index: number): BaseGoods | null {
    return this.resources.getGoods(type, index);
  }
}
