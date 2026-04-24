import { ResourceType, readInt16 } from '@/lib/resource-utils';
import type { ResourceRef } from './base-goods';
import { BaseGoods } from './base-goods';

export class GoodsHiddenWeapon extends BaseGoods {
  affectHp = 0;
  affectMp = 0;
  animationRef: ResourceRef = { resType: ResourceType.SRS, type: 0, index: 0 };
  bitMask = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.affectHp = readInt16(buf, offset + 0x16);
    this.affectMp = readInt16(buf, offset + 0x18);
    this.animationRef = { resType: ResourceType.SRS, type: buf[offset + 0x1b] ?? 0, index: buf[offset + 0x1a] ?? 0 };
    this.bitMask = buf[offset + 0x1c] ?? 0;
  }

  override effectAll(): boolean {
    return (this.bitMask & 0x10) !== 0;
  }
}
