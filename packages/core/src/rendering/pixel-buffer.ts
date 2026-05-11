import type { Color } from './color';

export const PIXEL_CHANNELS = 4;

export type PixelBuffer = Uint8ClampedArray;

export function createPixelBuffer(width: number, height: number): PixelBuffer {
  return new Uint8ClampedArray(width * height * PIXEL_CHANNELS);
}

export function fillPixelBuffer(buffer: PixelBuffer, color: Color): void {
  const [r, g, b, a] = color;
  for (let i = 0; i < buffer.length; i += PIXEL_CHANNELS) {
    buffer[i] = r;
    buffer[i + 1] = g;
    buffer[i + 2] = b;
    buffer[i + 3] = a;
  }
}
