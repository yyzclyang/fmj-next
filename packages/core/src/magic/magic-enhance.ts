import { BaseMagic } from './base-magic';

export class MagicEnhance extends BaseMagic {
  defendPercent = 0;
  attackPercent = 0;
  speedPercent = 0;
  buffRound = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.defendPercent = buf[offset + 0x16] ?? 0;
    this.attackPercent = buf[offset + 0x17] ?? 0;
    this.buffRound = ((buf[offset + 0x18] ?? 0) >> 4) & 0x0f;
    this.speedPercent = buf[offset + 0x19] ?? 0;
  }
}
