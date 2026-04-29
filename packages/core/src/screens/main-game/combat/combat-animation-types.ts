import type { FightingCharacter } from '@/characters';
import type { Surface } from '@/rendering/surface';

export interface CombatPoint {
  readonly x: number;
  readonly y: number;
}

export interface CombatActionAnimation {
  update(delta: number): boolean;
  draw(surface: Surface): void;
  keepsVisible?(fighter: FightingCharacter): boolean;
}
