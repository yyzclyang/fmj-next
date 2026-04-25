import { readUint16 } from '@/lib/resource-utils';
import type { ResSrs } from '@/lib/res-srs';
import { BaseGoods } from './base-goods';

export class GoodsMedicine extends BaseGoods {
  hp = 0;
  mp = 0;
  animation: ResSrs | null = null;
  bitMask = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.hp = readUint16(buf, offset + 0x16);
    this.mp = readUint16(buf, offset + 0x18);
    const index = buf[offset + 0x1a] ?? 0;
    this.animation = index > 0 ? this.resources.getSrs(2, index) : null;
    this.bitMask = buf[offset + 0x1c] ?? 0;
  }

  override effectAll(): boolean {
    return (this.bitMask & 0x10) !== 0;
  }
}
