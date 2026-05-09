import type { FightingCharacter } from '@/characters';
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

  use(src: FightingCharacter, dst: FightingCharacter): boolean {
    if (src.mp < this.costMp) return false;
    src.mp -= this.costMp;
    if (dst.isAlive && this.hp > 0) {
      dst.hp = Math.min(dst.maxHp, dst.hp + this.hp);
    }
    if (dst.isAlive) {
      dst.activeStatuses.clearFlags(this.cureMask);
    }
    return true;
  }
}
