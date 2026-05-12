import type { Game } from '@/game/game';
import type { ResSrs } from '@/lib/res-srs';
import type { Surface } from '@/rendering/surface';
import { COLOR_WHITE } from '@/rendering/color';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from '../base-screen';
import { ScreenViewType } from '../screen-view-type';
import { ScreenStartMenu } from '../start-menu/screen-start-menu';

interface SrsTransitionConfig {
  readonly srsIndex: number;
  readonly nextScreen: ScreenViewType;
  readonly skippable: boolean;
}

const SRS_TRANSITION_CONFIGS: Partial<Record<ScreenViewType, SrsTransitionConfig>> = {
  [ScreenViewType.DevLogo]: {
    srsIndex: 247,
    nextScreen: ScreenViewType.GameLogo,
    skippable: true,
  },
  [ScreenViewType.GameLogo]: {
    srsIndex: 248,
    nextScreen: ScreenViewType.StartMenu,
    skippable: true,
  },
  [ScreenViewType.GameFail]: {
    srsIndex: 249,
    nextScreen: ScreenViewType.StartMenu,
    skippable: false,
  },
};

export class ScreenSrsTransition extends BaseScreen {
  private readonly animation: ResSrs;
  private readonly config: SrsTransitionConfig;

  constructor(game: Game, screenType: ScreenViewType) {
    super(game);
    const config = SRS_TRANSITION_CONFIGS[screenType];
    if (!config) {
      throw new Error(`ScreenSrsTransition does not support screen type ${screenType}`);
    }
    this.config = config;

    const resource = this.game.datLib.getSrs(1, this.config.srsIndex);
    if (!resource) {
      throw new Error(`Missing SRS animation 1:${this.config.srsIndex}`);
    }

    this.animation = resource;
    this.animation.setIteratorNum(4);
    this.animation.start();
  }

  override update(delta: number): void {
    if (this.animation.update(delta)) return;
    this.transitionToScreen(this.config.nextScreen);
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const centerX = Math.floor((SCREEN_WIDTH - 160) /* 原始动画宽度 */ / 2);
    const centerY = Math.floor((SCREEN_HEIGHT - 96) /* 原始动画高度 */ / 2);
    this.animation.draw(surface, centerX, centerY);
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (key === KeyCode.Cancel && this.config.skippable) {
      this.transitionToScreen(ScreenViewType.StartMenu);
    }
    return undefined;
  }

  private transitionToScreen(screenType: ScreenViewType): void {
    this.game.mainScene = null;
    this.game.mainSceneRuntime = null;

    switch (screenType) {
      case ScreenViewType.DevLogo:
      case ScreenViewType.GameLogo:
      case ScreenViewType.GameFail:
        this.game.screenStack.replaceAll(new ScreenSrsTransition(this.game, screenType));
        return;
      case ScreenViewType.StartMenu:
        this.game.screenStack.replaceAll(new ScreenStartMenu(this.game));
        return;
      default:
        throw new Error(`ScreenSrsTransition cannot transition to screen type ${screenType}`);
    }
  }
}
