import type { BaseGoods } from '@/goods';
import { FightingCharacter, type FightingCharacterData } from './fighting-character';

export interface CarryGoods {
  readonly goods: BaseGoods;
  count: number;
}

export interface MonsterData extends FightingCharacterData {
  readonly iq: number;
  readonly money: number;
  readonly exp: number;
  readonly stealGoods: CarryGoods | null;
  readonly dropGoods: CarryGoods | null;
}

export class Monster extends FightingCharacter {
  iq: number;
  money: number;
  exp: number;
  stealGoods: CarryGoods | null;
  dropGoods: CarryGoods | null;

  constructor(data: MonsterData) {
    super(data);
    this.iq = data.iq;
    this.money = data.money;
    this.exp = data.exp;
    this.stealGoods = data.stealGoods;
    this.dropGoods = data.dropGoods;
  }
}
