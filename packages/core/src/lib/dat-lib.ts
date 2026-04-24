import { isImageResourceType, ResImage } from './res-image';
import { ResBase } from './res-base';
import { ResGut } from './res-gut';
import { ResMap } from './res-map';
import { ResourceType, serializeResourceKey, type ResourceKey } from './resource-utils';
import { ResSrs } from './res-srs';
import { createGoods } from '@/goods';

export class DatLib {
  private readonly offsets = new Map<string, number>();
  private readonly resourceKeys: ResourceKey[] = [];
  private readonly buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.loadOffsets();
  }

  getRes(resType: ResourceType, type: number, index: number): ResBase | null {
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

  private createResource(resType: ResourceType, type: number): ResBase | null {
    switch (resType) {
      case ResourceType.GUT:
        return new ResGut();
      case ResourceType.MAP:
        return new ResMap();
      case ResourceType.SRS:
        return new ResSrs();
      case ResourceType.GRS:
        return createGoods(type);
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
