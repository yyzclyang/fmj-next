export type DamageFormula = 'original' | 'simplified';

export interface GameEngineOptions {
  readonly damageFormula?: DamageFormula;
  readonly allowFightMiss?: boolean;
}
