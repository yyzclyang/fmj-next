import { ResourceType, readUint16 } from '@/lib/resource-utils';
import type { ResourceRef } from './base-goods';
import { BaseGoods } from './base-goods';

export class GoodsMedicine extends BaseGoods {
  hp = 0;
  mp = 0;
  animationRef: ResourceRef | null = null;
  bitMask = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.hp = readUint16(buf, offset + 0x16);
    this.mp = readUint16(buf, offset + 0x18);
    const index = buf[offset + 0x1a] ?? 0;
    this.animationRef = index > 0 ? { resType: ResourceType.SRS, type: 2, index } : null;
    this.bitMask = buf[offset + 0x1c] ?? 0;
  }

  override effectAll(): boolean {
    return (this.bitMask & 0x10) !== 0;
  }
}
