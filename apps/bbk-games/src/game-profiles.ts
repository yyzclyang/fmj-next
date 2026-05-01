import type { GameProfile as CoreGameProfile } from '@fmj-next/core';

interface GameProfile extends CoreGameProfile {
  readonly id: string;
  readonly title: string;
}

export const gameProfiles = {
  fmj: {
    id: 'fmj',
    title: '伏魔记',
    compat: {
      mainMenuSelectorOffset: { x: -22, y: 12 },
    },
  },
} satisfies Record<string, GameProfile>;

export type GameId = keyof typeof gameProfiles;
