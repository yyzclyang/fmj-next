import { createDebugApi } from '@/debug/debug';
import { Game } from '@/game/game';
import type { GameEngineOptions } from '@/game/game-engine-options';
import { createPixelBuffer, type PixelBuffer } from '@/rendering/pixel-buffer';
import { FIXED_STEP_MS, SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import type { EngineHost } from './engine-host';

export interface EngineBootOptions {
  readonly lib: Uint8Array;
  readonly engineOptions?: GameEngineOptions;
}

export class Engine {
  readonly debug = createDebugApi(() => this.game);
  private readonly emptyBuffer = createPixelBuffer(SCREEN_WIDTH, SCREEN_HEIGHT);
  private accumulatorMs = 0;
  private game: Game | null = null;
  private readonly host: EngineHost;

  constructor(host: EngineHost) {
    this.host = host;
  }

  get frameBuffer(): PixelBuffer {
    return this.game?.frameBuffer ?? this.emptyBuffer;
  }

  boot(options: EngineBootOptions): void {
    this.accumulatorMs = 0;
    this.game = new Game(this.host, options.lib, options.engineOptions);
    this.game.start();
  }

  tick(deltaMs: number): void {
    if (!this.game) return;

    this.accumulatorMs = Math.min(this.accumulatorMs + deltaMs, FIXED_STEP_MS * 5);
    while (this.accumulatorMs >= FIXED_STEP_MS) {
      this.accumulatorMs -= FIXED_STEP_MS;
      this.game.update(FIXED_STEP_MS);
    }
    this.game.draw();
  }

  keyDown(key: KeyCode): void {
    this.game?.onKey(key);
  }
}
