import type { Player } from '@/characters';
import type { Game } from '@/game/game';

export function getPartyPlayers(game: Game): Player[] {
  // prettier-ignore
  return game.state.partyActorIds
    .map(id => game.getPlayer(id))
    .filter((player): player is Player => player !== null);
}
