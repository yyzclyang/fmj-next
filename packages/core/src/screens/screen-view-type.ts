export const ScreenViewType = {
  SCREEN_DEV_LOGO: 0,
  SCREEN_GAME_LOGO: 1,
  SCREEN_MENU: 2,
  SCREEN_MAIN_GAME: 3,
  SCREEN_GAME_FAIL: 4,
  SCREEN_SAVE_GAME: 5,
  SCREEN_LOAD_GAME: 6,
} as const;

export type ScreenViewType = (typeof ScreenViewType)[keyof typeof ScreenViewType];
