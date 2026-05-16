import { ResBase } from '@/lib/res-base';
import type { BaseMagic } from './base-magic';

export interface ResMagicChainData {
  readonly type: number;
  readonly index: number;
  readonly learnedMagicCount: number;
  readonly magics: Array<BaseMagic | null>;
}

export class ResMagicChain extends ResBase {
  learnedMagicCount = 0;
  magics: Array<BaseMagic | null> = [];

  constructor(data: ResMagicChainData) {
    super();
    this.type = data.type;
    this.index = data.index;
    this.learnedMagicCount = data.learnedMagicCount;
    this.magics = data.magics;
  }

  getMagic(index: number): BaseMagic | null {
    return this.magics[index] ?? null;
  }

  getMagicCount(): number {
    return this.magics.length;
  }

  getAllLearnedMagics(isMonster = false, reverse = false): BaseMagic[] {
    if (this.magics.length === 0) return [];
    if (this.learnedMagicCount === 0 && isMonster) return [];

    const learnedMagicCount = this.learnedMagicCount === 0 ? this.magics.length : this.learnedMagicCount;
    const learnedMagics = this.magics
      .slice(0, Math.min(learnedMagicCount, this.magics.length))
      .filter((magic): magic is BaseMagic => magic !== null);
    return reverse ? learnedMagics.reverse() : learnedMagics;
  }
}
