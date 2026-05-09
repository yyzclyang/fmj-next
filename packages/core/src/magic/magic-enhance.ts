import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicEnhanceData extends BaseMagicData {
  readonly defensePercent: number;
  readonly attackPercent: number;
  readonly agilityPercent: number;
  readonly buffRound: number;
}

export class MagicEnhance extends BaseMagic {
  defensePercent: number;
  attackPercent: number;
  agilityPercent: number;
  buffRound: number;

  constructor(data: MagicEnhanceData) {
    super(data);
    this.defensePercent = data.defensePercent;
    this.attackPercent = data.attackPercent;
    this.agilityPercent = data.agilityPercent;
    this.buffRound = data.buffRound;
  }
}
