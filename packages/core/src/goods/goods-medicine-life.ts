import type { Player } from '@/characters';
import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsMedicineLifeData extends BaseGoodsData {
  readonly percent: number;
}

export class GoodsMedicineLife extends BaseGoods {
  percent: number;

  constructor(data: GoodsMedicineLifeData) {
    super(data);
    this.percent = data.percent;
  }

  eat(player: Player): boolean {
    const value = Math.trunc((player.maxHp * this.percent) / 100);
    player.hp = player.hp <= 0 ? value : player.hp + value;
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.hp <= 0) player.hp = 1;
    if (player.mp > player.maxMp) player.mp = player.maxMp;
    return true;
  }
}
