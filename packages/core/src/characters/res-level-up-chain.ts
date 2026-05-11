import { ResBase } from '@/lib/res-base';
import { readUint16 } from '@/lib/resource-utils';

export const LEVEL_UP_RECORD_SIZE = 20;
const LevelUpFieldOffset = {
  HpMax: 0,
  Hp: 2,
  MpMax: 4,
  Mp: 6,
  Attack: 8,
  Defense: 10,
  NextLevelExp: 14,
  Agility: 16,
  Spirit: 17,
  Luck: 18,
  LearnMagicCount: 19,
} as const;

export interface ResLevelUpChainData {
  readonly type: number;
  readonly index: number;
  readonly maxLevel: number;
  readonly levelData: Uint8Array;
}

export class ResLevelUpChain extends ResBase {
  maxLevel: number;
  private levelData: Uint8Array;

  constructor(data: ResLevelUpChainData) {
    super();
    this.type = data.type;
    this.index = data.index;
    this.maxLevel = data.maxLevel;
    this.levelData = data.levelData;
  }

  getHpMax(level: number): number {
    return this.readLevelUint16(level, LevelUpFieldOffset.HpMax);
  }

  getHp(level: number): number {
    return this.readLevelUint16(level, LevelUpFieldOffset.Hp);
  }

  getMpMax(level: number): number {
    return this.readLevelUint16(level, LevelUpFieldOffset.MpMax);
  }

  getMp(level: number): number {
    return this.readLevelUint16(level, LevelUpFieldOffset.Mp);
  }

  getAttack(level: number): number {
    return this.readLevelUint16(level, LevelUpFieldOffset.Attack);
  }

  getDefense(level: number): number {
    return this.readLevelUint16(level, LevelUpFieldOffset.Defense);
  }

  getNextLevelExp(level: number): number {
    if (level < 1 || level > this.maxLevel) return 0;
    const exp = this.readLevelUint16(level, LevelUpFieldOffset.NextLevelExp);
    return exp > 0 ? exp : Math.trunc(100 * 1.5 ** level);
  }

  getAgility(level: number): number {
    return this.readLevelByte(level, LevelUpFieldOffset.Agility);
  }

  getSpirit(level: number): number {
    return this.readLevelByte(level, LevelUpFieldOffset.Spirit);
  }

  getLuck(level: number): number {
    return this.readLevelByte(level, LevelUpFieldOffset.Luck);
  }

  getLearnMagicCount(level: number): number {
    return this.readLevelByte(level, LevelUpFieldOffset.LearnMagicCount);
  }

  private getLevelOffset(level: number, fieldOffset: number): number | null {
    if (level < 1 || level > this.maxLevel) return null;
    const offset = (level - 1) * LEVEL_UP_RECORD_SIZE + fieldOffset;
    return offset < this.levelData.length ? offset : null;
  }

  private readLevelUint16(level: number, fieldOffset: number): number {
    const offset = this.getLevelOffset(level, fieldOffset);
    if (offset == null || offset + 1 >= this.levelData.length) return 0;
    return readUint16(this.levelData, offset);
  }

  private readLevelByte(level: number, fieldOffset: number): number {
    const offset = this.getLevelOffset(level, fieldOffset);
    return offset == null ? 0 : (this.levelData[offset] ?? 0);
  }
}
