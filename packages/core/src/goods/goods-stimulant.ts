import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsStimulantData extends BaseGoodsData {
  readonly defensePercent: number;
  readonly attackPercent: number;
  readonly agilityPercent: number;
  readonly forAll: boolean;
}

export class GoodsStimulant extends BaseGoods {
  defensePercent: number;
  attackPercent: number;
  agilityPercent: number;
  forAll: boolean;

  constructor(data: GoodsStimulantData) {
    super(data);
    this.defensePercent = data.defensePercent;
    this.attackPercent = data.attackPercent;
    this.agilityPercent = data.agilityPercent;
    this.forAll = data.forAll;
  }

  override effectAll(): boolean {
    return this.forAll;
  }
}
