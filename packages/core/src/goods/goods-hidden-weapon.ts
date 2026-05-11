import type { ResSrs } from '@/lib/res-srs';
import { STATUS_FLAG_ATTACK_ALL } from '@/characters/status';
import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsHiddenWeaponData extends BaseGoodsData {
  readonly affectHp: number;
  readonly affectMp: number;
  readonly animation: ResSrs | null;
  readonly effectFlags: number;
}

export class GoodsHiddenWeapon extends BaseGoods {
  affectHp: number;
  affectMp: number;
  animation: ResSrs | null;
  effectFlags: number;

  constructor(data: GoodsHiddenWeaponData) {
    super(data);
    this.affectHp = data.affectHp;
    this.affectMp = data.affectMp;
    this.animation = data.animation;
    this.effectFlags = data.effectFlags;
  }

  override effectAll(): boolean {
    return (this.effectFlags & STATUS_FLAG_ATTACK_ALL) !== 0;
  }
}
