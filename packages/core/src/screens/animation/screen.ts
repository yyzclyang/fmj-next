import type { Game } from '@/game/game';
import { ResSrs } from '@/lib/res-srs';
import { ResourceType } from '@/lib/resource-utils';
import { Surface } from '@/rendering/surface';
import { COLOR_WHITE } from '@/rendering/color';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from '../base-screen';
import { ScreenViewType } from '../screen-view-type';

const STARTUP_WIDTH = 160;
const STARTUP_HEIGHT = 96;

interface ScreenAnimationDef {
  readonly resourceIndex: number;
  readonly nextScreen: ScreenViewType;
  readonly skippable: boolean;
}

const SCREEN_ANIMATION_DEFS: Partial<Record<ScreenViewType, ScreenAnimationDef>> = {
  [ScreenViewType.SCREEN_DEV_LOGO]: {
    resourceIndex: 247,
    nextScreen: ScreenViewType.SCREEN_GAME_LOGO,
    skippable: true,
  },
  [ScreenViewType.SCREEN_GAME_LOGO]: {
    resourceIndex: 248,
    nextScreen: ScreenViewType.SCREEN_MENU,
    skippable: true,
  },
  [ScreenViewType.SCREEN_GAME_FAIL]: {
    resourceIndex: 249,
    nextScreen: ScreenViewType.SCREEN_MENU,
    skippable: false,
  },
};

export class ScreenAnimation extends BaseScreen {
  private readonly animation: ResSrs;
  private readonly def: ScreenAnimationDef;

  constructor(game: Game, screenType: ScreenViewType) {
    super(game);
    const def = SCREEN_ANIMATION_DEFS[screenType];
    if (!def) {
      throw new Error(`ScreenAnimation does not support screen type ${screenType}`);
    }
    this.def = def;

    const resource = this.game.datLib.getRes(ResourceType.SRS, 1, this.def.resourceIndex);
    if (!(resource instanceof ResSrs)) {
      throw new Error(`Missing SRS animation 1:${this.def.resourceIndex}`);
    }

    this.animation = resource;
    this.animation.setIteratorNum(4);
    this.animation.start();
  }

  override update(delta: number): void {
    if (this.animation.update(delta)) return;
    this.game.changeScreen(this.def.nextScreen);
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const centerX = Math.floor((SCREEN_WIDTH - STARTUP_WIDTH) / 2);
    const centerY = Math.floor((SCREEN_HEIGHT - STARTUP_HEIGHT) / 2);
    this.animation.draw(surface, centerX, centerY);
  }

  override onKeyDown(key: KeyCode): void {
    if (key === KeyCode.Cancel && this.def.skippable) {
      this.game.changeScreen(ScreenViewType.SCREEN_MENU);
    }
  }
}
