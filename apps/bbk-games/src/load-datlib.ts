import { gameProfiles, type GameId } from './game-profiles';

export async function loadDatLib(gameId: GameId): Promise<Uint8Array> {
  const profile = gameProfiles[gameId];
  const response = await fetch(profile.datLibPath);
  if (!response.ok) {
    throw new Error(`Failed to load DAT.LIB for ${gameId} from ${profile.datLibPath}: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
