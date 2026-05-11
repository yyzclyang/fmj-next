import { BaseGoods, type BaseGoodsData } from './base-goods';

export interface GoodsStimulantData extends BaseGoodsData {
  readonly defensePercent: number;
  readonly attackPercent: number;
  readonly agilityPercent: number;
  readonly targetAll: boolean;
}

export class GoodsStimulant extends BaseGoods {
  defensePercent: number;
  attackPercent: number;
  agilityPercent: number;
  targetAll: boolean;

  constructor(data: GoodsStimulantData) {
    super(data);
    this.defensePercent = data.defensePercent;
    this.attackPercent = data.attackPercent;
    this.agilityPercent = data.agilityPercent;
    this.targetAll = data.targetAll;
  }

  override affectsAllTargets(): boolean {
    return this.targetAll;
  }
}
