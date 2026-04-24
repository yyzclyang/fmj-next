import { readInt8 } from '@/lib/resource-utils';
import { BaseGoods } from './base-goods';

export class GoodsEquipment extends BaseGoods {
  mpMax = 0;
  hpMax = 0;
  defend = 0;
  attack = 0;
  lingli = 0;
  speed = 0;
  bitEffect = 0;
  luck = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.mpMax = readInt8(buf, offset + 0x16);
    this.hpMax = readInt8(buf, offset + 0x17);
    this.defend = buf[offset + 0x18] ?? 0;
    this.attack = buf[offset + 0x19] ?? 0;
    this.lingli = readInt8(buf, offset + 0x1a);
    this.speed = readInt8(buf, offset + 0x1b);
    this.bitEffect = buf[offset + 0x1c] ?? 0;
    this.luck = readInt8(buf, offset + 0x1d);
  }
}
