import { ResBase } from '@/lib/res-base';
import { readUint16 } from '@/lib/resource-utils';

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

  getMaxHp(level: number): number {
    return this.readLevelUint16(level, 0);
  }

  getHp(level: number): number {
    return this.readLevelUint16(level, 2);
  }

  getMaxMp(level: number): number {
    return this.readLevelUint16(level, 4);
  }

  getMp(level: number): number {
    return this.readLevelUint16(level, 6);
  }

  getAttack(level: number): number {
    return this.readLevelUint16(level, 8);
  }

  getDefend(level: number): number {
    return this.readLevelUint16(level, 10);
  }

  getNextLevelExp(level: number): number {
    if (level < 1 || level > this.maxLevel) return 0;
    const exp = this.readLevelUint16(level, 14);
    return exp > 0 ? exp : Math.trunc(100 * 1.5 ** level);
  }

  getSpeed(level: number): number {
    return this.readLevelByte(level, 16);
  }

  getLingli(level: number): number {
    return this.readLevelByte(level, 17);
  }

  getLuck(level: number): number {
    return this.readLevelByte(level, 18);
  }

  getLearnMagicCount(level: number): number {
    return this.readLevelByte(level, 19);
  }

  private getLevelOffset(level: number, fieldOffset: number): number | null {
    if (level < 1 || level > this.maxLevel) return null;
    const offset = (level - 1) * 20 /* 每级升级数据 20 字节。 */ + fieldOffset;
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
