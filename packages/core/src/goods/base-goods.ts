import { ResBase } from '@/lib/res-base';
import type { ResImage } from '@/lib/res-image';

export interface BaseGoodsData {
  readonly type: number;
  readonly index: number;
  readonly enable: number;
  readonly sumRound: number;
  readonly image: ResImage | null;
  readonly name: string;
  readonly buyPrice: number;
  readonly sellPrice: number;
  readonly description: string;
  readonly eventId: number;
}

export abstract class BaseGoods extends ResBase {
  protected enable: number;
  sumRound: number;
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
    this.enable = data.enable;
    this.sumRound = data.sumRound;
    this.image = data.image;
    this.name = data.name;
    this.buyPrice = data.buyPrice;
    this.sellPrice = data.sellPrice;
    this.description = data.description;
    this.eventId = data.eventId;
  }

  // 道具资源由 DatLib 构造；保留空实现只是为了兼容 ResBase 体系。
  setData(): void {}

  canPlayerUse(playerId: number): boolean {
    return playerId >= 1 && playerId <= 4 && (this.enable & (1 << (playerId - 1))) !== 0;
  }

  effectAll(): boolean {
    return false;
  }
}
