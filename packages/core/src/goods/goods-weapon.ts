import type { ResSrs } from '@/lib/res-srs';
import { GoodsEquipment, type GoodsEquipmentData } from './goods-equipment';

export interface GoodsWeaponData extends GoodsEquipmentData {
  readonly animation: ResSrs;
  readonly affectMp: number;
}

export class GoodsWeapon extends GoodsEquipment {
  animation: ResSrs;
  affectMp: number;

  constructor(data: GoodsWeaponData) {
    super(data);
    this.animation = data.animation;
    this.affectMp = data.affectMp;
  }

  get affectHp(): number {
    return this.attack * 50;
  }

  attackAll(): boolean {
    return (this.bitEffect & 0x10) !== 0;
  }
}
