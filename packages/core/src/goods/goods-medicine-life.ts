import { BaseGoods } from './base-goods';

export class GoodsMedicineLife extends BaseGoods {
  percent = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.percent = Math.min(buf[offset + 0x17] ?? 0, 100);
  }
}
