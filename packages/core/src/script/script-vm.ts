import type { Game } from '@/game/game';
import type { ResGut } from '@/lib/res-gut';
import type { CommandBuilder } from './script-command-builder';
import { compileScriptCommand } from './script-command-registry';
import { getCommandName } from './script-opcodes';
import { type ScriptCommand, ScriptProcess } from './script-process';
import { ScriptReader } from './script-reader';

export class ScriptVm {
  constructor(private readonly game: Game) {}

  loadScript(type: number, index: number): ScriptProcess {
    const res = this.game.datLib.getGut(type, index);
    const scriptName = `GUT ${type}:${index}`;
    if (!res) {
      return new ScriptProcess(`${scriptName} (missing)`, [], [], new Map<number, number>(), 0);
    }

    return this.compile(res, scriptName);
  }

  private compile(gut: ResGut, scriptName: string): ScriptProcess {
    const commands: ScriptCommand[] = [];
    const addressIndexMap = new Map<number, number>();
    const code = gut.scriptData;
    let pointer = 0;

    while (pointer < code.length) {
      addressIndexMap.set(pointer, commands.length);
      const opcode = code[pointer] ?? 0;
      const name = getCommandName(opcode);
      let command: CommandBuilder;
      try {
        command = compileScriptCommand(this.game, new ScriptReader(code, pointer), opcode);
      } catch (error) {
        throw wrapCompileError(scriptName, name, opcode, pointer, error);
      }
      if (pointer + command.len + 1 > code.length) {
        throw new Error(`${scriptName} ${name} opcode=${opcode} offset=${pointer}: 指令长度越界 len=${command.len}`);
      }
      commands.push({
        opcode,
        offset: pointer,
        name,
        len: command.len,
        execute: command.execute,
      });
      pointer += command.len + 1;
    }

    const headerSize = gut.sceneEvent.length * 2 + 3;
    const eventIndex = gut.sceneEvent.map(address => {
      if (address === 0) return -1;
      return addressIndexMap.get(address - headerSize) ?? -1;
    });

    return new ScriptProcess(scriptName, commands, eventIndex, addressIndexMap, headerSize);
  }
}

function wrapCompileError(
  scriptName: string,
  commandName: string,
  opcode: number,
  offset: number,
  error: unknown
): Error {
  const prefix = `${scriptName} ${commandName} opcode=${opcode} offset=${offset}`;
  if (error instanceof Error) {
    return new Error(`${prefix}: ${error.message}`, { cause: error });
  }
  return new Error(`${prefix}: ${String(error)}`);
}
