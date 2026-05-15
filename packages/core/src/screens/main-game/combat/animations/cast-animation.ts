import { Player, PlayerFightingFrame, type FightingCharacter } from '@/characters';
import type { ResSrs } from '@/lib/res-srs';
import type { Surface } from '@/rendering/surface';
import {
  MAGIC_CAST_PRE_FRAMES,
  MAGIC_SRS_ITERATIONS,
  advanceFrameTimer,
  drawActiveAnimations,
  restoreSprite,
  restoreSprites,
  setPlayerCastFrame,
  snapshotSprite,
  snapshotSprites,
  type SpriteSnapshot,
  updateActiveAnimations,
} from './animation-sprite';
import type { CombatActionAnimation, CombatPoint } from './animation-types';

export class CastCombatAnimation implements CombatActionAnimation {
  private readonly actorSnapshot: SpriteSnapshot | null;
  private readonly targetSnapshots: SpriteSnapshot[];
  private readonly visibleTargetSet: Set<FightingCharacter>;
  private frame = 0;
  private elapsed = 0;
  private stage: 'pre' | 'ani' | 'raise' = 'pre';
  private raiseAnimations: CombatActionAnimation[];

  constructor(
    private readonly options: {
      readonly actor: FightingCharacter;
      readonly targets: readonly FightingCharacter[];
      readonly srs: ResSrs | null;
      readonly srsPoint: CombatPoint;
      readonly raiseAnimations: CombatActionAnimation[];
      readonly hitTargets: boolean;
      readonly guardedTargets?: ReadonlySet<FightingCharacter>;
    }
  ) {
    this.actorSnapshot = snapshotSprite(options.actor);
    this.targetSnapshots = snapshotSprites(options.targets);
    this.visibleTargetSet = new Set(options.targets);
    this.raiseAnimations = [...options.raiseAnimations];
    options.srs?.start();
    options.srs?.setIteratorNum(MAGIC_SRS_ITERATIONS);
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.visibleTargetSet.has(fighter);
  }

  update(delta: number): boolean {
    if (this.stage === 'pre') {
      this.advance(delta);
      if (this.frame < MAGIC_CAST_PRE_FRAMES) {
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
      drawActiveAnimations(surface, this.raiseAnimations);
    }
  }

  private updateCastFrame(): void {
    const snapshot = this.actorSnapshot;
    if (!snapshot) return;
    if (this.options.actor instanceof Player) {
      setPlayerCastFrame(snapshot, this.frame, MAGIC_CAST_PRE_FRAMES);
    } else {
      snapshot.sprite.setCombatPos(snapshot.x + 2, snapshot.y + 2);
    }
  }

  private startTargetHit(): void {
    if (!this.options.hitTargets) return;
    for (let i = 0; i < this.targetSnapshots.length; i += 1) {
      const item = this.targetSnapshots[i]!;
      const target = this.options.targets[i];
      if (target instanceof Player) {
        item.sprite.currentFrame = this.isGuarded(target) ? PlayerFightingFrame.GuardedHit : PlayerFightingFrame.Hit;
      } else item.sprite.move(2, 2);
    }
  }

  private isGuarded(target: FightingCharacter): boolean {
    return this.options.guardedTargets?.has(target) ?? false;
  }

  private updateRaises(delta: number): boolean {
    return updateActiveAnimations(this.raiseAnimations, delta);
  }

  private advance(delta: number): void {
    const next = advanceFrameTimer(this.frame, this.elapsed, delta);
    this.frame = next.frame;
    this.elapsed = next.elapsed;
  }

  private restoreActor(): void {
    restoreSprite(this.actorSnapshot);
  }

  private restoreTargets(): void {
    restoreSprites(this.targetSnapshots);
  }
}
