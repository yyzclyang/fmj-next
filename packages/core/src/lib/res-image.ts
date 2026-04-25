import type { Bitmap } from '@/rendering/bitmap';
import { Surface } from '@/rendering/surface';
import { ResBase } from './res-base';
import { ResourceType } from './resource-utils';

export interface ResImageData {
  readonly type: number;
  readonly index: number;
  readonly width: number;
  readonly height: number;
  readonly number: number;
  readonly transparent: boolean;
  readonly bytesCount: number;
  readonly bitmaps: Bitmap[];
}

export class ResImage extends ResBase {
  width = 0;
  height = 0;
  number = 0;
  transparent = false;
  private resourceBytesCount = 6;
  private bitmaps: Bitmap[] = [];

  constructor(data?: ResImageData) {
    super();
    if (!data) return;
    this.type = data.type;
    this.index = data.index;
    this.width = data.width;
    this.height = data.height;
    this.number = data.number;
    this.transparent = data.transparent;
    this.resourceBytesCount = data.bytesCount;
    this.bitmaps = data.bitmaps;
  }

  get bytesCount(): number {
    return this.resourceBytesCount;
  }

  // 图片资源由 DatLib 构造；保留空实现只是为了兼容 ResBase 体系。
  setData(): void {}

  getBitmap(index: number): Bitmap | null {
    const bitmap = this.bitmaps[index] ?? null;
    return bitmap?.copy() ?? null;
  }

  draw(surface: Surface, num: number, left: number, top: number): void {
    const bitmap = this.bitmaps[num - 1] ?? null;
    if (!bitmap) return;
    surface.drawBitmap(bitmap, left, top);
  }
}

export function isImageResourceType(resType: ResourceType): boolean {
  return (
    resType === ResourceType.TIL ||
    resType === ResourceType.ACP ||
    resType === ResourceType.GDP ||
    resType === ResourceType.GGJ ||
    resType === ResourceType.PIC
  );
}
