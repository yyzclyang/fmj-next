import type { Monster, Player } from '@/characters';
import type { CombatAction, CoopAction } from '@/combat/combat-actions';
import { GoodsDecorations } from '@/goods';
import type { MagicAttack } from '@/magic';
import { getAvailableCoopPlayers } from './combat-targeting';

export interface QueuedCoopAction {
  readonly action: CombatAction;
  readonly rememberIndexes: readonly number[];
}

export function canSelectCoopTarget(players: readonly Player[], currentPlayer: Player | null): boolean {
  return getAvailableCoopPlayers(players, currentPlayer).length > 1;
}

export function getCombatCoopMagic(player: Player): MagicAttack | null {
  const decoration = player.equipment[0] ?? null;
  return decoration instanceof GoodsDecorations ? decoration.coopMagic : null;
}

export function createCoopPlayerAction(
  players: readonly Player[],
  currentPlayer: Player | null,
  monster: Monster,
  monsters: readonly Monster[]
): CoopAction | null {
  const actors = getAvailableCoopPlayers(players, currentPlayer);
  if (actors.length <= 1) return null;
  return createCoopAction(actors, monster, monsters, false);
}

export function createRepeatedCoopAction(options: {
  readonly players: readonly Player[];
  readonly monsters: readonly Monster[];
  readonly alivePlayers: readonly Player[];
  readonly monster: Monster;
  readonly lastPlayerActions: ReadonlyMap<number, CombatAction>;
}): QueuedCoopAction | null {
  const first = options.alivePlayers[0];
  if (!first) return null;
  const firstIndex = options.players.indexOf(first);
  const firstAction = options.lastPlayerActions.get(firstIndex);
  if (firstAction?.kind !== 'coop' || options.alivePlayers.length < 2) return null;
  const action = createCoopAction(options.alivePlayers, options.monster, options.monsters, firstAction.targetAll);
  return { action, rememberIndexes: options.alivePlayers.map(player => options.players.indexOf(player)).filter(index => index >= 0) };
}

function createCoopAction(actors: readonly Player[], monster: Monster, monsters: readonly Monster[], targetAll: boolean): CoopAction {
  const first = actors[0]!;
  const magic = getCombatCoopMagic(first);
  return {
    kind: 'coop',
    actor: first,
    actors,
    magic,
    targets: targetAll ? monsters.filter(item => item.isAlive) : [monster],
    targetAll,
  };
}
