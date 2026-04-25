import { BaseMagic, type BaseMagicData } from './base-magic';

export interface MagicAuxiliaryData extends BaseMagicData {
  readonly hpPercent: number;
}

export class MagicAuxiliary extends BaseMagic {
  hpPercent: number;

  constructor(data: MagicAuxiliaryData) {
    super(data);
    this.hpPercent = data.hpPercent;
  }
}
