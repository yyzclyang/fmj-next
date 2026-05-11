import type { ResSrs } from '@/lib/res-srs';
import { STATUS_FLAG_ATTACK_ALL } from '@/characters/status';
import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsHiddenWeaponData extends BaseGoodsData {
  readonly hpDamage: number;
  readonly mpDamage: number;
  readonly animation: ResSrs | null;
  readonly effectFlags: number;
}

export class GoodsHiddenWeapon extends BaseGoods {
  hpDamage: number;
  mpDamage: number;
  animation: ResSrs | null;
  effectFlags: number;

  constructor(data: GoodsHiddenWeaponData) {
    super(data);
    this.hpDamage = data.hpDamage;
    this.mpDamage = data.mpDamage;
    this.animation = data.animation;
    this.effectFlags = data.effectFlags;
  }

  override affectsAllTargets(): boolean {
    return (this.effectFlags & STATUS_FLAG_ATTACK_ALL) !== 0;
  }
}
