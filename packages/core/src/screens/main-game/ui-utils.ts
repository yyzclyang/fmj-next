import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';

export const TIP_FRAME_WIDTH = 240;
export const TIP_TEXT_WIDTH = 224;
export const TIP_TEXT_PADDING_X = 8;
export const TIP_TEXT_TOP_PADDING = 2;
export const TIP_LINE_GAP = 16;
export const TIP_MAX_LINES = 4;

export function drawTipPanel(surface: Surface, left: number, top: number, height: number): void {
  surface.fillRect(left, top - 2, TIP_FRAME_WIDTH, height + 3, COLOR_BLACK);
  surface.fillRect(left + 1, top - 1, TIP_FRAME_WIDTH - 3, height - 3, COLOR_WHITE);
  surface.fillRect(left + TIP_FRAME_WIDTH - 2, top - 2, 2, 3, COLOR_WHITE);
  surface.fillRect(left, top + height - 2, 4, 2, COLOR_WHITE);
}
