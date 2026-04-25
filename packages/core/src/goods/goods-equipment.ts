import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsEquipmentData extends BaseGoodsData {
  readonly mpMax: number;
  readonly hpMax: number;
  readonly defend: number;
  readonly attack: number;
  readonly lingli: number;
  readonly speed: number;
  readonly bitEffect: number;
  readonly luck: number;
}

export class GoodsEquipment extends BaseGoods {
  mpMax: number;
  hpMax: number;
  defend: number;
  attack: number;
  lingli: number;
  speed: number;
  bitEffect: number;
  luck: number;

  constructor(data: GoodsEquipmentData) {
    super(data);
    this.mpMax = data.mpMax;
    this.hpMax = data.hpMax;
    this.defend = data.defend;
    this.attack = data.attack;
    this.lingli = data.lingli;
    this.speed = data.speed;
    this.bitEffect = data.bitEffect;
    this.luck = data.luck;
  }
}
