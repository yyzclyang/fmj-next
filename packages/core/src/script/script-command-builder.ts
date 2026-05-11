import type { ScriptProcess } from './script-process';

export type CommandBuilder = {
  readonly len: number;
  readonly execute: (process: ScriptProcess) => void;
};
