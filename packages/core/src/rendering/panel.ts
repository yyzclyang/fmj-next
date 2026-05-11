import { COLOR_BLACK, COLOR_WHITE } from './color';
import type { Surface } from './surface';

export function drawInsetPanel(surface: Surface, left: number, top: number, width: number, height: number): void {
  surface.fillRect(left, top, width, height, COLOR_WHITE);
  surface.strokeRect(left + 1, top + 1, width - 2, height - 2, COLOR_BLACK);
}
