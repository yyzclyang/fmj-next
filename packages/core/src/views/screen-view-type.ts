export const ScreenViewType = {
  SCREEN_DEV_LOGO: 0,
  SCREEN_GAME_LOGO: 1,
  SCREEN_MENU: 2,
} as const;

export type ScreenViewType = (typeof ScreenViewType)[keyof typeof ScreenViewType];
