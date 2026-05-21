import type { GameEngineOptions } from '@fmj-next/core';

export function parseEngineOptions(value: string): GameEngineOptions | null {
  if (!value) return null;
  return JSON.parse(value) as GameEngineOptions;
}
