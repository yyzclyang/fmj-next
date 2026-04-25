import { Bitmap } from '@/rendering/bitmap';
import { COLOR_BLACK, COLOR_TRANSPARENT, COLOR_WHITE, type Color } from '@/rendering/color';
import { ResImage, type ResImageData } from '../res-image';
import type { ResourceKey } from '../resource-utils';

export function parseImageResource(buffer: Uint8Array, offset: number, key?: ResourceKey): ResImage {
  return new ResImage(parseImageData(buffer, offset, key));
}

function parseImageData(buffer: Uint8Array, offset: number, key?: ResourceKey): ResImageData {
  const width = buffer[offset + 2] ?? 0;
  const height = buffer[offset + 3] ?? 0;
  const number = buffer[offset + 4] ?? 0;
  const storageType = buffer[offset + 5] ?? 0;
  const transparent = storageType === 2;

  if (width === 0 || height === 0 || number === 0 || storageType === 0) {
    return {
      type: key?.type ?? buffer[offset] ?? 0,
      index: key?.index ?? buffer[offset + 1] ?? 0,
      width,
      height,
      number,
      transparent,
      bytesCount: 6,
      bitmaps: [],
    };
  }

  const dataLength = getRowBytes(width) * height * number * storageType;
  const data = buffer.slice(offset + 6, offset + 6 + dataLength);

  return {
    type: key?.type ?? buffer[offset] ?? 0,
    index: key?.index ?? buffer[offset + 1] ?? 0,
    width,
    height,
    number,
    transparent,
    bytesCount: data.length + 6,
    bitmaps: decodeBitmaps(width, height, number, transparent, data),
  };
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
