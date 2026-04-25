import { readInt16 } from '@/lib/resource-utils';
import { BaseMagic } from './base-magic';

export class MagicAttack extends BaseMagic {
  affectHp = 0;
  affectMp = 0;
  defendPercent = 0;
  attackPercent = 0;
  buffMask = 0;
  speedPercent = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.affectHp = readInt16(buf, offset + 0x12);
    this.affectMp = readInt16(buf, offset + 0x14);
    this.defendPercent = buf[offset + 0x16] ?? 0;
    this.attackPercent = buf[offset + 0x17] ?? 0;
    this.buffMask = buf[offset + 0x18] ?? 0;
    this.speedPercent = buf[offset + 0x19] ?? 0;
  }
}
