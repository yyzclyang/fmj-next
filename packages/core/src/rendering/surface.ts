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

  drawScaledBitmap(bitmap: Bitmap, left: number, top: number, scale: number): void {
    if (scale <= 1) {
      this.drawBitmap(bitmap, left, top);
      return;
    }
    this.drawScaledPixels(bitmap.pixels, bitmap.width, bitmap.height, left, top, scale);
  }

  drawCenteredScaledSurface(source: Surface, scale: number): void {
    const left = Math.floor((this.width - source.width * scale) / 2);
    const top = Math.floor((this.height - source.height * scale) / 2);
    this.drawScaledSurface(source, left, top, scale);
  }

  drawScaledSurface(source: Surface, left: number, top: number, scale: number): void {
    this.drawScaledPixels(source.buffer, source.width, source.height, left, top, scale);
  }

  private drawScaledPixels(
    source: PixelBuffer,
    sourceWidth: number,
    sourceHeight: number,
    left: number,
    top: number,
    scale: number
  ): void {
    for (let sy = 0; sy < sourceHeight; sy += 1) {
      for (let sx = 0; sx < sourceWidth; sx += 1) {
        const srcOffset = (sy * sourceWidth + sx) * PIXEL_CHANNELS;
        const alpha = source[srcOffset + 3];
        if (alpha === 0) continue;
        this.drawScaledPixel(source, srcOffset, left + sx * scale, top + sy * scale, scale);
      }
    }
  }

  private drawScaledPixel(source: PixelBuffer, srcOffset: number, left: number, top: number, scale: number): void {
    for (let y = 0; y < scale; y += 1) {
      const py = top + y;
      if (py < 0 || py >= this.height) continue;
      for (let x = 0; x < scale; x += 1) {
        const px = left + x;
        if (px < 0 || px >= this.width) continue;
        const dstOffset = (py * this.width + px) * PIXEL_CHANNELS;
        this.buffer[dstOffset] = source[srcOffset];
        this.buffer[dstOffset + 1] = source[srcOffset + 1];
        this.buffer[dstOffset + 2] = source[srcOffset + 2];
        this.buffer[dstOffset + 3] = source[srcOffset + 3];
      }
    }
  }
}
