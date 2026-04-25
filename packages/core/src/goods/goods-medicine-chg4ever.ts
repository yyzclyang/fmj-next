import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsMedicineChg4EverData extends BaseGoodsData {
  readonly mpMax: number;
  readonly hpMax: number;
  readonly defend: number;
  readonly attack: number;
  readonly lingli: number;
  readonly speed: number;
  readonly luck: number;
}

export class GoodsMedicineChg4Ever extends BaseGoods {
  mpMax: number;
  hpMax: number;
  defend: number;
  attack: number;
  lingli: number;
  speed: number;
  luck: number;

  constructor(data: GoodsMedicineChg4EverData) {
    super(data);
    this.mpMax = data.mpMax;
    this.hpMax = data.hpMax;
    this.defend = data.defend;
    this.attack = data.attack;
    this.lingli = data.lingli;
    this.speed = data.speed;
    this.luck = data.luck;
  }
}
