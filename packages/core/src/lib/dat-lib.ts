import { isImageResourceType, ResImage } from './res-image';
import { ResBase } from './res-base';
import { ResGut } from './res-gut';
import { ResMap } from './res-map';
import { ResourceType, serializeResourceKey, type ResourceKey } from './resource-utils';
import { ResSrs } from './res-srs';
import {
  Character,
  FightingSprite,
  Monster,
  Npc,
  Player,
  SceneObj,
  WalkingSprite,
  type CharacterResourceProvider,
} from '@/characters';
import { BaseGoods, GoodsEquipment, createGoods, type GoodsResourceProvider } from '@/goods';
import { BaseMagic, ResMagicChain, createMagic, type MagicChainResourceProvider, type MagicResourceProvider } from '@/magic';
import { ResLevelupChain } from '@/characters/res-levelup-chain';

export class DatLib
  implements CharacterResourceProvider, MagicResourceProvider, MagicChainResourceProvider, GoodsResourceProvider
{
  private readonly offsets = new Map<string, number>();
  private readonly resourceKeys: ResourceKey[] = [];
  private readonly buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.loadOffsets();
  }

  getRes(resType: ResourceType, type: number, index: number): ResBase | null {
    // TODO: 后续给角色、道具等资源使用方补明确方法，减少直接依赖通用 getRes。
    const offset = this.offsets.get(serializeResourceKey({ resType, type, index })) ?? null;
    if (offset == null) return null;

    const res = this.createResource(resType, type);
    if (!res) return null;

    res.setData(this.buffer, offset);
    return res;
  }

  listResourceKeys(resType?: ResourceType): ResourceKey[] {
    const res = resType == null ? [...this.resourceKeys] : this.resourceKeys.filter(key => key.resType === resType);
    return res.sort((a, b) => a.resType - b.resType || a.type - b.type || a.index - b.index);
  }

  createWalkingSprite(type: number, index: number): WalkingSprite | null {
    const image = this.getImage(ResourceType.ACP, type, index);
    return image ? new WalkingSprite(image) : null;
  }

  createFightingSprite(resType: ResourceType, index: number): FightingSprite | null {
    const image = this.getImage(resType, 3, index);
    return image ? new FightingSprite(image) : null;
  }

  getImage(resType: ResourceType, type: number, index: number): ResImage | null {
    const res = this.getRes(resType, type, index);
    return res instanceof ResImage ? res : null;
  }

  getSrs(type: number, index: number): ResSrs | null {
    const res = this.getRes(ResourceType.SRS, type, index);
    return res instanceof ResSrs ? res : null;
  }

  getEquipment(type: number, index: number): GoodsEquipment | null {
    const goods = this.getGoods(type, index);
    return goods instanceof GoodsEquipment ? goods : null;
  }

  getGoods(type: number, index: number): BaseGoods | null {
    const res = this.getRes(ResourceType.GRS, type, index);
    return res instanceof BaseGoods ? res : null;
  }

  getMagic(type: number, index: number): BaseMagic | null {
    const res = this.getRes(ResourceType.MRS, type, index);
    return res instanceof BaseMagic ? res : null;
  }

  getMagicChain(index: number): ResMagicChain | null {
    const res = this.getRes(ResourceType.MLR, 1, index);
    return res instanceof ResMagicChain ? res : null;
  }

  getLevelupChain(index: number): ResLevelupChain | null {
    const res = this.getRes(ResourceType.MLR, 2, index);
    return res instanceof ResLevelupChain ? res : null;
  }

  private createResource(resType: ResourceType, type: number): ResBase | null {
    switch (resType) {
      case ResourceType.GUT:
        return new ResGut();
      case ResourceType.MAP:
        return new ResMap();
      case ResourceType.ARS:
        return this.createCharacter(type);
      case ResourceType.SRS:
        return new ResSrs();
      case ResourceType.GRS:
        return createGoods(type, this);
      case ResourceType.MRS:
        return createMagic(type, this);
      case ResourceType.MLR:
        return this.createMlr(type);
      default:
        return isImageResourceType(resType) ? new ResImage() : null;
    }
  }

  private createMlr(type: number): ResBase | null {
    switch (type) {
      case 1:
        return new ResMagicChain(this);
      case 2:
        return new ResLevelupChain();
      default:
        return null;
    }
  }

  private createCharacter(type: number): Character | null {
    switch (type) {
      case 1:
        return new Player(this);
      case 2:
        return new Npc(this);
      case 3:
        return new Monster(this);
      case 4:
        return new SceneObj(this);
      default:
        return null;
    }
  }

  private loadOffsets(): void {
    let keyPtr = 0x10;
    let offsetPtr = 0x2000;

    while (keyPtr + 2 < this.buffer.length && this.buffer[keyPtr] !== 0xff) {
      const resType = this.buffer[keyPtr] as ResourceType;
      const type = this.buffer[keyPtr + 1] ?? 0;
      const index = this.buffer[keyPtr + 2] ?? 0;
      const block = this.buffer[offsetPtr] ?? 0;
      const low = this.buffer[offsetPtr + 1] ?? 0;
      const high = this.buffer[offsetPtr + 2] ?? 0;
      const offset = block * 0x4000 + (high << 8) + low;

      if (offset >= 0 && offset < this.buffer.length) {
        const key = { resType, type, index };
        this.offsets.set(serializeResourceKey(key), offset);
        this.resourceKeys.push(key);
      }

      keyPtr += 3;
      offsetPtr += 3;
    }
  }
}
