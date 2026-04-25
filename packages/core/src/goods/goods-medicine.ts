import type { ResSrs } from '@/lib/res-srs';
import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsMedicineData extends BaseGoodsData {
  readonly hp: number;
  readonly mp: number;
  readonly animation: ResSrs | null;
  readonly bitMask: number;
}

export class GoodsMedicine extends BaseGoods {
  hp: number;
  mp: number;
  animation: ResSrs | null;
  bitMask: number;

  constructor(data: GoodsMedicineData) {
    super(data);
    this.hp = data.hp;
    this.mp = data.mp;
    this.animation = data.animation;
    this.bitMask = data.bitMask;
  }

  override effectAll(): boolean {
    return (this.bitMask & 0x10) !== 0;
  }
}
