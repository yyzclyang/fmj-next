export type DamageFormula = 'original' | 'simplified';

export interface GameEngineOptions {
  readonly mainMenuSelectorOffset?: {
    readonly x: number;
    readonly y: number;
  };
  readonly damageFormula?: DamageFormula;
  readonly allowFightMiss?: boolean;
}
