import { ResBase } from './res-base';
import { readGbkString } from './resource-utils';

const PLAYER_WALK_MARGIN_LEFT = 4;
const PLAYER_WALK_MARGIN_RIGHT = 4;
const PLAYER_WALK_MARGIN_TOP = 3;
const PLAYER_WALK_MARGIN_BOTTOM = 2;

export class ResMap extends ResBase {
  tilIndex = 0;
  mapName = '';
  mapWidth = 0;
  mapHeight = 0;
  private data = new Uint8Array(0);

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.tilIndex = buf[offset + 2] ?? 0;
    this.mapName = readGbkString(buf, offset + 3);
    this.mapWidth = buf[offset + 0x10] ?? 0;
    this.mapHeight = buf[offset + 0x11] ?? 0;

    const length = this.mapWidth * this.mapHeight * 2;
    this.data = buf.slice(offset + 0x12, offset + 0x12 + length);
  }

  canWalk(x: number, y: number): boolean {
    const index = this.getCellOffset(x, y);
    if (index < 0) return false;
    return (this.data[index] ?? 0) >= 0x80;
  }

  canPlayerWalk(x: number, y: number): boolean {
    return (
      this.canWalk(x, y) &&
      x >= PLAYER_WALK_MARGIN_LEFT &&
      x < this.mapWidth - PLAYER_WALK_MARGIN_RIGHT &&
      y >= PLAYER_WALK_MARGIN_TOP &&
      y < this.mapHeight - PLAYER_WALK_MARGIN_BOTTOM
    );
  }

  getEventNum(x: number, y: number): number {
    const index = this.getCellOffset(x, y);
    if (index < 0) return -1;
    return this.data[index + 1] ?? 0;
  }

  getTileIndex(x: number, y: number): number {
    const index = this.getCellOffset(x, y);
    if (index < 0) return -1;
    return (this.data[index] ?? 0) & 0x7f;
  }

  private getCellOffset(x: number, y: number): number {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
      return -1;
    }
    return (y * this.mapWidth + x) * 2;
  }
}
