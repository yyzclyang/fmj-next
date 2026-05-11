import type { Player } from '@/characters';
import { STATUS_FLAG_ATTACK_ALL } from '@/characters/status';
import type { ResSrs } from '@/lib/res-srs';
import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsMedicineData extends BaseGoodsData {
  readonly hp: number;
  readonly mp: number;
  readonly animation: ResSrs | null;
  readonly effectFlags: number;
}

export class GoodsMedicine extends BaseGoods {
  hp: number;
  mp: number;
  animation: ResSrs | null;
  effectFlags: number;

  constructor(data: GoodsMedicineData) {
    super(data);
    this.hp = data.hp;
    this.mp = data.mp;
    this.animation = data.animation;
    this.effectFlags = data.effectFlags;
  }

  override affectsAllTargets(): boolean {
    return (this.effectFlags & STATUS_FLAG_ATTACK_ALL) !== 0;
  }

  eat(player: Player): boolean {
    if (!player.isAlive) return false;
    player.hp = Math.min(player.hpMax, player.hp + this.hp);
    player.mp = Math.min(player.mpMax, player.mp + this.mp);
    player.activeStatuses.clearFlags(this.effectFlags);
    return true;
  }
}
