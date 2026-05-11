import { Player } from '@/characters';
import {
  FRAME_INTERVAL,
  PHYSICAL_MOVE_FRAMES,
  restoreSprite,
  setPlayerFrameByState,
  snapshotSprite,
  type SpriteSnapshot,
} from './animation-sprite';
import type { CombatActionAnimation } from './animation-types';

export class FleeCombatAnimation implements CombatActionAnimation {
  private readonly snapshot: SpriteSnapshot | null;
  private frame = 0;
  private elapsed = 0;

  constructor(
    private readonly player: Player,
    private readonly succeed: boolean
  ) {
    this.snapshot = snapshotSprite(player);
    if (this.snapshot) this.snapshot.sprite.currentFrame = 1;
  }

  update(delta: number): boolean {
    this.advance(delta);
    const snapshot = this.snapshot;
    if (!snapshot) return false;
    if (this.frame < PHYSICAL_MOVE_FRAMES) {
      const dy = Math.trunc((96 - snapshot.y) / PHYSICAL_MOVE_FRAMES);
      snapshot.sprite.setCombatPos(snapshot.x, snapshot.y + dy * this.frame);
      return true;
    }
    if (this.succeed) return false;
    if (this.frame < PHYSICAL_MOVE_FRAMES + 2) {
      snapshot.sprite.setCombatPos(snapshot.x, snapshot.y);
      snapshot.sprite.currentFrame = 11;
      return true;
    }
    setPlayerFrameByState(this.player);
    restoreSprite(snapshot);
    return false;
  }

  draw(): void {}

  private advance(delta: number): void {
    this.elapsed += delta;
    while (this.elapsed >= FRAME_INTERVAL) {
      this.elapsed -= FRAME_INTERVAL;
      this.frame += 1;
    }
  }
}
