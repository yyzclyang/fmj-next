import type { FightingCharacter, Player } from '@/characters';
import type { ResSrs } from '@/lib/res-srs';
import type { Surface } from '@/rendering/surface';
import {
  COOP_CAST_PRE_FRAMES,
  COOP_MOVE_FRAMES,
  COOP_SRS_ITERATIONS,
  advanceFrameTimer,
  drawActiveAnimations,
  restoreSprites,
  setPlayerCastFrame,
  snapshotSprites,
  type SpriteSnapshot,
  updateActiveAnimations,
} from './animation-sprite';
import type { CombatActionAnimation, CombatPoint } from './animation-types';

const COOP_ACTOR_POINTS = [
  { x: 122, y: 82 },
  { x: 139, y: 93 },
  { x: 156, y: 104 },
] as const;

export class CoopCombatAnimation implements CombatActionAnimation {
  private readonly actorSnapshots: SpriteSnapshot[];
  private readonly visibleTargetSet: Set<FightingCharacter>;
  private frame = 0;
  private elapsed = 0;
  private stage: 'move' | 'pre' | 'ani' | 'raise' = 'move';
  private raiseAnimations: CombatActionAnimation[];

  constructor(
    private readonly options: {
      readonly actors: readonly Player[];
      readonly targets: readonly FightingCharacter[];
      readonly srs: ResSrs | null;
      readonly srsPoint: CombatPoint;
      readonly raiseAnimations: CombatActionAnimation[];
    }
  ) {
    this.actorSnapshots = snapshotSprites(options.actors);
    this.visibleTargetSet = new Set(options.targets);
    this.raiseAnimations = [...options.raiseAnimations];
    options.srs?.start();
    options.srs?.setIteratorNum(COOP_SRS_ITERATIONS);
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.visibleTargetSet.has(fighter);
  }

  update(delta: number): boolean {
    if (this.stage === 'move') {
      this.advance(delta);
      if (this.frame < COOP_MOVE_FRAMES) {
        this.moveActorsToCoopPoint();
        return true;
      }
      this.stage = 'pre';
      this.frame = 0;
      this.elapsed = 0;
      return true;
    }
    if (this.stage === 'pre') {
      this.advance(delta);
      if (this.frame < COOP_CAST_PRE_FRAMES) {
        for (const item of this.actorSnapshots) setPlayerCastFrame(item, this.frame, COOP_CAST_PRE_FRAMES);
        return true;
      }
      if (this.options.srs) this.stage = 'ani';
      else {
        restoreSprites(this.actorSnapshots);
        this.stage = 'raise';
      }
      return true;
    }
    if (this.stage === 'ani') {
      if (this.options.srs?.update(delta)) return true;
      restoreSprites(this.actorSnapshots);
      this.stage = 'raise';
      return true;
    }
    if (this.updateRaises(delta)) return true;
    restoreSprites(this.actorSnapshots);
    return false;
  }

  draw(surface: Surface): void {
    if (this.stage === 'ani') {
      this.options.srs?.drawAbsolutely(surface, this.options.srsPoint.x, this.options.srsPoint.y);
      return;
    }
    if (this.stage === 'raise') {
      drawActiveAnimations(surface, this.raiseAnimations);
    }
  }

  private moveActorsToCoopPoint(): void {
    for (let i = 0; i < this.actorSnapshots.length; i += 1) {
      const item = this.actorSnapshots[i]!;
      const dst = COOP_ACTOR_POINTS[Math.min(i, COOP_ACTOR_POINTS.length - 1)]!;
      item.sprite.setCombatPos(
        Math.trunc(item.x + ((dst.x - item.x) * this.frame) / COOP_MOVE_FRAMES),
        Math.trunc(item.y + ((dst.y - item.y) * this.frame) / COOP_MOVE_FRAMES)
      );
    }
  }

  private updateRaises(delta: number): boolean {
    return updateActiveAnimations(this.raiseAnimations, delta);
  }

  private advance(delta: number): void {
    const next = advanceFrameTimer(this.frame, this.elapsed, delta);
    this.frame = next.frame;
    this.elapsed = next.elapsed;
  }
}
