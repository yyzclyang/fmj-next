import { ResBase } from '@/lib/res-base';
import { readUint16 } from '@/lib/resource-utils';

const LEVEL_BYTES = 20;

export class ResLevelupChain extends ResBase {
  maxLevel = 0;
  private levelData = new Uint8Array();

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.maxLevel = buf[offset + 2] ?? 0;
    if (this.maxLevel <= 0) this.maxLevel = 99;

    const dataStart = offset + 4;
    const dataEnd = dataStart + this.maxLevel * LEVEL_BYTES;
    this.levelData = buf.slice(dataStart, Math.min(dataEnd, buf.length));
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
    const offset = (level - 1) * LEVEL_BYTES + fieldOffset;
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
