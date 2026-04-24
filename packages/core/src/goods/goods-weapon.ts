import { ResourceType } from '@/lib/resource-utils';
import type { ResourceRef } from './base-goods';
import { GoodsEquipment } from './goods-equipment';

export class GoodsWeapon extends GoodsEquipment {
  animationRef: ResourceRef = { resType: ResourceType.SRS, type: 0, index: 0 };
  affectMp = 0;

  get affectHp(): number {
    return this.attack * 50;
  }

  attackAll(): boolean {
    return (this.bitEffect & 0x10) !== 0;
  }
}
