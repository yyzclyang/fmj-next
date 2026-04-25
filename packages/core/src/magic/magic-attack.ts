import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicAttackData extends BaseMagicData {
  readonly affectHp: number;
  readonly affectMp: number;
  readonly defendPercent: number;
  readonly attackPercent: number;
  readonly buffMask: number;
  readonly speedPercent: number;
}

export class MagicAttack extends BaseMagic {
  affectHp: number;
  affectMp: number;
  defendPercent: number;
  attackPercent: number;
  buffMask: number;
  speedPercent: number;

  constructor(data: MagicAttackData) {
    super(data);
    this.affectHp = data.affectHp;
    this.affectMp = data.affectMp;
    this.defendPercent = data.defendPercent;
    this.attackPercent = data.attackPercent;
    this.buffMask = data.buffMask;
    this.speedPercent = data.speedPercent;
  }
}
