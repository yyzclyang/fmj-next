import type { ResSrs } from '@/lib/res-srs';
import { STATUS_FLAG_ATTACK_ALL } from '@/characters/status';
import { GoodsEquipment, type GoodsEquipmentData } from './goods-equipment';

export interface GoodsWeaponData extends GoodsEquipmentData {
  readonly animation: ResSrs;
  readonly mpDamage: number;
}

export class GoodsWeapon extends GoodsEquipment {
  animation: ResSrs;
  mpDamage: number;

  constructor(data: GoodsWeaponData) {
    super(data);
    this.animation = data.animation;
    this.mpDamage = data.mpDamage;
  }

  get hpDamage(): number {
    return this.attack * 50;
  }

  attackAll(): boolean {
    return (this.effectFlags & STATUS_FLAG_ATTACK_ALL) !== 0;
  }
}
