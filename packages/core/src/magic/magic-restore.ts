import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicRestoreData extends BaseMagicData {
  readonly hp: number;
  // 原版 C 的恢复型未使用该字段，这里将通用 mp 槽位扩展为恢复 mp。
  readonly mp: number;
  readonly cureFlags: number;
}

export class MagicRestore extends BaseMagic {
  hp: number;
  mp: number;
  cureFlags: number;

  constructor(data: MagicRestoreData) {
    super(data);
    this.hp = data.hp;
    this.mp = data.mp;
    this.cureFlags = data.cureFlags;
  }
}
