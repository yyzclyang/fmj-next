export const ScreenViewType = {
  DevLogo: 0,
  GameLogo: 1,
  StartMenu: 2,
  MainGame: 3,
  GameFail: 4,
  SaveGame: 5,
  LoadGame: 6,
} as const;

export type ScreenViewType = (typeof ScreenViewType)[keyof typeof ScreenViewType];
