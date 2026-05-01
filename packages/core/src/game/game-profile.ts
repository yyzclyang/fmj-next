export interface GameCompatOptions {
  readonly mainMenuSelectorOffset?: {
    readonly x: number;
    readonly y: number;
  };
  readonly suppressGainMoneyTip?: boolean;
  readonly suppressSceneNameTip?: boolean;
}

export interface GameProfile {
  readonly id: string;
  readonly title?: string;
  readonly compat?: GameCompatOptions;
}

export const DEFAULT_GAME_PROFILE: GameProfile = {
  id: 'default',
  compat: {
    mainMenuSelectorOffset: { x: -22, y: 12 },
  },
};
