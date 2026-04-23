import type { Game } from '@/game/game';
import { ResSrs } from '@/lib/res-srs';
import { ResourceType } from '@/lib/resource-utils';
import { Surface } from '@/rendering/surface';
import { COLOR_WHITE } from '@/rendering/color';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from './base-screen';
import { ScreenViewType } from './screen-view-type';

const STARTUP_WIDTH = 160;
const STARTUP_HEIGHT = 96;

export class ScreenAnimation extends BaseScreen {
  private readonly animation: ResSrs;
  private readonly index: number;

  constructor(game: Game, index: number) {
    super(game);
    this.index = index;
    if (index !== 247 && index !== 248 && index !== 249) {
      throw new Error('ScreenAnimation index must be 247, 248, or 249');
    }

    const resource = this.game.datLib.getRes(ResourceType.SRS, 1, index);
    if (!(resource instanceof ResSrs)) {
      throw new Error(`Missing SRS animation 1:${index}`);
    }

    this.animation = resource;
    this.animation.setIteratorNum(4);
    this.animation.start();
  }

  override update(delta: number): void {
    if (this.animation.update(delta)) return;

    switch (this.index) {
      case 247:
        this.game.changeScreen(ScreenViewType.SCREEN_GAME_LOGO);
        return;
      case 248:
      case 249:
        this.game.changeScreen(ScreenViewType.SCREEN_MENU);
        return;
    }
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const centerX = Math.floor((SCREEN_WIDTH - STARTUP_WIDTH) / 2);
    const centerY = Math.floor((SCREEN_HEIGHT - STARTUP_HEIGHT) / 2);
    this.animation.draw(surface, centerX, centerY);
  }

  override onKeyDown(key: KeyCode): void {
    if (key === KeyCode.Cancel && (this.index === 247 || this.index === 248)) {
      this.game.changeScreen(ScreenViewType.SCREEN_MENU);
    }
  }
}
