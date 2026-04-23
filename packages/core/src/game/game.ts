import { DatLib } from '@/lib/dat-lib';
import { Surface } from '@/rendering/surface';
import { type FrameBuffer, FRAME_HEIGHT, FRAME_WIDTH } from '@/rendering/frame-buffer';
import type { EngineHost } from '@/runtime/engine-host';
import { KeyCode } from '@/shared/key-code';
import { ScreenAnimation } from '@/views/screen-animation';
import { ScreenMainGame } from '@/views/screen-main-game';
import { ScreenMenu } from '@/views/screen-menu';
import { ScreenStack } from '@/views/screen-stack';
import { ScreenViewType } from '@/views/screen-view-type';
import { createInitialGameState, type GameState } from './game-state';

export class Game {
  readonly datLib: DatLib;
  state: GameState = createInitialGameState();
  mainScene: ScreenMainGame | null = null;
  private readonly surface = new Surface(FRAME_WIDTH, FRAME_HEIGHT);
  private readonly screenStack = new ScreenStack();
  private readonly host: EngineHost;

  constructor(host: EngineHost, datLibBuffer: Uint8Array) {
    this.host = host;
    void this.host;
    this.datLib = new DatLib(datLibBuffer);
  }

  get frameBuffer(): FrameBuffer {
    return this.surface.buffer;
  }

  start(): void {
    this.changeScreen(ScreenViewType.SCREEN_DEV_LOGO);
    this.draw();
  }

  update(delta: number): void {
    this.screenStack.update(delta);
  }

  draw(): void {
    this.screenStack.draw(this.surface);
  }

  keyDown(key: KeyCode): void {
    this.screenStack.keyDown(key);
  }

  keyUp(key: KeyCode): void {
    this.screenStack.keyUp(key);
  }

  startNewGame(): void {
    this.state = createInitialGameState();
    this.changeScreen(ScreenViewType.SCREEN_MAIN_GAME);
  }

  applyLoadedState(state: GameState): void {
    this.state = state;
    this.changeScreen(ScreenViewType.SCREEN_MAIN_GAME);
  }

  changeScreen(screenType: ScreenViewType): void {
    switch (screenType) {
      case ScreenViewType.SCREEN_DEV_LOGO:
        this.screenStack.changeScreen(new ScreenAnimation(this, screenType));
        return;
      case ScreenViewType.SCREEN_GAME_LOGO:
        this.screenStack.changeScreen(new ScreenAnimation(this, screenType));
        return;
      case ScreenViewType.SCREEN_GAME_FAIL:
        this.screenStack.changeScreen(new ScreenAnimation(this, screenType));
        return;
      case ScreenViewType.SCREEN_MENU:
        this.screenStack.changeScreen(new ScreenMenu(this));
        return;
      case ScreenViewType.SCREEN_MAIN_GAME:
        this.mainScene = new ScreenMainGame(this);
        this.screenStack.changeScreen(this.mainScene);
        return;
    }
  }
}
