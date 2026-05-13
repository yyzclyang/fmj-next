import type { Game } from '@/game/game';
import type { ResSrs } from '@/lib/res-srs';
import { COLOR_TRANSPARENT, COLOR_WHITE } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import { KeyCode } from '@/utils/key-code';
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
  private readonly frameSurface = new Surface(160 /* 动画原始宽度 */, 96 /* 动画原始高度 */);

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
    this.frameSurface.drawColor(COLOR_TRANSPARENT);
    this.animation.draw(this.frameSurface, 0, 0);
    surface.drawCenteredScaledSurface(this.frameSurface, 2);
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
