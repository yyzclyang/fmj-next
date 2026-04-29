import type { FightingCharacter } from '@/characters';
import type { Surface } from '@/rendering/surface';
import {
  FRAME_INTERVAL,
  PHYSICAL_MOVE_FRAMES,
  restoreSprite,
  setPhysicalAttackFrame,
  snapshotSprite,
  type SpriteSnapshot,
} from './combat-animation-sprite';
import type { CombatActionAnimation, CombatPoint } from './combat-animation-types';

export class PhysicalCombatAnimation implements CombatActionAnimation {
  private readonly actorSnapshot: SpriteSnapshot | null;
  private readonly targetSnapshots: SpriteSnapshot[];
  private readonly targetSet: Set<FightingCharacter>;
  private frame = 0;
  private elapsed = 0;
  private stage: 'move' | 'raise' = 'move';
  private hitStarted = false;
  private raises: CombatActionAnimation[];

  constructor(
    private readonly options: {
      readonly actor: FightingCharacter;
      readonly targets: readonly FightingCharacter[];
      readonly moveTo: FightingCharacter | CombatPoint;
      readonly raises: CombatActionAnimation[];
      readonly targetIsPlayer: boolean;
    }
  ) {
    this.actorSnapshot = snapshotSprite(options.actor);
    this.targetSnapshots = options.targets.map(snapshotSprite).filter((item): item is SpriteSnapshot => item != null);
    this.targetSet = new Set(options.targets);
    this.raises = [...options.raises];
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.targetSet.has(fighter);
  }

  update(delta: number): boolean {
    if (this.stage === 'move') {
      this.advance(delta);
      if (this.frame < PHYSICAL_MOVE_FRAMES) {
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
    for (const raise of this.raises) raise.draw(surface);
  }

  private updateActorMoveFrame(): void {
    const snapshot = this.actorSnapshot;
    if (!snapshot) return;
    const dst = 'fightingSprite' in this.options.moveTo
      ? { x: this.options.moveTo.fightingSprite?.combatX ?? snapshot.x, y: this.options.moveTo.fightingSprite?.combatY ?? snapshot.y }
      : this.options.moveTo;
    snapshot.sprite.setCombatPos(
      Math.trunc(snapshot.x + ((dst.x - snapshot.x) * this.frame) / PHYSICAL_MOVE_FRAMES),
      Math.trunc(snapshot.y + ((dst.y - snapshot.y) * this.frame) / PHYSICAL_MOVE_FRAMES)
    );
    setPhysicalAttackFrame(this.options.actor, this.frame, PHYSICAL_MOVE_FRAMES);
  }

  private startTargetHit(): void {
    if (this.hitStarted) return;
    this.hitStarted = true;
    for (const item of this.targetSnapshots) {
      if (this.options.targetIsPlayer) item.sprite.currentFrame = 10;
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
