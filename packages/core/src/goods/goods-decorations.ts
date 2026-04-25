import { MagicAttack } from '@/magic';
import { GoodsEquipment, type GoodsEquipmentData } from './goods-equipment';

export interface GoodsDecorationsData extends GoodsEquipmentData {
  readonly mp: number;
  readonly hp: number;
  readonly coopMagic: MagicAttack | null;
}

export class GoodsDecorations extends GoodsEquipment {
  mp: number;
  hp: number;
  coopMagic: MagicAttack | null;

  constructor(data: GoodsDecorationsData) {
    super(data);
    this.mp = data.mp;
    this.hp = data.hp;
    this.coopMagic = data.coopMagic;
  }
}
