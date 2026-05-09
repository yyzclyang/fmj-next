import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicEnhanceData extends BaseMagicData {
  readonly defensePercent: number;
  readonly attackPercent: number;
  readonly agilityPercent: number;
  readonly statusRound: number;
}

export class MagicEnhance extends BaseMagic {
  defensePercent: number;
  attackPercent: number;
  agilityPercent: number;
  statusRound: number;

  constructor(data: MagicEnhanceData) {
    super(data);
    this.defensePercent = data.defensePercent;
    this.attackPercent = data.attackPercent;
    this.agilityPercent = data.agilityPercent;
    this.statusRound = data.statusRound;
  }
}
