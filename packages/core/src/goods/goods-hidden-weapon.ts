import { readInt16 } from '@/lib/resource-utils';
import type { ResSrs } from '@/lib/res-srs';
import { BaseGoods } from './base-goods';

export class GoodsHiddenWeapon extends BaseGoods {
  affectHp = 0;
  affectMp = 0;
  animation: ResSrs | null = null;
  bitMask = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.affectHp = readInt16(buf, offset + 0x16);
    this.affectMp = readInt16(buf, offset + 0x18);
    const animationIndex = buf[offset + 0x1a] ?? 0;
    const animationType = buf[offset + 0x1b] ?? 0;
    this.animation = animationIndex > 0 ? this.resources.getSrs(animationType, animationIndex) : null;
    this.bitMask = buf[offset + 0x1c] ?? 0;
  }

  override effectAll(): boolean {
    return (this.bitMask & 0x10) !== 0;
  }
}
