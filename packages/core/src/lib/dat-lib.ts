import { FightingSprite, ResLevelUpChain, WalkingSprite } from '@/characters';
import { BaseGoods, GoodsEquipment } from '@/goods';
import { BaseMagic, ResMagicChain } from '@/magic';
import { parseCharacterResource } from './parse-character';
import { parseGoodsResource } from './parse-goods';
import { parseLevelUpChainResource } from './parse-level-up-chain';
import { parseMagicChainResource, parseMagicResource } from './parse-magic';
import { ResBase } from './res-base';
import { ResGut } from './res-gut';
import { isImageResourceType, ResImage } from './res-image';
import { ResMap } from './res-map';
import { ResSrs } from './res-srs';
import { ResourceType, serializeResourceKey, type ResourceKey } from './resource-utils';

export class DatLib {
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

    if (resType === ResourceType.MRS) {
      return parseMagicResource(this, this.buffer, type, offset);
    }

    if (resType === ResourceType.GRS) {
      return parseGoodsResource(this, this.buffer, type, offset);
    }

    if (resType === ResourceType.ARS) {
      return parseCharacterResource(this, this.buffer, type, offset);
    }

    if (resType === ResourceType.MLR) {
      if (type === 1) return parseMagicChainResource(this, this.buffer, offset);
      if (type === 2) return parseLevelUpChainResource(this.buffer, offset);
      return null;
    }

    const res = this.createResource(resType);
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

  getLevelupChain(index: number): ResLevelUpChain | null {
    const res = this.getRes(ResourceType.MLR, 2, index);
    return res instanceof ResLevelUpChain ? res : null;
  }

  private createResource(resType: ResourceType): ResBase | null {
    switch (resType) {
      case ResourceType.GUT:
        return new ResGut();
      case ResourceType.MAP:
        return new ResMap();
      case ResourceType.SRS:
        return new ResSrs();
      default:
        return isImageResourceType(resType) ? new ResImage() : null;
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
