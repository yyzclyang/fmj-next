import { Surface } from '@/rendering/surface';
import { ResBase } from './res-base';
import { ResImage } from './res-image';

export interface SrsFrameHeader {
  readonly x: number;
  readonly y: number;
  readonly show: number;
  readonly nshow: number;
  readonly imageIndex: number;
}

interface ActiveSrsFrame {
  index: number;
  show: number;
  nshow: number;
}

export interface ResSrsData {
  readonly type: number;
  readonly index: number;
  readonly frameNum: number;
  readonly imageNum: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameHeaders: SrsFrameHeader[];
  readonly images: ResImage[];
}

export class ResSrs extends ResBase {
  frameNum = 0;
  imageNum = 0;
  startFrame = 0;
  endFrame = 0;
  private frameHeaders: SrsFrameHeader[] = [];
  private images: ResImage[] = [];
  private iteratorCount = 1;
  private showList: ActiveSrsFrame[] = [];

  constructor(data?: ResSrsData) {
    super();
    if (!data) return;
    this.type = data.type;
    this.index = data.index;
    this.frameNum = data.frameNum;
    this.imageNum = data.imageNum;
    this.startFrame = data.startFrame;
    this.endFrame = data.endFrame;
    this.frameHeaders = data.frameHeaders;
    this.images = data.images;
  }

  // 动画资源由 DatLib 构造；保留空实现只是为了兼容 ResBase 体系。
  setData(): void {}

  start(): void {
    if (this.frameHeaders.length === 0) return;
    this.showList = [this.createFrame(0)];
  }

  update(delta: number): boolean {
    void delta;
    if (this.frameHeaders.length === 0) return false;

    for (let i = 0; i < this.iteratorCount; i += 1) {
      const nextFrames: ActiveSrsFrame[] = [];

      for (const frame of this.showList) {
        frame.show -= 1;
        frame.nshow -= 1;
        nextFrames.push(frame);

        if (frame.nshow === 0 && frame.index + 1 < this.frameHeaders.length) {
          nextFrames.push(this.createFrame(frame.index + 1));
        }
      }

      this.showList = nextFrames.filter(frame => frame.show > 0);
      if (this.showList.length === 0) {
        return false;
      }
    }

    return true;
  }

  draw(surface: Surface, dx: number, dy: number): void {
    for (const frame of this.showList) {
      const header = this.frameHeaders[frame.index];
      const image = this.images[header?.imageIndex ?? -1];
      if (!header || !image) continue;
      image.draw(surface, 1, dx + header.x, dy + header.y);
    }
  }

  // 战斗动画按 Kotlin 的绝对锚点绘制：首帧坐标只是资源内部原点。
  drawAbsolutely(surface: Surface, x: number, y: number): void {
    const base = this.frameHeaders[0];
    if (!base) return;

    for (const frame of this.showList) {
      const header = this.frameHeaders[frame.index];
      const image = this.images[header?.imageIndex ?? -1];
      if (!header || !image) continue;
      image.draw(surface, 1, header.x - base.x + x, header.y - base.y + y);
    }
  }

  setIteratorNum(count: number): void {
    this.iteratorCount = Math.max(1, count);
  }

  private createFrame(index: number): ActiveSrsFrame {
    const header = this.frameHeaders[index];
    return {
      index,
      show: header?.show ?? 0,
      nshow: header?.nshow ?? 0,
    };
  }
}
