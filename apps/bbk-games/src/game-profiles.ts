import type { GameProfile as CoreGameProfile } from '@fmj-next/core';

interface GameProfile extends CoreGameProfile {
  readonly id: string;
  readonly title: string;
  readonly datLibPath: string;
}

export const gameProfiles = {
  fmj: {
    id: 'fmj',
    title: '伏魔记',
    datLibPath: '/games/fmj/DAT.LIB',
    compat: {
      mainMenuSelectorOffset: { x: -22, y: 12 },
      magicDamageFormula: 'original',
    },
  },
} satisfies Record<string, GameProfile>;

export type GameId = keyof typeof gameProfiles;
