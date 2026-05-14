import type { Game } from '@/game/game';
import { createLogger } from '@/utils/logger';
import type { CommandBuilder } from '../script-command-builder';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

const logger = createLogger('脚本命令');

export function compileFlowCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder | null {
  switch (opcode) {
    case COMMAND.CALLBACK:
      return {
        len: 0,
        execute: process => {
          const handled = game.mainSceneRuntime?.handleScriptCallback(process) ?? false;
          if (!handled) process.stop();
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
        logger.log('分支', `IF 事件=${eventId} 地址=${address}`);
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
      const triggered = process.triggerEvent(eventId);
      if (!triggered) {
        logger.warn('事件', `EVENT 事件=${eventId} 未触发，停止脚本`);
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
      const currentValue = game.getVariable(index);
      const matched = currentValue === value;
      if (matched) {
        logger.log('分支', `IFCMP 变量[${index}]=${currentValue}, 值=${value}, 地址=${address}`);
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
      if (!runtime) {
        logger.warn('脚本', `GUTEVENT GUT 1:${gutId} 事件=${eventId} 已跳过: 主场景运行时缺失`);
        return;
      }
      process.pause();
      const child = runtime.callChapter(1, gutId, process);
      if (!child.triggerEvent(eventId)) {
        logger.warn('脚本', `GUTEVENT 事件=${eventId} 未触发，返回父脚本`);
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
      const roll = Math.trunc(Math.random() * 1000);
      const matched = roll <= rate;
      if (matched) {
        logger.log('分支', `RANDRADE 随机=${roll}, 比率=${rate}, 地址=${address}`);
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
      if (!runtime) {
        logger.warn('脚本', `CALLCHAPTER GUT ${type}:${index} 已跳过: 主场景运行时缺失`);
        return;
      }
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
        logger.log('分支', `DISCMP 变量[${variableIndex}]=${currentValue} < ${value}, 地址=${lessAddress}`);
        process.gotoAddress(lessAddress);
      } else if (currentValue > value) {
        logger.log('分支', `DISCMP 变量[${variableIndex}]=${currentValue} > ${value}, 地址=${greaterAddress}`);
        process.gotoAddress(greaterAddress);
      }
    },
  };
}

function cmdReturn(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: process => {
      const returned = game.mainSceneRuntime?.returnToParentScript(process) ?? false;
      if (!returned) {
        logger.warn('脚本', 'RETURN 未返回父脚本，停止当前脚本');
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
      const sourceValue = game.getVariable(sourceIndex);
      game.setVariable(targetIndex, sourceValue);
    },
  };
}
