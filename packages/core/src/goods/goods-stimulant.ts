import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsStimulantData extends BaseGoodsData {
  readonly defendPercent: number;
  readonly attackPercent: number;
  readonly speedPercent: number;
  readonly forAll: boolean;
}

export class GoodsStimulant extends BaseGoods {
  defendPercent: number;
  attackPercent: number;
  speedPercent: number;
  forAll: boolean;

  constructor(data: GoodsStimulantData) {
    super(data);
    this.defendPercent = data.defendPercent;
    this.attackPercent = data.attackPercent;
    this.speedPercent = data.speedPercent;
    this.forAll = data.forAll;
  }

  override effectAll(): boolean {
    return this.forAll;
  }
}
