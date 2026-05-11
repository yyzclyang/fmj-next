import type { Game } from '@/game/game';
import type { CommandBuilder } from '../script-command';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

export function compileFlowCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder | null {
  switch (opcode) {
    case COMMAND.CALLBACK:
      return {
        len: 0,
        execute: process => {
          process.stop();
        },
      };
    case COMMAND.GOTO:
      return cmdGoto(reader);
    case COMMAND.IF:
      return cmdIf(game, reader);
    case COMMAND.SET:
      return cmdSet(game, reader);
    case COMMAND.EVENT:
      return cmdEvent(reader);
    case COMMAND.IFCMP:
      return cmdIfCmp(game, reader);
    case COMMAND.ADD:
      return cmdAdd(game, reader);
    case COMMAND.SUB:
      return cmdSub(game, reader);
    case COMMAND.GUTEVENT:
      return cmdGutEvent(game, reader);
    case COMMAND.SETEVENT:
      return cmdSetEvent(game, reader);
    case COMMAND.CLREVENT:
      return cmdClearEvent(game, reader);
    case COMMAND.RANDRADE:
      return cmdRandRate(reader);
    case COMMAND.CALLCHAPTER:
      return cmdCallChapter(game, reader);
    case COMMAND.DISCMP:
      return cmdDisCmp(game, reader);
    case COMMAND.RETURN:
      return cmdReturn(game);
    case COMMAND.SETEVENTTIMER:
      return cmdSetEventTimer(reader);
    case COMMAND.SETTO:
      return cmdSetTo(game, reader);
    default:
      return null;
  }
}

function cmdGoto(reader: ScriptReader): CommandBuilder {
  const address = reader.readUint16(0);

  return {
    len: 2,
    execute: process => {
      process.gotoAddress(address);
    },
  };
}

function cmdIf(game: Game, reader: ScriptReader): CommandBuilder {
  const eventId = reader.readUint16(0);
  const address = reader.readUint16(2);

  return {
    len: 4,
    execute: process => {
      const boxKey = game.consumePendingBoxEvent();
      if (boxKey) {
        game.rememberBoxEvent(boxKey, eventId);
      }
      if (game.hasEvent(eventId)) {
        process.gotoAddress(address);
      }
    },
  };
}

function cmdSet(game: Game, reader: ScriptReader): CommandBuilder {
  const index = reader.readUint16(0);
  const value = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.setVariable(index, value);
    },
  };
}

function cmdEvent(reader: ScriptReader): CommandBuilder {
  const eventId = reader.readUint16(0);

  return {
    len: 2,
    execute: process => {
      if (!process.triggerEvent(eventId)) {
        process.stop();
      }
    },
  };
}

function cmdIfCmp(game: Game, reader: ScriptReader): CommandBuilder {
  const index = reader.readUint16(0);
  const value = reader.readUint16(2);
  const address = reader.readUint16(4);

  return {
    len: 6,
    execute: process => {
      if (game.getVariable(index) === value) {
        process.gotoAddress(address);
      }
    },
  };
}

function cmdAdd(game: Game, reader: ScriptReader): CommandBuilder {
  const index = reader.readUint16(0);
  const value = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.addVariable(index, value);
    },
  };
}

function cmdSub(game: Game, reader: ScriptReader): CommandBuilder {
  const index = reader.readUint16(0);
  const value = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.subVariable(index, value);
    },
  };
}

function cmdGutEvent(game: Game, reader: ScriptReader): CommandBuilder {
  const gutId = reader.readUint16(0);
  const eventId = reader.readUint16(2);

  return {
    len: 4,
    execute: process => {
      const runtime = game.mainSceneRuntime;
      if (!runtime) return;
      process.pause();
      const child = runtime.callChapter(1, gutId, process);
      if (!child.triggerEvent(eventId)) {
        runtime.returnToParentScript(child);
      }
    },
  };
}

function cmdSetEvent(game: Game, reader: ScriptReader): CommandBuilder {
  const eventId = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      game.setEvent(eventId);
    },
  };
}

function cmdClearEvent(game: Game, reader: ScriptReader): CommandBuilder {
  const eventId = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      game.clearEvent(eventId);
    },
  };
}

function cmdRandRate(reader: ScriptReader): CommandBuilder {
  const rate = reader.readUint16(0);
  const address = reader.readUint16(2);

  return {
    len: 4,
    execute: process => {
      if (Math.trunc(Math.random() * 1000) <= rate) {
        process.gotoAddress(address);
      }
    },
  };
}

function cmdCallChapter(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);

  return {
    len: 4,
    execute: process => {
      const runtime = game.mainSceneRuntime;
      if (!runtime) return;
      process.pause();
      runtime.callChapter(type, index, process);
    },
  };
}

function cmdDisCmp(game: Game, reader: ScriptReader): CommandBuilder {
  const variableIndex = reader.readUint16(0);
  const value = reader.readUint16(2);
  const lessAddress = reader.readUint16(4);
  const greaterAddress = reader.readUint16(6);

  return {
    len: 8,
    execute: process => {
      const currentValue = game.getVariable(variableIndex);
      if (currentValue < value) {
        process.gotoAddress(lessAddress);
      } else if (currentValue > value) {
        process.gotoAddress(greaterAddress);
      }
    },
  };
}

function cmdReturn(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: process => {
      if (!game.mainSceneRuntime?.returnToParentScript(process)) {
        process.stop();
      }
    },
  };
}

function cmdSetEventTimer(reader: ScriptReader): CommandBuilder {
  const eventId = reader.readUint16(0);
  const timer = reader.readUint16(2);

  return {
    len: 4,
    execute: process => {
      process.setTimer(timer, eventId);
    },
  };
}

function cmdSetTo(game: Game, reader: ScriptReader): CommandBuilder {
  const sourceIndex = reader.readUint16(0);
  const targetIndex = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.setVariable(targetIndex, game.getVariable(sourceIndex));
    },
  };
}
