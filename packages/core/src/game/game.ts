import { DatLib } from '@/lib/dat-lib';
import { Surface } from '@/rendering/surface';
import { type FrameBuffer, FRAME_HEIGHT, FRAME_WIDTH } from '@/rendering/frame-buffer';
import type { EngineHost } from '@/runtime/engine-host';
import { ScriptVm } from '@/script/script-vm';
import { KeyCode } from '@/shared/key-code';
import { ScreenAnimation } from '@/views/screen-animation';
import { ScreenMainGame } from '@/views/screen-main-game';
import { ScreenMenu } from '@/views/screen-menu';
import { ScreenStack } from '@/views/screen-stack';
import { ScreenViewType } from '@/views/screen-view-type';
import { createInitialGameState, type GameState } from './game-state';

const STARTUP_CHAPTER_TYPE = 1;
const STARTUP_CHAPTER_INDEX = 1;

export class Game {
  readonly datLib: DatLib;
  readonly scriptVm = new ScriptVm(this);
  state: GameState = createInitialGameState();
  mainScene: ScreenMainGame | null = null;
  private readonly boxEventMap = new Map<string, number>();
  private pendingBoxEventKey: string | null = null;
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
    this.boxEventMap.clear();
    this.pendingBoxEventKey = null;
    this.state = createInitialGameState();
    this.changeScreen(ScreenViewType.SCREEN_MAIN_GAME);
    this.mainScene?.startChapter(STARTUP_CHAPTER_TYPE, STARTUP_CHAPTER_INDEX);
  }

  applyLoadedState(state: GameState): void {
    this.boxEventMap.clear();
    this.pendingBoxEventKey = null;
    this.state = state;
    this.changeScreen(ScreenViewType.SCREEN_MAIN_GAME);
    this.mainScene?.startChapter(this.state.scriptType, this.state.scriptIndex);
  }

  hasEvent(eventId: number): boolean {
    return this.state.eventFlags.includes(eventId);
  }

  setEvent(eventId: number): void {
    if (this.hasEvent(eventId)) return;
    this.state.eventFlags.push(eventId);
  }

  rememberBoxEvent(boxKey: string, eventId: number): void {
    if (this.boxEventMap.has(boxKey)) return;
    this.boxEventMap.set(boxKey, eventId);
  }

  isBoxCollected(boxKey: string): boolean {
    const eventId = this.boxEventMap.get(boxKey);
    return eventId != null && this.hasEvent(eventId);
  }

  setPendingBoxEvent(boxKey: string | null): void {
    this.pendingBoxEventKey = boxKey;
  }

  consumePendingBoxEvent(): string | null {
    const boxKey = this.pendingBoxEventKey;
    this.pendingBoxEventKey = null;
    return boxKey;
  }

  clearPendingBoxEvent(): void {
    this.pendingBoxEventKey = null;
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
