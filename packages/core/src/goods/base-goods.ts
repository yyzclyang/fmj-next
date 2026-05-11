import { ResBase } from '@/lib/res-base';
import type { ResImage } from '@/lib/res-image';

export interface BaseGoodsData {
  readonly type: number;
  readonly index: number;
  readonly allowedPlayerFlags: number;
  readonly effectRounds: number;
  readonly image: ResImage | null;
  readonly name: string;
  readonly buyPrice: number;
  readonly sellPrice: number;
  readonly description: string;
  readonly eventId: number;
}

export abstract class BaseGoods extends ResBase {
  protected allowedPlayerFlags: number;
  effectRounds: number;
  image: ResImage | null;
  name: string;
  buyPrice: number;
  sellPrice: number;
  description: string;
  eventId: number;

  protected constructor(data: BaseGoodsData) {
    super();
    this.type = data.type;
    this.index = data.index;
    this.allowedPlayerFlags = data.allowedPlayerFlags;
    this.effectRounds = data.effectRounds;
    this.image = data.image;
    this.name = data.name;
    this.buyPrice = data.buyPrice;
    this.sellPrice = data.sellPrice;
    this.description = data.description;
    this.eventId = data.eventId;
  }

  canPlayerUse(playerId: number): boolean {
    return playerId >= 1 && playerId <= 4 && (this.allowedPlayerFlags & (1 << (playerId - 1))) !== 0;
  }

  affectsAllTargets(): boolean {
    return false;
  }
}
