import { Engine, KeyCode, type AudioPort, type DebugApi, type SaveStore } from '@fmj-next/core';
import { CanvasPresenter } from './canvas-presenter';

export interface BrowserRuntimeOptions {
  readonly canvas: HTMLCanvasElement;
  readonly saveStore: SaveStore;
  readonly audio: AudioPort;
  readonly speed?: number;
}

export interface BrowserRuntimeStartOptions {
  readonly datLib: Uint8Array;
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
    },
    player: {
      list: () => this.engine?.debug.player.list() ?? [],
      listAll: () => this.engine?.debug.player.listAll() ?? [],
      add: ids => this.engine?.debug.player.add(ids) ?? [],
    },
    script: {
      start: (type, index, offset) => this.engine?.debug.script.start(type, index, offset) ?? false,
    },
    combat: {
      listMonsters: () => this.engine?.debug.combat.listMonsters() ?? [],
      listBackgrounds: () => this.engine?.debug.combat.listBackgrounds() ?? [],
      start: options => this.engine?.debug.combat.start(options) ?? false,
    },
  };
  private readonly presenter: CanvasPresenter;
  private readonly host: { readonly saveStore: SaveStore; readonly audio: AudioPort };
  private engine: Engine | null = null;
  private speed: number;
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;

  constructor(options: BrowserRuntimeOptions) {
    this.presenter = new CanvasPresenter(options.canvas);
    this.host = {
      saveStore: options.saveStore,
      audio: options.audio,
    };
    this.speed = options.speed ?? 1;
  }

  start(options: BrowserRuntimeStartOptions): void {
    this.stopLoop();
    this.engine = new Engine(this.host);
    this.engine.boot({ datLib: options.datLib });
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

  keyUp(code: KeyCode): void {
    this.engine?.keyUp(code);
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
