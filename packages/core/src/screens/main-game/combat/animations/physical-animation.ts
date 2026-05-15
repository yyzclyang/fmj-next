import { PlayerFightingFrame, type FightingCharacter } from '@/characters';
import type { Surface } from '@/rendering/surface';
import {
  PHYSICAL_ATTACK_MOVE_FRAMES,
  advanceFrameTimer,
  drawActiveAnimations,
  restoreSprite,
  restoreSprites,
  setPhysicalAttackFrame,
  snapshotSprite,
  snapshotSprites,
  type SpriteSnapshot,
  updateActiveAnimations,
} from './animation-sprite';
import type { CombatActionAnimation, CombatPoint } from './animation-types';

export class PhysicalCombatAnimation implements CombatActionAnimation {
  private readonly actorSnapshot: SpriteSnapshot | null;
  private readonly targetSnapshots: SpriteSnapshot[];
  private readonly visibleTargetSet: Set<FightingCharacter>;
  private frame = 0;
  private elapsed = 0;
  private stage: 'move' | 'raise' = 'move';
  private hitStarted = false;
  private raiseAnimations: CombatActionAnimation[];

  constructor(
    private readonly options: {
      readonly actor: FightingCharacter;
      readonly targets: readonly FightingCharacter[];
      readonly moveTo: FightingCharacter | CombatPoint;
      readonly raiseAnimations: CombatActionAnimation[];
      readonly targetIsPlayer: boolean;
      readonly guardedTargets?: ReadonlySet<FightingCharacter>;
    }
  ) {
    this.actorSnapshot = snapshotSprite(options.actor);
    this.targetSnapshots = snapshotSprites(options.targets);
    this.visibleTargetSet = new Set(options.targets);
    this.raiseAnimations = [...options.raiseAnimations];
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.visibleTargetSet.has(fighter);
  }

  update(delta: number): boolean {
    if (this.stage === 'move') {
      this.advance(delta);
      if (this.frame < PHYSICAL_ATTACK_MOVE_FRAMES) {
        this.updateActorMoveFrame();
        return true;
      }
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
    if (this.stage !== 'raise') return;
    drawActiveAnimations(surface, this.raiseAnimations);
  }

  private updateActorMoveFrame(): void {
    const snapshot = this.actorSnapshot;
    if (!snapshot) return;
    const dst =
      'fightingSprite' in this.options.moveTo
        ? {
            x: this.options.moveTo.fightingSprite?.combatX ?? snapshot.x,
            y: this.options.moveTo.fightingSprite?.combatY ?? snapshot.y,
          }
        : this.options.moveTo;
    snapshot.sprite.setCombatPos(
      Math.trunc(snapshot.x + ((dst.x - snapshot.x) * this.frame) / PHYSICAL_ATTACK_MOVE_FRAMES),
      Math.trunc(snapshot.y + ((dst.y - snapshot.y) * this.frame) / PHYSICAL_ATTACK_MOVE_FRAMES)
    );
    setPhysicalAttackFrame(this.options.actor, this.frame, PHYSICAL_ATTACK_MOVE_FRAMES);
  }

  private startTargetHit(): void {
    if (this.hitStarted) return;
    this.hitStarted = true;
    for (let i = 0; i < this.targetSnapshots.length; i += 1) {
      const item = this.targetSnapshots[i]!;
      const target = this.options.targets[i];
      if (this.options.targetIsPlayer) {
        item.sprite.currentFrame =
          target && this.isGuarded(target) ? PlayerFightingFrame.GuardedHit : PlayerFightingFrame.Hit;
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
