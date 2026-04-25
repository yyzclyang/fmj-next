import { ResBase } from '@/lib/res-base';
import type { BaseMagic } from './base-magic';

export interface MagicChainResourceProvider {
  getMagic(type: number, index: number): BaseMagic | null;
}

export class ResMagicChain extends ResBase {
  magicSum = 0;
  learnNum = 0;
  magics: Array<BaseMagic | null> = [];

  constructor(private readonly resources: MagicChainResourceProvider) {
    super();
  }

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.magicSum = buf[offset + 2] ?? 0;
    this.magics = [];

    let pointer = offset + 3;
    for (let i = 0; i < this.magicSum; i += 1) {
      const magicType = buf[pointer] ?? 0;
      const magicIndex = buf[pointer + 1] ?? 0;
      pointer += 2;
      const magic = this.resources.getMagic(magicType, magicIndex);
      this.magics.push(magic);
    }
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
