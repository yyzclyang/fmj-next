import type { Game } from '@/game/game';
import type { CommandBuilder } from './script-command';
import { compileCombatCommand } from './script-commands/combat-commands';
import { compileFlowCommand } from './script-commands/flow-commands';
import { compileInventoryCommand } from './script-commands/inventory-commands';
import { compileMiscCommand } from './script-commands/misc-commands';
import { compileSceneCommand } from './script-commands/scene-commands';
import { compileUiCommand } from './script-commands/ui-commands';
import type { ScriptReader } from './script-reader';

type CommandGroupCompiler = (game: Game, reader: ScriptReader, opcode: number) => CommandBuilder | null;

const COMMAND_GROUPS: CommandGroupCompiler[] = [
  compileSceneCommand,
  compileFlowCommand,
  compileUiCommand,
  compileInventoryCommand,
  compileCombatCommand,
  compileMiscCommand,
];

export function compileScriptCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder {
  for (const compileCommand of COMMAND_GROUPS) {
    const command = compileCommand(game, reader, opcode);
    if (command) return command;
  }

  throw new Error(`Unsupported script opcode ${opcode} at offset ${reader.commandOffset}`);
}
