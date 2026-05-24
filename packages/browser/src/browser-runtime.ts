import {
  Engine,
  KeyCode,
  type AudioPort,
  type DebugGoodsArg,
  type DebugPlayerIncreaseInput,
  type EngineHost,
  type GameEngineOptions,
  type SaveStore,
} from '@fmj-next/core';
import { CanvasPresenter } from './canvas-presenter';

export interface BrowserRuntimeOptions {
  readonly canvas: HTMLCanvasElement;
  readonly saveStore: SaveStore;
  readonly audio: AudioPort;
  readonly requestExit?: () => void;
  readonly speed?: number;
}

export interface BrowserRuntimeStartOptions {
  readonly lib: Uint8Array;
  readonly engineOptions?: GameEngineOptions;
}

export interface CheatApi {
  bag: {
    add(list?: readonly DebugGoodsArg[], count?: number): void;
    addMoney(value: number): void;
  };
  player: {
    increase(actorIds: readonly number[], input: DebugPlayerIncreaseInput): void;
  };
  combat: {
    setEncounterRate(rate?: number | null): void;
    setExpMultiplier(multiplier: number): void;
    setMoneyMultiplier(multiplier: number): void;
  };
}

export class BrowserRuntime {
  readonly cheat: CheatApi = {
    bag: {
      add: (list, count) => { this.engine?.debug.bag.add(list, count); },
      addMoney: value => { this.engine?.debug.bag.addMoney(value); },
    },
    player: {
      increase: (actorIds, input) => { this.engine?.debug.player.increase(actorIds, input); },
    },
    combat: {
      setEncounterRate: rate => { this.engine?.debug.combat.setEncounterRate(rate); },
      setExpMultiplier: multiplier => { this.engine?.debug.combat.setExpMultiplier(multiplier); },
      setMoneyMultiplier: multiplier => { this.engine?.debug.combat.setMoneyMultiplier(multiplier); },
    },
  };
  private readonly presenter: CanvasPresenter;
  private readonly host: EngineHost;
  private engine: Engine | null = null;
  private speed: number;
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;

  constructor(options: BrowserRuntimeOptions) {
    this.presenter = new CanvasPresenter(options.canvas);
    this.host = {
      saveStore: options.saveStore,
      audio: options.audio,
      requestExit: options.requestExit,
    };
    this.speed = options.speed ?? 1;
  }

  start(options: BrowserRuntimeStartOptions): void {
    this.stopLoop();
    this.engine = new Engine(this.host);
    this.engine.boot({ lib: options.lib, engineOptions: options.engineOptions });
    this.presenter.present(this.engine.frameBuffer);
    this.lastTimestamp = null;
    this.rafId = requestAnimationFrame(this.loop);
  }

  setSpeed(multiplier: number): void {
    this.speed = Math.max(0.25, multiplier);
  }

  keyDown(code: KeyCode): void {
    this.engine?.keyDown(code);
  }

  dispose(): void {
    this.stopLoop();
    this.engine = null;
  }

  private readonly loop = (timestamp: number): void => {
    if (!this.engine) return;

    const delta = this.lastTimestamp === null ? 40 : timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.engine.tick(delta * this.speed);
    this.presenter.present(this.engine.frameBuffer);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export function createBrowserRuntime(options: BrowserRuntimeOptions): BrowserRuntime {
  return new BrowserRuntime(options);
}
