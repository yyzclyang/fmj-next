import type { Game } from '@/game/game';
import { Surface } from '@/rendering/surface';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import { BaseScreen } from './base-screen';

export class ScreenMenu extends BaseScreen {
  constructor(game: Game) {
    super(game);
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    surface.fillRect(70, 32, 180, 128, COLOR_BLACK);
    surface.fillRect(72, 34, 176, 124, COLOR_WHITE);
    surface.fillRect(82, 48, 156, 18, COLOR_BLACK);
    surface.fillRect(90, 82, 140, 12, COLOR_BLACK);
    surface.fillRect(90, 104, 110, 12, COLOR_BLACK);
    surface.fillRect(90, 126, 126, 12, COLOR_BLACK);
  }
}
