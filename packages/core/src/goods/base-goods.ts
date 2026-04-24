import { ResBase } from '@/lib/res-base';
import { ResourceType, readGbkString, readUint16 } from '@/lib/resource-utils';

export interface ResourceRef {
  readonly resType: ResourceType;
  readonly type: number;
  readonly index: number;
}

export abstract class BaseGoods extends ResBase {
  protected enable = 0;
  sumRound = 0;
  imageRef: ResourceRef | null = null;
  name = '';
  buyPrice = 0;
  sellPrice = 0;
  description = '';
  eventId = 0;

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.enable = buf[offset + 3] ?? 0;
    this.sumRound = buf[offset + 4] ?? 0;
    this.imageRef = { resType: ResourceType.GDP, type: this.type, index: buf[offset + 5] ?? 0 };
    this.name = readGbkString(buf, offset + 6);
    this.buyPrice = readUint16(buf, offset + 0x12);
    this.sellPrice = readUint16(buf, offset + 0x14);
    this.description = readGbkString(buf, offset + 0x1e);
    this.eventId = readUint16(buf, offset + 0x84);
    this.setOtherData(buf, offset);
  }

  canPlayerUse(playerId: number): boolean {
    return playerId >= 1 && playerId <= 4 && (this.enable & (1 << (playerId - 1))) !== 0;
  }

  effectAll(): boolean {
    return false;
  }

  protected abstract setOtherData(buf: Uint8Array, offset: number): void;
}
