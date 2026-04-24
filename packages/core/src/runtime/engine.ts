import { createDebugApi } from '@/debug/debug';
import { Game } from '@/game/game';
import type { GameState } from '@/game/game-state';
import { createFrameBuffer, type FrameBuffer } from '@/rendering/frame-buffer';
import { FIXED_STEP_MS } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import type { EngineHost } from './engine-host';

export interface BootOptions {
  readonly datLib: Uint8Array;
}

export class Engine {
  readonly debug = createDebugApi(() => this.game?.getStateSnapshot() ?? null);
  private readonly emptyBuffer = createFrameBuffer();
  private accumulatorMs = 0;
  private game: Game | null = null;
  private readonly host: EngineHost;

  constructor(host: EngineHost) {
    this.host = host;
  }

  get frameBuffer(): FrameBuffer {
    return this.game?.frameBuffer ?? this.emptyBuffer;
  }

  boot(options: BootOptions): void {
    this.accumulatorMs = 0;
    this.game = new Game(this.host, options.datLib);
    this.game.start();
  }

  getStateSnapshot(): GameState | null {
    return this.game?.getStateSnapshot() ?? null;
  }

  tick(deltaMs: number): void {
    if (!this.game) return;

    this.accumulatorMs += deltaMs;
    while (this.accumulatorMs >= FIXED_STEP_MS) {
      this.accumulatorMs -= FIXED_STEP_MS;
      this.game.update(FIXED_STEP_MS);
    }
    this.game.draw();
  }

  keyDown(key: KeyCode): void {
    this.game?.keyDown(key);
  }

  keyUp(key: KeyCode): void {
    this.game?.keyUp(key);
  }
}
