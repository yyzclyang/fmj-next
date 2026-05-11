import { BaseGoods, type BaseGoodsData } from './base-goods';

export const EquipmentGoodsType = {
  Head: 1,
  Body: 2,
  Foot: 3,
  Shoulder: 4,
  Wrist: 5,
  Decoration: 6,
  Hand: 7,
} as const;

export interface GoodsEquipmentData extends BaseGoodsData {
  readonly mpMax: number;
  readonly hpMax: number;
  readonly defense: number;
  readonly attack: number;
  readonly spirit: number;
  readonly agility: number;
  readonly effectFlags: number;
  readonly luck: number;
}

export class GoodsEquipment extends BaseGoods {
  mpMax: number;
  hpMax: number;
  defense: number;
  attack: number;
  spirit: number;
  agility: number;
  effectFlags: number;
  luck: number;

  constructor(data: GoodsEquipmentData) {
    super(data);
    this.mpMax = data.mpMax;
    this.hpMax = data.hpMax;
    this.defense = data.defense;
    this.attack = data.attack;
    this.spirit = data.spirit;
    this.agility = data.agility;
    this.effectFlags = data.effectFlags;
    this.luck = data.luck;
  }
}
