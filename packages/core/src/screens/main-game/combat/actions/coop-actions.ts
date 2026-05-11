import type { Monster, Player } from '@/characters';
import type { CombatAction, CoopAction } from '@/combat/combat-actions';
import type { Game } from '@/game/game';
import { MagicAttack } from '@/magic';
import { getAvailableCoopPlayers } from './targeting';

export interface QueuedCoopAction {
  readonly action: CombatAction;
  readonly rememberIndexes: readonly number[];
}

export function canSelectCoopTarget(players: readonly Player[], currentPlayer: Player | null): boolean {
  return getAvailableCoopPlayers(players, currentPlayer).length > 1;
}

export function getCombatCoopMagic(game: Game, player: Player): MagicAttack | null {
  if (player.coopMagicIndex <= 0) return null;
  const magic = game.datLib.getMagic(1, player.coopMagicIndex);
  return magic instanceof MagicAttack ? magic : null;
}

export function createCoopPlayerAction(
  game: Game,
  players: readonly Player[],
  currentPlayer: Player | null,
  monster: Monster,
  monsters: readonly Monster[]
): CoopAction | null {
  const actors = getAvailableCoopPlayers(players, currentPlayer);
  if (actors.length <= 1) return null;
  return createCoopAction(game, actors, monster, monsters, false);
}

export function createRepeatedCoopAction(options: {
  readonly game: Game;
  readonly players: readonly Player[];
  readonly monsters: readonly Monster[];
  readonly alivePlayers: readonly Player[];
  readonly monster: Monster;
  readonly lastPlayerActions: ReadonlyMap<number, CombatAction>;
}): QueuedCoopAction | null {
  const first = options.alivePlayers[0];
  if (!first) return null;
  const firstAction = options.lastPlayerActions.get(first.index);
  if (firstAction?.kind !== 'coop' || options.alivePlayers.length < 2) return null;
  const action = createCoopAction(
    options.game,
    options.alivePlayers,
    options.monster,
    options.monsters,
    firstAction.targetAll
  );
  return {
    action,
    rememberIndexes: options.alivePlayers.map(player => options.players.indexOf(player)).filter(index => index >= 0),
  };
}

function createCoopAction(
  game: Game,
  actors: readonly Player[],
  monster: Monster,
  monsters: readonly Monster[],
  targetAll: boolean
): CoopAction {
  const first = actors[0]!;
  const magic = getCombatCoopMagic(game, first);
  return {
    kind: 'coop',
    actor: first,
    actors,
    magic,
    targets: targetAll ? monsters.filter(item => item.isAlive) : [monster],
    targetAll,
  };
}
