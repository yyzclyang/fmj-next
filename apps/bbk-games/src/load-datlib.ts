import type { GameId } from './game-profiles';

export async function loadDatLib(gameId: GameId): Promise<Uint8Array> {
  const response = await fetch(`/games/${gameId}/DAT.LIB`);
  if (!response.ok) {
    throw new Error(`Failed to load DAT.LIB for ${gameId}: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
