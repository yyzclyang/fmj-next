import type { Player } from '@/characters';
import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsMedicineChg4EverData extends BaseGoodsData {
  readonly mpMax: number;
  readonly hpMax: number;
  readonly defense: number;
  readonly attack: number;
  readonly spirit: number;
  readonly agility: number;
  readonly luck: number;
}

export class GoodsMedicineChg4Ever extends BaseGoods {
  mpMax: number;
  hpMax: number;
  defense: number;
  attack: number;
  spirit: number;
  agility: number;
  luck: number;

  constructor(data: GoodsMedicineChg4EverData) {
    super(data);
    this.mpMax = data.mpMax;
    this.hpMax = data.hpMax;
    this.defense = data.defense;
    this.attack = data.attack;
    this.spirit = data.spirit;
    this.agility = data.agility;
    this.luck = data.luck;
  }

  eat(player: Player): boolean {
    player.maxMp += this.mpMax;
    player.maxHp += this.hpMax;
    player.defense += this.defense;
    player.attack += this.attack;
    player.spirit += this.spirit;
    player.agility += this.agility;
    player.luck += this.luck;
    return true;
  }
}
