import { fillRect as fillFrameRect, clearFrameBuffer, createFrameBuffer, type FrameBuffer } from './frame-buffer';
import type { Bitmap } from './bitmap';
import type { Color } from './color';

// Surface 是对帧缓冲区的绘制封装，core 内部只通过它操作像素。
export class Surface {
  readonly width: number;
  readonly height: number;
  readonly buffer: FrameBuffer;

  constructor(width: number, height: number, buffer: FrameBuffer = createFrameBuffer()) {
    this.width = width;
    this.height = height;
    this.buffer = buffer;
  }

  drawColor(color: Color): void {
    clearFrameBuffer(this.buffer, color);
  }

  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    fillFrameRect(this.buffer, x, y, width, height, color);
  }

  drawBitmap(bitmap: Bitmap, left: number, top: number): void {
    for (let y = 0; y < bitmap.height; y += 1) {
      const py = top + y;
      if (py < 0 || py >= this.height) continue;

      for (let x = 0; x < bitmap.width; x += 1) {
        const px = left + x;
        if (px < 0 || px >= this.width) continue;

        const srcOffset = (y * bitmap.width + x) * 4;
        const alpha = bitmap.pixels[srcOffset + 3];
        if (alpha === 0) continue;

        const dstOffset = (py * this.width + px) * 4;
        this.buffer[dstOffset] = bitmap.pixels[srcOffset];
        this.buffer[dstOffset + 1] = bitmap.pixels[srcOffset + 1];
        this.buffer[dstOffset + 2] = bitmap.pixels[srcOffset + 2];
        this.buffer[dstOffset + 3] = alpha;
      }
    }
  }
}
