import { ResBase } from '@/lib/res-base';
import type { BaseMagic } from './base-magic';

export interface ResMagicChainData {
  readonly type: number;
  readonly index: number;
  readonly magicSum: number;
  readonly learnNum: number;
  readonly magics: Array<BaseMagic | null>;
}

export class ResMagicChain extends ResBase {
  magicSum = 0;
  learnNum = 0;
  magics: Array<BaseMagic | null> = [];

  constructor(data: ResMagicChainData) {
    super();
    this.type = data.type;
    this.index = data.index;
    this.magicSum = data.magicSum;
    this.learnNum = data.learnNum;
    this.magics = data.magics;
  }

  getMagic(index: number): BaseMagic | null {
    return this.magics[index] ?? null;
  }

  getMagicCount(): number {
    return this.magics.length;
  }

  getAllLearntMagics(isMonster = false, reverse = false): BaseMagic[] {
    if (this.magics.length === 0 || this.magicSum === 0) return [];
    if (this.learnNum === 0 && isMonster) return [];

    const learnNum = this.learnNum === 0 ? this.magics.length : this.learnNum;
    const learntMagics = this.magics
      .slice(0, Math.min(learnNum, this.magicSum, this.magics.length))
      .filter((magic): magic is BaseMagic => magic != null);
    return reverse ? learntMagics.reverse() : learntMagics;
  }
}
