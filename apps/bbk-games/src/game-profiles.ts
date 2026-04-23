interface GameProfile {
  readonly id: string;
  readonly title: string;
}

export const gameProfiles = {
  fmj: {
    id: 'fmj',
    title: '伏魔记',
  },
} satisfies Record<string, GameProfile>;

export type GameId = keyof typeof gameProfiles;
