import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicAttackData extends BaseMagicData {
  readonly hpEffect: number;
  readonly mpEffect: number;
  readonly defensePercent: number;
  readonly attackPercent: number;
  readonly statusEffectFlags: number;
  readonly statusEffectRounds: number;
  readonly agilityPercent: number;
}

export class MagicAttack extends BaseMagic {
  hpEffect: number;
  mpEffect: number;
  defensePercent: number;
  attackPercent: number;
  statusEffectFlags: number;
  statusEffectRounds: number;
  agilityPercent: number;

  constructor(data: MagicAttackData) {
    super(data);
    this.hpEffect = data.hpEffect;
    this.mpEffect = data.mpEffect;
    this.defensePercent = data.defensePercent;
    this.attackPercent = data.attackPercent;
    this.statusEffectFlags = data.statusEffectFlags;
    this.statusEffectRounds = data.statusEffectRounds;
    this.agilityPercent = data.agilityPercent;
  }
}
