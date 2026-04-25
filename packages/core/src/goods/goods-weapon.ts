import type { ResSrs } from '@/lib/res-srs';
import { GoodsEquipment } from './goods-equipment';

export class GoodsWeapon extends GoodsEquipment {
  animation: ResSrs | null = null;
  affectMp = 0;

  get affectHp(): number {
    return this.attack * 50;
  }

  attackAll(): boolean {
    return (this.bitEffect & 0x10) !== 0;
  }
}
