import {
  Engine,
  KeyCode,
  type AudioPort,
  type DebugApi,
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

export class BrowserRuntime {
  readonly debug: DebugApi = {
    getSnapshot: () => this.engine?.debug.getSnapshot() ?? null,
    bag: {
      list: () => this.engine?.debug.bag.list() ?? [],
      listAll: () => this.engine?.debug.bag.listAll() ?? [],
      add: (type, index, count) => this.engine?.debug.bag.add(type, index, count) ?? null,
      addAll: count => this.engine?.debug.bag.addAll(count) ?? [],
      delete: (type, index, count) => this.engine?.debug.bag.delete(type, index, count) ?? false,
      addMoney: value => this.engine?.debug.bag.addMoney(value) ?? 0,
    },
    player: {
      list: () => this.engine?.debug.player.list() ?? [],
      listAll: () => this.engine?.debug.player.listAll() ?? [],
      add: ids => this.engine?.debug.player.add(ids) ?? [],
      increase: (actorIds, input) => this.engine?.debug.player.increase(actorIds, input) ?? [],
    },
    script: {
      start: (type, index) => this.engine?.debug.script.start(type, index) ?? false,
    },
    combat: {
      listMonsters: () => this.engine?.debug.combat.listMonsters() ?? [],
      listBackgrounds: () => this.engine?.debug.combat.listBackgrounds() ?? [],
      start: options => this.engine?.debug.combat.start(options) ?? false,
      setEncounterRate: rate => this.engine?.debug.combat.setEncounterRate(rate) ?? 0,
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

    const delta = this.lastTimestamp == null ? 40 : timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.engine.tick(delta * this.speed);
    this.presenter.present(this.engine.frameBuffer);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private stopLoop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export function createBrowserRuntime(options: BrowserRuntimeOptions): BrowserRuntime {
  return new BrowserRuntime(options);
}
