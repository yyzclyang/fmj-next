import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicEnhanceData extends BaseMagicData {
  readonly defensePercent: number;
  readonly attackPercent: number;
  readonly agilityPercent: number;
  readonly statusEffectRounds: number;
}

export class MagicEnhance extends BaseMagic {
  defensePercent: number;
  attackPercent: number;
  agilityPercent: number;
  statusEffectRounds: number;

  constructor(data: MagicEnhanceData) {
    super(data);
    this.defensePercent = data.defensePercent;
    this.attackPercent = data.attackPercent;
    this.agilityPercent = data.agilityPercent;
    this.statusEffectRounds = data.statusEffectRounds;
  }
}
