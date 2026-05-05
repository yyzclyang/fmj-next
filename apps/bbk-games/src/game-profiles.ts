import type { GameCompatOptions } from '@fmj-next/core';

export interface GameLibManifest {
  readonly name: string;
  readonly url: string;
  readonly sha256: string;
  readonly scopeId: string;
  readonly compat?: GameCompatOptions | null;
}

export interface LoadedGameLibManifest extends GameLibManifest {
  readonly compat: GameCompatOptions | null;
}

const FMJ_LIB_SHA256 = '97580833189be2e20df0091257e197e48461afe3d311b80e4892fac086126618';
const DEFAULT_SAVE_SCOPE_HASH_LENGTH = 16;

export function createDefaultSaveScopeId(libSha256: string): string {
  return `sha256-${libSha256.slice(0, DEFAULT_SAVE_SCOPE_HASH_LENGTH)}`;
}

export const gameLibManifests = [
  {
    name: '伏魔记',
    url: '/games/fmj/DAT.LIB',
    sha256: FMJ_LIB_SHA256,
    scopeId: createDefaultSaveScopeId(FMJ_LIB_SHA256),
    compat: {
      mainMenuSelectorOffset: { x: -22, y: 12 },
      magicDamageFormula: 'original',
    },
  },
] satisfies GameLibManifest[];

export type GameId = number;
