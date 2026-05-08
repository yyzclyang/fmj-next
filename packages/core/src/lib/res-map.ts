import { ResBase } from './res-base';

export interface ResMapData {
  readonly type: number;
  readonly index: number;
  readonly tilIndex: number;
  readonly mapName: string;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly data: Uint8Array;
}

export class ResMap extends ResBase {
  tilIndex = 0;
  mapName = '';
  mapWidth = 0;
  mapHeight = 0;
  private data: Uint8Array = new Uint8Array(0);

  constructor(data?: ResMapData) {
    super();
    if (!data) return;
    this.type = data.type;
    this.index = data.index;
    this.tilIndex = data.tilIndex;
    this.mapName = data.mapName;
    this.mapWidth = data.mapWidth;
    this.mapHeight = data.mapHeight;
    this.data = data.data;
  }

  canWalk(x: number, y: number): boolean {
    const index = this.getCellOffset(x, y);
    if (index < 0) return false;
    return (this.data[index] ?? 0) >= 0x80;
  }

  canPlayerWalk(x: number, y: number): boolean {
    return (
      this.canWalk(x, y) &&
      x >= 4 /* 左侧保留 4 格。 */ &&
      x < this.mapWidth - 4 /* 右侧保留 4 格。 */ &&
      y >= 3 /* 顶部保留 3 格。 */ &&
      y < this.mapHeight - 2 /* 底部保留 2 格。 */
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
