import { BaseGoods } from './base-goods';

export class GoodsStimulant extends BaseGoods {
  defendPercent = 0;
  attackPercent = 0;
  speedPercent = 0;
  forAll = false;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.defendPercent = buf[offset + 0x18] ?? 0;
    this.attackPercent = buf[offset + 0x19] ?? 0;
    this.speedPercent = buf[offset + 0x1b] ?? 0;
    this.forAll = ((buf[offset + 0x1c] ?? 0) & 0x10) !== 0;
  }

  override effectAll(): boolean {
    return this.forAll;
  }
}
