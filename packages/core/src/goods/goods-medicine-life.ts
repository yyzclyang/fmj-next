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
    player.hp = (player.hp <= 0 ? 0 : player.hp) + Math.trunc((player.totalHpMax * this.percent) / 100);
    if (player.hp > player.totalHpMax) player.hp = player.totalHpMax;
    if (player.hp <= 0) player.hp = 1;
    if (player.mp > player.totalMpMax) player.mp = player.totalMpMax;
    return true;
  }
}
