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
}
