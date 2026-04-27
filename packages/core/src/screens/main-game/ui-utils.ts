import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';

export const TIP_FRAME_WIDTH = 240;
export const TIP_TEXT_WIDTH = 224;
export const TIP_TEXT_PADDING_X = 8;
export const TIP_TEXT_TOP_PADDING = 2;
export const TIP_LINE_GAP = 16;
export const TIP_MAX_LINES = 4;

export function drawTipFrame(surface: Surface, left: number, top: number, height: number): void {
  surface.fillRect(left, top - 2, TIP_FRAME_WIDTH, height + 3, COLOR_BLACK);
  surface.fillRect(left + 1, top - 1, TIP_FRAME_WIDTH - 3, height - 3, COLOR_WHITE);
  surface.fillRect(left + TIP_FRAME_WIDTH - 2, top - 2, 2, 3, COLOR_WHITE);
  surface.fillRect(left, top + height - 2, 4, 2, COLOR_WHITE);
}

export function drawMenuFrame(surface: Surface, left: number, top: number, width: number, height: number): void {
  surface.fillRect(left, top, width, height, COLOR_WHITE);
  surface.fillRect(left + 1, top + 1, width - 2, 1, COLOR_BLACK);
  surface.fillRect(left + 1, top + height - 2, width - 2, 1, COLOR_BLACK);
  surface.fillRect(left + 1, top + 1, 1, height - 2, COLOR_BLACK);
  surface.fillRect(left + width - 2, top + 1, 1, height - 2, COLOR_BLACK);
}

export function getTextWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += getTextCharWidth(char);
  }
  return width;
}

export function wrapTextBlock(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const rawLines = text.split('\n');

  for (const line of rawLines) {
    const wrapped = wrapTextLine(line, maxWidth);
    if (wrapped.length === 0) {
      lines.push('');
      continue;
    }
    lines.push(...wrapped);
  }

  return lines;
}

function wrapTextLine(text: string, maxWidth: number): string[] {
  if (text.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  let width = 0;

  for (const char of text) {
    const charWidth = getTextCharWidth(char);
    if (current.length > 0 && width + charWidth > maxWidth) {
      lines.push(current);
      current = char;
      width = charWidth;
      continue;
    }

    current += char;
    width += charWidth;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function getTextCharWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  return code < 0x80 ? 8 : 16;
}
