import type { FightingCharacter, Player } from '@/characters';
import type { ResSrs } from '@/lib/res-srs';
import type { Surface } from '@/rendering/surface';
import {
  CAST_PRE_FRAMES,
  FRAME_INTERVAL,
  PHYSICAL_MOVE_FRAMES,
  restoreSprite,
  snapshotSprite,
  type SpriteSnapshot,
} from './combat-animation-sprite';
import type { CombatActionAnimation, CombatPoint } from './combat-animation-types';

export class CoopCombatAnimation implements CombatActionAnimation {
  private readonly actorSnapshots: SpriteSnapshot[];
  private readonly targetSet: Set<FightingCharacter>;
  private frame = 0;
  private elapsed = 0;
  private stage: 'move' | 'pre' | 'ani' | 'raise' = 'move';
  private raises: CombatActionAnimation[];

  constructor(
    private readonly options: {
      readonly actors: readonly Player[];
      readonly targets: readonly FightingCharacter[];
      readonly srs: ResSrs | null;
      readonly srsPoint: CombatPoint;
      readonly raises: CombatActionAnimation[];
    }
  ) {
    this.actorSnapshots = options.actors.map(snapshotSprite).filter((item): item is SpriteSnapshot => item != null);
    this.targetSet = new Set(options.targets);
    this.raises = [...options.raises];
    options.srs?.start();
    options.srs?.setIteratorNum(2);
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.targetSet.has(fighter);
  }

  update(delta: number): boolean {
    if (this.stage === 'move') {
      this.advance(delta);
      if (this.frame < PHYSICAL_MOVE_FRAMES) {
        this.moveActorsToCoopPoint();
        return true;
      }
      this.stage = 'pre';
      this.frame = 0;
      return true;
    }
    if (this.stage === 'pre') {
      this.advance(delta);
      if (this.frame < CAST_PRE_FRAMES) {
        for (const item of this.actorSnapshots) item.sprite.currentFrame = Math.trunc((this.frame * 3) / CAST_PRE_FRAMES) + 6;
        return true;
      }
      if (this.options.srs) this.stage = 'ani';
      else {
        for (const item of this.actorSnapshots) restoreSprite(item);
        this.stage = 'raise';
      }
      return true;
    }
    if (this.stage === 'ani') {
      if (this.options.srs?.update(delta)) return true;
      for (const item of this.actorSnapshots) restoreSprite(item);
      this.stage = 'raise';
      return true;
    }
    if (this.updateRaises(delta)) return true;
    for (const item of this.actorSnapshots) restoreSprite(item);
    return false;
  }

  draw(surface: Surface): void {
    if (this.stage === 'ani') {
      this.options.srs?.drawAbsolutely(surface, this.options.srsPoint.x, this.options.srsPoint.y);
      return;
    }
    if (this.stage === 'raise') {
      for (const raise of this.raises) raise.draw(surface);
    }
  }

  private moveActorsToCoopPoint(): void {
    const points = [
      { x: 122, y: 82 },
      { x: 139, y: 93 },
      { x: 156, y: 104 },
    ] as const;
    for (let i = 0; i < this.actorSnapshots.length; i += 1) {
      const item = this.actorSnapshots[i]!;
      const dst = points[Math.min(i, points.length - 1)]!;
      item.sprite.setCombatPos(
        Math.trunc(item.x + ((dst.x - item.x) * this.frame) / PHYSICAL_MOVE_FRAMES),
        Math.trunc(item.y + ((dst.y - item.y) * this.frame) / PHYSICAL_MOVE_FRAMES)
      );
    }
  }

  private updateRaises(delta: number): boolean {
    this.raises = this.raises.filter(raise => raise.update(delta));
    return this.raises.length > 0;
  }

  private advance(delta: number): void {
    this.elapsed += delta;
    while (this.elapsed >= FRAME_INTERVAL) {
      this.elapsed -= FRAME_INTERVAL;
      this.frame += 1;
    }
  }
}
