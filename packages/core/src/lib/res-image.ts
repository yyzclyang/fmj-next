import { Bitmap } from '@/rendering/bitmap';
import { COLOR_BLACK, COLOR_TRANSPARENT, COLOR_WHITE, type Color } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import { ResBase } from './res-base';
import { ResourceType, type ResourceKey } from './resource-utils';

export class ResImage extends ResBase {
  width = 0;
  height = 0;
  number = 0;
  transparent = false;
  private data = new Uint8Array(0);
  private bitmaps: Bitmap[] = [];

  get bytesCount(): number {
    return this.data.length + 6;
  }

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.width = buf[offset + 2] ?? 0;
    this.height = buf[offset + 3] ?? 0;
    this.number = buf[offset + 4] ?? 0;
    const storageType = buf[offset + 5] ?? 0;
    this.transparent = storageType === 2;

    if (this.width === 0 || this.height === 0 || this.number === 0 || storageType === 0) {
      this.data = new Uint8Array(0);
      this.bitmaps = [];
      return;
    }

    const len = getRowBytes(this.width) * this.height * this.number * storageType;
    this.data = buf.slice(offset + 6, offset + 6 + len);
    this.bitmaps = decodeBitmaps(this.width, this.height, this.number, this.transparent, this.data);
  }

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

export function decodeImageResource(buf: Uint8Array, offset: number, key: ResourceKey): ResImage {
  const image = new ResImage();
  image.setData(buf, offset);
  image.type = key.type;
  image.index = key.index;
  return image;
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

function getRowBytes(width: number): number {
  return Math.floor(width / 8) + (width % 8 === 0 ? 0 : 1);
}

function createBitmap(width: number, height: number): Bitmap {
  return new Bitmap(width, height, new Uint8ClampedArray(width * height * 4));
}

function setPixel(bitmap: Bitmap, x: number, y: number, color: Color): void {
  const offset = (y * bitmap.width + x) * 4;
  bitmap.pixels[offset] = color[0];
  bitmap.pixels[offset + 1] = color[1];
  bitmap.pixels[offset + 2] = color[2];
  bitmap.pixels[offset + 3] = color[3];
}

function decodeBitmaps(
  width: number,
  height: number,
  frameCount: number,
  transparent: boolean,
  data: Uint8Array
): Bitmap[] {
  const rowBytes = getRowBytes(width);
  const frameBytes = rowBytes * height * (transparent ? 2 : 1);
  const bitmaps: Bitmap[] = [];
  let cursor = 0;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const bitmap = createBitmap(width, height);
    let dataIndex = cursor;

    for (let y = 0; y < height; y += 1) {
      let bitOffset = 0;
      let byteValue = data[dataIndex] ?? 0;

      for (let x = 0; x < width; x += 1) {
        if (transparent) {
          const transparentBit = (byteValue << bitOffset) & 0x80;
          const colorBit = (byteValue << (bitOffset + 1)) & 0x80;
          const color = transparentBit !== 0 ? COLOR_TRANSPARENT : colorBit !== 0 ? COLOR_BLACK : COLOR_WHITE;
          setPixel(bitmap, x, y, color);
          bitOffset += 2;
        } else {
          const colorBit = (byteValue << bitOffset) & 0x80;
          setPixel(bitmap, x, y, colorBit !== 0 ? COLOR_BLACK : COLOR_WHITE);
          bitOffset += 1;
        }

        if (bitOffset >= 8) {
          bitOffset = 0;
          dataIndex += 1;
          byteValue = data[dataIndex] ?? 0;
        }
      }

      if (bitOffset !== 0) {
        dataIndex += 1;
      }

      if (transparent && (dataIndex - cursor) % 2 !== 0) {
        dataIndex += 1;
      }
    }

    cursor += frameBytes;
    bitmaps.push(bitmap);
  }

  return bitmaps;
}
