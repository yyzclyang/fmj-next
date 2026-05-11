import { SCREEN_HEIGHT, SCREEN_WIDTH, type PixelBuffer } from '@fmj-next/core';

export class CanvasPresenter {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly imageData: ImageData;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create 2D canvas context');
    }

    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.imageData = ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  present(frameBuffer: PixelBuffer): void {
    this.imageData.data.set(frameBuffer);
    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
