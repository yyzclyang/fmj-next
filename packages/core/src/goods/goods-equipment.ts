import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsEquipmentData extends BaseGoodsData {
  readonly mpMax: number;
  readonly hpMax: number;
  readonly defense: number;
  readonly attack: number;
  readonly spirit: number;
  readonly agility: number;
  readonly bitEffect: number;
  readonly luck: number;
}

export class GoodsEquipment extends BaseGoods {
  mpMax: number;
  hpMax: number;
  defense: number;
  attack: number;
  spirit: number;
  agility: number;
  bitEffect: number;
  luck: number;

  constructor(data: GoodsEquipmentData) {
    super(data);
    this.mpMax = data.mpMax;
    this.hpMax = data.hpMax;
    this.defense = data.defense;
    this.attack = data.attack;
    this.spirit = data.spirit;
    this.agility = data.agility;
    this.bitEffect = data.bitEffect;
    this.luck = data.luck;
  }
}
