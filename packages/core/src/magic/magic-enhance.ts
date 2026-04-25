import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicEnhanceData extends BaseMagicData {
  readonly defendPercent: number;
  readonly attackPercent: number;
  readonly speedPercent: number;
  readonly buffRound: number;
}

export class MagicEnhance extends BaseMagic {
  defendPercent: number;
  attackPercent: number;
  speedPercent: number;
  buffRound: number;

  constructor(data: MagicEnhanceData) {
    super(data);
    this.defendPercent = data.defendPercent;
    this.attackPercent = data.attackPercent;
    this.speedPercent = data.speedPercent;
    this.buffRound = data.buffRound;
  }
}
