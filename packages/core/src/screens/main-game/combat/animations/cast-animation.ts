import { Player, type FightingCharacter } from '@/characters';
import type { ResSrs } from '@/lib/res-srs';
import type { Surface } from '@/rendering/surface';
import {
  CAST_PRE_FRAMES,
  FRAME_INTERVAL,
  restoreSprite,
  snapshotSprite,
  type SpriteSnapshot,
} from './animation-sprite';
import type { CombatActionAnimation, CombatPoint } from './animation-types';

export class CastCombatAnimation implements CombatActionAnimation {
  private readonly actorSnapshot: SpriteSnapshot | null;
  private readonly targetSnapshots: SpriteSnapshot[];
  private readonly targetSet: Set<FightingCharacter>;
  private frame = 0;
  private elapsed = 0;
  private stage: 'pre' | 'ani' | 'raise' = 'pre';
  private raises: CombatActionAnimation[];

  constructor(
    private readonly options: {
      readonly actor: FightingCharacter;
      readonly targets: readonly FightingCharacter[];
      readonly srs: ResSrs | null;
      readonly srsPoint: CombatPoint;
      readonly raises: CombatActionAnimation[];
      readonly hitTargets: boolean;
    }
  ) {
    this.actorSnapshot = snapshotSprite(options.actor);
    this.targetSnapshots = options.targets.map(snapshotSprite).filter((item): item is SpriteSnapshot => item != null);
    this.targetSet = new Set(options.targets);
    this.raises = [...options.raises];
    options.srs?.start();
    options.srs?.setIteratorNum(2);
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.targetSet.has(fighter);
  }

  update(delta: number): boolean {
    if (this.stage === 'pre') {
      this.advance(delta);
      if (this.frame < CAST_PRE_FRAMES) {
        this.updateCastFrame();
        return true;
      }
      if (this.options.srs) this.stage = 'ani';
      else {
        this.restoreActor();
        this.startTargetHit();
        this.stage = 'raise';
      }
      return true;
    }
    if (this.stage === 'ani') {
      if (this.options.srs?.update(delta)) return true;
      this.restoreActor();
      this.startTargetHit();
      this.stage = 'raise';
      return true;
    }
    if (this.updateRaises(delta)) return true;
    this.restoreTargets();
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

  private updateCastFrame(): void {
    const snapshot = this.actorSnapshot;
    if (!snapshot) return;
    if (this.options.actor instanceof Player) {
      snapshot.sprite.currentFrame = Math.trunc((this.frame * 3) / CAST_PRE_FRAMES) + 6;
    } else {
      snapshot.sprite.setCombatPos(snapshot.x + 2, snapshot.y + 2);
    }
  }

  private startTargetHit(): void {
    if (!this.options.hitTargets) return;
    for (let i = 0; i < this.targetSnapshots.length; i += 1) {
      const item = this.targetSnapshots[i]!;
      const target = this.options.targets[i];
      if (target instanceof Player) item.sprite.currentFrame = 10;
      else item.sprite.move(2, 2);
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

  private restoreActor(): void {
    restoreSprite(this.actorSnapshot);
  }

  private restoreTargets(): void {
    for (const item of this.targetSnapshots) restoreSprite(item);
  }
}
