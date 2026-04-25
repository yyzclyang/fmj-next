import type { ResSrs } from '@/lib/res-srs';
import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsHiddenWeaponData extends BaseGoodsData {
  readonly affectHp: number;
  readonly affectMp: number;
  readonly animation: ResSrs | null;
  readonly bitMask: number;
}

export class GoodsHiddenWeapon extends BaseGoods {
  affectHp: number;
  affectMp: number;
  animation: ResSrs | null;
  bitMask: number;

  constructor(data: GoodsHiddenWeaponData) {
    super(data);
    this.affectHp = data.affectHp;
    this.affectMp = data.affectMp;
    this.animation = data.animation;
    this.bitMask = data.bitMask;
  }

  override effectAll(): boolean {
    return (this.bitMask & 0x10) !== 0;
  }
}
