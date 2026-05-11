import { MagicAttack } from '@/magic';
import { GoodsEquipment, type GoodsEquipmentData } from './goods-equipment';

export interface GoodsDecorationData extends GoodsEquipmentData {
  readonly mpPerRound: number;
  readonly hpPerRound: number;
  readonly coopMagic: MagicAttack | null;
}

export class GoodsDecoration extends GoodsEquipment {
  mpPerRound: number;
  hpPerRound: number;
  coopMagic: MagicAttack | null;

  constructor(data: GoodsDecorationData) {
    super(data);
    this.mpPerRound = data.mpPerRound;
    this.hpPerRound = data.hpPerRound;
    this.coopMagic = data.coopMagic;
  }
}
