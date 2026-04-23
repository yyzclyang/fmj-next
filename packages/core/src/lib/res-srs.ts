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

export class ResSrs extends ResBase {
  frameNum = 0;
  imageNum = 0;
  startFrame = 0;
  endFrame = 0;
  private frameHeaders: SrsFrameHeader[] = [];
  private images: ResImage[] = [];
  private iteratorCount = 1;
  private showList: ActiveSrsFrame[] = [];

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.frameNum = buf[offset + 2] ?? 0;
    this.imageNum = buf[offset + 3] ?? 0;
    this.startFrame = buf[offset + 4] ?? 0;
    this.endFrame = buf[offset + 5] ?? 0;

    let cursor = offset + 6;
    this.frameHeaders = [];
    for (let i = 0; i < this.frameNum; i += 1) {
      this.frameHeaders.push({
        x: buf[cursor] ?? 0,
        y: buf[cursor + 1] ?? 0,
        show: buf[cursor + 2] ?? 0,
        nshow: buf[cursor + 3] ?? 0,
        imageIndex: buf[cursor + 4] ?? 0,
      });
      cursor += 5;
    }

    this.images = [];
    for (let i = 0; i < this.imageNum; i += 1) {
      const image = new ResImage();
      image.setData(buf, cursor);
      this.images.push(image);
      cursor += image.bytesCount;
    }
  }

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
