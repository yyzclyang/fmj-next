import type { Player } from '@/characters';
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

  eat(player: Player): boolean {
    player.totalMaxMp += this.mpMax;
    player.totalMaxHp += this.hpMax;
    player.totalDefend += this.defend;
    player.totalAttack += this.attack;
    player.totalLingli += this.lingli;
    player.totalSpeed += this.speed;
    player.totalLuck += this.luck;
    player.maxMp = player.totalMaxMp;
    player.maxHp = player.totalMaxHp;
    player.defend = player.totalDefend;
    player.attack = player.totalAttack;
    player.lingli = player.totalLingli;
    player.speed = player.totalSpeed;
    player.luck = player.totalLuck;
    return true;
  }
}
