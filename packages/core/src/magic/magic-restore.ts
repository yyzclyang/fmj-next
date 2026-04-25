import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicRestoreData extends BaseMagicData {
  readonly hp: number;
  readonly cureMask: number;
}

export class MagicRestore extends BaseMagic {
  hp: number;
  cureMask: number;

  constructor(data: MagicRestoreData) {
    super(data);
    this.hp = data.hp;
    this.cureMask = data.cureMask;
  }
}
