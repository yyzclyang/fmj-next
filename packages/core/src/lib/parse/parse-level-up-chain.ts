import { ResLevelUpChain, type ResLevelUpChainData } from '@/characters';

const LEVEL_UP_CHAIN_LEVEL_BYTES = 20;

export function parseLevelUpChainResource(buffer: Uint8Array, offset: number): ResLevelUpChain {
  const data = parseLevelUpChainData(buffer, offset);
  return new ResLevelUpChain(data);
}

function parseLevelUpChainData(buffer: Uint8Array, offset: number): ResLevelUpChainData {
  let maxLevel = buffer[offset + 2] ?? 0;
  if (maxLevel <= 0) maxLevel = 99;
  const dataStart = offset + 4;
  const dataEnd = dataStart + maxLevel * LEVEL_UP_CHAIN_LEVEL_BYTES;
  return {
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    maxLevel,
    levelData: buffer.slice(dataStart, Math.min(dataEnd, buffer.length)),
  };
}
