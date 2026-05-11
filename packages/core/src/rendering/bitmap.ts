import type { PixelBuffer } from './pixel-buffer';

export class Bitmap {
  readonly width: number;
  readonly height: number;
  readonly pixels: PixelBuffer;

  constructor(width: number, height: number, pixels: PixelBuffer) {
    this.width = width;
    this.height = height;
    this.pixels = pixels;
  }

  copy(): Bitmap {
    return new Bitmap(this.width, this.height, this.pixels.slice());
  }

  static empty(): Bitmap {
    return new Bitmap(0, 0, new Uint8ClampedArray(0));
  }
}
