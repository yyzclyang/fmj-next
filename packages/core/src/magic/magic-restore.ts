import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicRestoreData extends BaseMagicData {
  readonly hp: number;
  readonly cureFlags: number;
}

export class MagicRestore extends BaseMagic {
  hp: number;
  cureFlags: number;

  constructor(data: MagicRestoreData) {
    super(data);
    this.hp = data.hp;
    this.cureFlags = data.cureFlags;
  }
}
