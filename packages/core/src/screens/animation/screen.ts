import type { Game } from '@/game/game';
import type { ResSrs } from '@/lib/res-srs';
import { Surface } from '@/rendering/surface';
import { COLOR_WHITE } from '@/rendering/color';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from '../base-screen';
import { ScreenViewType } from '../screen-view-type';
import { ScreenMenu } from '../menu/screen';

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

    const resource = this.game.datLib.getSrs(1, this.def.resourceIndex);
    if (!resource) {
      throw new Error(`Missing SRS animation 1:${this.def.resourceIndex}`);
    }

    this.animation = resource;
    this.animation.setIteratorNum(4);
    this.animation.start();
  }

  override update(delta: number): void {
    if (this.animation.update(delta)) return;
    this.replaceWithScreen(this.def.nextScreen);
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const centerX = Math.floor((SCREEN_WIDTH - 160 /* 启动画面宽度。 */) / 2);
    const centerY = Math.floor((SCREEN_HEIGHT - 96 /* 启动画面高度。 */) / 2);
    this.animation.draw(surface, centerX, centerY);
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (key === KeyCode.Cancel && this.def.skippable) {
      this.replaceWithScreen(ScreenViewType.SCREEN_MENU);
    }
    return undefined;
  }

  private replaceWithScreen(screenType: ScreenViewType): void {
    this.game.mainScene = null;
    this.game.mainSceneRuntime = null;

    switch (screenType) {
      case ScreenViewType.SCREEN_DEV_LOGO:
      case ScreenViewType.SCREEN_GAME_LOGO:
      case ScreenViewType.SCREEN_GAME_FAIL:
        this.game.screenStack.replaceAll(new ScreenAnimation(this.game, screenType));
        return;
      case ScreenViewType.SCREEN_MENU:
        this.game.screenStack.replaceAll(new ScreenMenu(this.game));
        return;
      default:
        throw new Error(`ScreenAnimation cannot transition to screen type ${screenType}`);
    }
  }
}
