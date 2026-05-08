export type MagicDamageFormula = 'original' | 'simplified';

export interface GameEngineOptions {
  readonly mainMenuSelectorOffset?: {
    readonly x: number;
    readonly y: number;
  };
  readonly magicDamageFormula?: MagicDamageFormula;
}
