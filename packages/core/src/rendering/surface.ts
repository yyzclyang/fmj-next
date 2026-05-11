import type { Bitmap } from './bitmap';
import type { Color } from './color';
import { createPixelBuffer, fillPixelBuffer, PIXEL_CHANNELS, type PixelBuffer } from './pixel-buffer';

// Surface 表示一块可绘制的像素平面，core 内部只通过它操作像素。
export class Surface {
  readonly width: number;
  readonly height: number;
  readonly buffer: PixelBuffer;

  constructor(width: number, height: number, buffer: PixelBuffer = createPixelBuffer(width, height)) {
    this.width = width;
    this.height = height;
    this.buffer = buffer;
  }

  drawColor(color: Color): void {
    fillPixelBuffer(this.buffer, color);
  }

  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    const left = Math.max(0, x);
    const top = Math.max(0, y);
    const right = Math.min(this.width, x + width);
    const bottom = Math.min(this.height, y + height);
    if (left >= right || top >= bottom) return;

    const [r, g, b, a] = color;
    for (let py = top; py < bottom; py += 1) {
      for (let px = left; px < right; px += 1) {
        const offset = (py * this.width + px) * PIXEL_CHANNELS;
        this.buffer[offset] = r;
        this.buffer[offset + 1] = g;
        this.buffer[offset + 2] = b;
        this.buffer[offset + 3] = a;
      }
    }
  }

  strokeRect(x: number, y: number, width: number, height: number, color: Color): void {
    if (width <= 0 || height <= 0) return;
    this.fillRect(x, y, width, 1, color);
    this.fillRect(x, y + height - 1, width, 1, color);
    this.fillRect(x, y, 1, height, color);
    this.fillRect(x + width - 1, y, 1, height, color);
  }

  drawBitmap(bitmap: Bitmap, left: number, top: number): void {
    const startX = Math.max(0, -left);
    const startY = Math.max(0, -top);
    const endX = Math.min(bitmap.width, this.width - left);
    const endY = Math.min(bitmap.height, this.height - top);
    if (startX >= endX || startY >= endY) return;

    for (let y = startY; y < endY; y += 1) {
      const py = top + y;

      for (let x = startX; x < endX; x += 1) {
        const px = left + x;

        const srcOffset = (y * bitmap.width + x) * PIXEL_CHANNELS;
        const alpha = bitmap.pixels[srcOffset + 3];
        if (alpha === 0) continue;

        const dstOffset = (py * this.width + px) * PIXEL_CHANNELS;
        this.buffer[dstOffset] = bitmap.pixels[srcOffset];
        this.buffer[dstOffset + 1] = bitmap.pixels[srcOffset + 1];
        this.buffer[dstOffset + 2] = bitmap.pixels[srcOffset + 2];
        this.buffer[dstOffset + 3] = alpha;
      }
    }
  }
}
