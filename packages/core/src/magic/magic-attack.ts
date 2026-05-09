import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicAttackData extends BaseMagicData {
  readonly affectHp: number;
  readonly affectMp: number;
  readonly defensePercent: number;
  readonly attackPercent: number;
  readonly statusFlags: number;
  readonly agilityPercent: number;
}

export class MagicAttack extends BaseMagic {
  affectHp: number;
  affectMp: number;
  defensePercent: number;
  attackPercent: number;
  statusFlags: number;
  agilityPercent: number;

  constructor(data: MagicAttackData) {
    super(data);
    this.affectHp = data.affectHp;
    this.affectMp = data.affectMp;
    this.defensePercent = data.defensePercent;
    this.attackPercent = data.attackPercent;
    this.statusFlags = data.statusFlags;
    this.agilityPercent = data.agilityPercent;
  }
}
