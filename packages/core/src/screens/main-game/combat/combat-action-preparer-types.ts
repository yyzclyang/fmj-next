import type { CombatAction } from '@/combat/combat-actions';
import type { CombatSession } from '@/combat/combat-runtime';
import type { Game } from '@/game/game';
import type { CombatActionAnimation } from './combat-animations';

export interface PreparedCombatAction {
  readonly action: CombatAction | null;
  readonly animation: CombatActionAnimation | null;
}

export interface CombatPrepareContext {
  readonly game: Game;
  readonly session: CombatSession;
  readonly actionInterval: number;
  readonly setMessage: (message: string) => void;
}

export function preparedAction(action: CombatAction, animation: CombatActionAnimation): PreparedCombatAction {
  return { action, animation };
}

export function noPreparedAction(): PreparedCombatAction {
  return { action: null, animation: null };
}
