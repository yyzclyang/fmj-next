import { COLOR_BLACK, COLOR_WHITE, type Color } from './color';
import { ASC16_BASE64, HZK16_BASE64 } from './font-data';
import type { Surface } from './surface';

// 文字渲染固定使用 16 点阵字库，ASCII 和汉字宽度不同。
const GLYPH_HEIGHT = 16;
const ASCII_WIDTH = 8;
const HZK_WIDTH = 16;
const HZK_BYTES_PER_GLYPH = 32;
const ASCII_BYTES_PER_GLYPH = 16;

// 运行时需要把 GBK 双字节编码映射到 HZK16 字库中的实际偏移。
const gbkDecoder = new TextDecoder('GBK');
const base64Table = createBase64Table();

// 字库数据和汉字偏移表在模块加载时一次性展开，运行时直接读取。
const asc16Buffer = decodeBase64(ASC16_BASE64);
const hzk16Buffer = decodeBase64(HZK16_BASE64);
const hzkOffsets = createHzkOffsets();

export class TextRender {
  static drawText(surface: Surface, text: string, left: number, top: number): void {
    drawText(surface, text, left, top, COLOR_BLACK, COLOR_WHITE);
  }

  static drawSelText(surface: Surface, text: string, left: number, top: number): void {
    drawText(surface, text, left, top, COLOR_WHITE, COLOR_BLACK);
  }

  static textHeightForWidth(text: string, width: number): number {
    if (text.length === 0) return 0;
    if (width <= 0) return GLYPH_HEIGHT;

    let height = GLYPH_HEIGHT;
    let lineWidth = 0;

    for (const char of text) {
      if (char === '\0') break;
      if (lineWidth >= width) {
        height += GLYPH_HEIGHT;
        lineWidth = 0;
      }
      lineWidth += getCharWidth(char);
    }

    return height;
  }
}

function drawText(surface: Surface, text: string, left: number, top: number, fgColor: Color, bgColor: Color): void {
  let x = left;

  for (const char of text) {
    if (char === '\0') break;

    const code = char.codePointAt(0);
    if (code == null) continue;

    if (code < 0x80) {
      drawGlyph(surface, asc16Buffer, code * ASCII_BYTES_PER_GLYPH, ASCII_WIDTH, x, top, fgColor, bgColor);
      x += ASCII_WIDTH;
      continue;
    }

    const offset = getHzkOffset(char);
    if (offset == null) {
      x += ASCII_WIDTH;
      continue;
    }

    drawGlyph(surface, hzk16Buffer, offset, HZK_WIDTH, x, top, fgColor, bgColor);
    x += HZK_WIDTH;
  }
}

function getCharWidth(char: string): number {
  const code = char.codePointAt(0);
  if (code == null) return ASCII_WIDTH;
  if (code < 0x80) return ASCII_WIDTH;
  return getHzkOffset(char) == null ? ASCII_WIDTH : HZK_WIDTH;
}

function drawGlyph(
  surface: Surface,
  data: Uint8Array,
  offset: number,
  width: number,
  left: number,
  top: number,
  fgColor: Color,
  bgColor: Color
): void {
  const bytesPerRow = width >> 3;

  for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
    const y = top + row;
    if (y < 0 || y >= surface.height) continue;

    const rowOffset = offset + row * bytesPerRow;

    for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex += 1) {
      const value = data[rowOffset + byteIndex] ?? 0;

      for (let bit = 0; bit < 8; bit += 1) {
        const x = left + byteIndex * 8 + bit;
        if (x < 0 || x >= surface.width) continue;

        const color = (value & (0x80 >> bit)) !== 0 ? fgColor : bgColor;
        setPixel(surface, x, y, color);
      }
    }
  }
}

function setPixel(surface: Surface, x: number, y: number, color: Color): void {
  const offset = (y * surface.width + x) * 4;
  surface.buffer[offset] = color[0];
  surface.buffer[offset + 1] = color[1];
  surface.buffer[offset + 2] = color[2];
  surface.buffer[offset + 3] = color[3];
}

function getHzkOffset(char: string): number | null {
  return hzkOffsets.get(char) ?? null;
}

function decodeBase64(base64: string): Uint8Array {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const length = (base64.length >> 2) * 3 - padding;
  const result = new Uint8Array(length);
  let out = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const c0 = readBase64(base64.charCodeAt(i));
    const c1 = readBase64(base64.charCodeAt(i + 1));
    const c2 = base64[i + 2] === '=' ? 0 : readBase64(base64.charCodeAt(i + 2));
    const c3 = base64[i + 3] === '=' ? 0 : readBase64(base64.charCodeAt(i + 3));
    const value = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;

    result[out] = (value >> 16) & 0xff;
    out += 1;

    if (base64[i + 2] !== '=') {
      result[out] = (value >> 8) & 0xff;
      out += 1;
    }

    if (base64[i + 3] !== '=') {
      result[out] = value & 0xff;
      out += 1;
    }
  }

  return result;
}

function createHzkOffsets(): Map<string, number> {
  const offsets = new Map<string, number>();
  let offset = 0;

  for (let high = 0xa1; high <= 0xfe; high += 1) {
    for (let low = 0xa1; low <= 0xfe; low += 1) {
      const value = gbkDecoder.decode(new Uint8Array([high, low]));
      if (value.length === 1 && value !== '\ufffd' && !offsets.has(value)) {
        offsets.set(value, offset);
      }
      offset += HZK_BYTES_PER_GLYPH;
    }
  }

  return offsets;
}

function createBase64Table(): Uint8Array {
  const table = new Uint8Array(123);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  for (let i = 0; i < chars.length; i += 1) {
    table[chars.charCodeAt(i)] = i;
  }

  return table;
}

function readBase64(code: number): number {
  return base64Table[code] ?? 0;
}
