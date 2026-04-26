import { DatLib } from '@/lib/dat-lib';
import { BaseGoods } from '@/goods';
import { GoodsBag } from '@/goods/goods-bag';
import { Surface } from '@/rendering/surface';
import { type FrameBuffer, FRAME_HEIGHT, FRAME_WIDTH } from '@/rendering/frame-buffer';
import type { EngineHost } from '@/runtime/engine-host';
import { MainSceneRuntime } from '@/screens/main-game/runtime';
import { ScriptVm } from '@/script/script-vm';
import { KeyCode } from '@/shared/key-code';
import { ScreenMainGame } from '@/screens/main-game/screen';
import { ScreenAnimation } from '@/screens/animation/screen';
import { ScreenMenu } from '@/screens/menu/screen';
import { ScreenStack } from '@/screens/screen-stack';
import { ScreenViewType } from '@/screens/screen-view-type';
import {
  cloneGameState,
  createInitialGameState,
  SCRIPT_LOCAL_VARIABLE_END,
  SCRIPT_LOCAL_VARIABLE_START,
  SCRIPT_VARIABLE_COUNT,
  type GameState,
} from './game-state';

const STARTUP_CHAPTER_TYPE = 1;
const STARTUP_CHAPTER_INDEX = 1;

export class Game {
  readonly datLib: DatLib;
  readonly scriptVm = new ScriptVm(this);
  state: GameState = createInitialGameState();
  mainScene: ScreenMainGame | null = null;
  mainSceneRuntime: MainSceneRuntime | null = null;
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

  get bag(): GoodsBag {
    return new GoodsBag(this.state.goods, this.datLib);
  }

  getStateSnapshot(): GameState {
    return cloneGameState(this.state);
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
    this.mainSceneRuntime?.startChapter(STARTUP_CHAPTER_TYPE, STARTUP_CHAPTER_INDEX);
  }

  applyLoadedState(state: GameState): void {
    this.boxEventMap.clear();
    this.pendingBoxEventKey = null;
    this.state = {
      ...createInitialGameState(),
      ...state,
      eventFlags: [...state.eventFlags],
      scriptVariables: [...(state.scriptVariables ?? [])],
      collectedBoxKeys: [...state.collectedBoxKeys],
      goods: state.goods.map(g => ({ ...g })),
    };
    this.ensureScriptVariableSize();
    this.changeScreen(ScreenViewType.SCREEN_MAIN_GAME);
    this.mainSceneRuntime?.startChapter(this.state.scriptType, this.state.scriptIndex);
  }

  gainGoods(type: number, index: number, count = 1): BaseGoods | null {
    const goods = this.bag.addGoods(type, index, count);
    if (goods) {
      this.mainScene?.showTip(`获得:${goods.name}`);
    }
    return goods;
  }

  deleteGoods(type: number, index: number): boolean {
    return this.bag.deleteGoods(type, index);
  }

  useGoodsNum(type: number, index: number, count: number): boolean {
    return this.bag.useGoodsNum(type, index, count);
  }

  getGoodsNum(type: number, index: number): number {
    return this.bag.getGoodsNum(type, index);
  }

  gainMoney(value: number): void {
    this.state.money += value;
    this.mainScene?.showTip(`获得金钱:${value}`);
  }

  setMoney(value: number): void {
    this.state.money = value;
  }

  useMoney(value: number): void {
    this.state.money -= value;
  }

  playMusic(type: number, index: number): void {
    this.host.audio.playMusic(`${type}:${index}`);
  }

  hasEvent(eventId: number): boolean {
    return this.state.eventFlags.includes(eventId);
  }

  setEvent(eventId: number): void {
    if (this.hasEvent(eventId)) return;
    this.state.eventFlags.push(eventId);
  }

  clearEvent(eventId: number): void {
    this.state.eventFlags = this.state.eventFlags.filter(id => id !== eventId);
  }

  getVariable(index: number): number {
    return this.state.scriptVariables[index] ?? 0;
  }

  setVariable(index: number, value: number): void {
    if (!this.isValidVariableIndex(index)) return;
    this.state.scriptVariables[index] = value;
  }

  addVariable(index: number, value: number): void {
    if (!this.isValidVariableIndex(index)) return;
    this.state.scriptVariables[index] = (this.state.scriptVariables[index] ?? 0) + value;
  }

  subVariable(index: number, value: number): void {
    if (!this.isValidVariableIndex(index)) return;
    this.state.scriptVariables[index] = (this.state.scriptVariables[index] ?? 0) - value;
  }

  resetLocalVariables(): void {
    for (let index = SCRIPT_LOCAL_VARIABLE_START; index < SCRIPT_LOCAL_VARIABLE_END; index += 1) {
      this.state.scriptVariables[index] = 0;
    }
  }

  rememberBoxEvent(boxKey: string, eventId: number): void {
    if (this.boxEventMap.has(boxKey)) return;
    this.boxEventMap.set(boxKey, eventId);
  }

  isBoxCollected(boxKey: string): boolean {
    if (this.state.collectedBoxKeys.includes(boxKey)) return true;
    const eventId = this.boxEventMap.get(boxKey);
    return eventId != null && this.hasEvent(eventId);
  }

  markBoxCollected(boxKey: string): void {
    if (this.state.collectedBoxKeys.includes(boxKey)) return;
    this.state.collectedBoxKeys.push(boxKey);
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
        this.mainScene = null;
        this.mainSceneRuntime = null;
        this.screenStack.changeScreen(new ScreenAnimation(this, screenType));
        return;
      case ScreenViewType.SCREEN_GAME_LOGO:
        this.mainScene = null;
        this.mainSceneRuntime = null;
        this.screenStack.changeScreen(new ScreenAnimation(this, screenType));
        return;
      case ScreenViewType.SCREEN_GAME_FAIL:
        this.mainScene = null;
        this.mainSceneRuntime = null;
        this.screenStack.changeScreen(new ScreenAnimation(this, screenType));
        return;
      case ScreenViewType.SCREEN_MENU:
        this.mainScene = null;
        this.mainSceneRuntime = null;
        this.screenStack.changeScreen(new ScreenMenu(this));
        return;
      case ScreenViewType.SCREEN_MAIN_GAME:
        this.mainSceneRuntime = new MainSceneRuntime(this);
        this.mainScene = new ScreenMainGame(this, this.mainSceneRuntime);
        this.screenStack.changeScreen(this.mainScene);
        return;
    }
  }

  private ensureScriptVariableSize(): void {
    while (this.state.scriptVariables.length < SCRIPT_VARIABLE_COUNT) {
      this.state.scriptVariables.push(0);
    }
    this.state.scriptVariables = this.state.scriptVariables.slice(0, SCRIPT_VARIABLE_COUNT);
  }

  private isValidVariableIndex(index: number): boolean {
    return index >= 0 && index < SCRIPT_VARIABLE_COUNT;
  }
}
