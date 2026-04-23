import { FRAME_HEIGHT, FRAME_WIDTH, type FrameBuffer } from '@fmj-next/core';

export class CanvasPresenter {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly imageData: ImageData;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create 2D canvas context');
    }

    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.imageData = ctx.createImageData(FRAME_WIDTH, FRAME_HEIGHT);
  }

  present(frameBuffer: FrameBuffer): void {
    this.imageData.data.set(frameBuffer);
    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
