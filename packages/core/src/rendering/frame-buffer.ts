import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import type { Color } from './color';

export const FRAME_WIDTH = SCREEN_WIDTH;
export const FRAME_HEIGHT = SCREEN_HEIGHT;
export const FRAME_CHANNELS = 4;
export const FRAME_BYTES = FRAME_WIDTH * FRAME_HEIGHT * FRAME_CHANNELS;

export type FrameBuffer = Uint8ClampedArray;

export function createFrameBuffer(): FrameBuffer {
  return new Uint8ClampedArray(FRAME_BYTES);
}

export function clearFrameBuffer(buffer: FrameBuffer, color: Color): void {
  const [r, g, b, a] = color;

  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = r;
    buffer[i + 1] = g;
    buffer[i + 2] = b;
    buffer[i + 3] = a;
  }
}

export function fillRect(buffer: FrameBuffer, x: number, y: number, width: number, height: number, color: Color): void {
  const [r, g, b, a] = color;

  for (let row = 0; row < height; row += 1) {
    const py = y + row;
    if (py < 0 || py >= FRAME_HEIGHT) continue;

    for (let col = 0; col < width; col += 1) {
      const px = x + col;
      if (px < 0 || px >= FRAME_WIDTH) continue;

      const offset = (py * FRAME_WIDTH + px) * 4;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
      buffer[offset + 3] = a;
    }
  }
}
