import type { Game } from '@/game/game';
import { SaveLoadOperation, ScreenSaveLoadGame } from '@/screens/main-game/menu/screen-save-load-game';
import { ScriptChoiceScreen, ScriptMenuScreen } from '@/screens/main-game/script';
import type { CommandBuilder } from '../script-command';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

export function compileUiCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder | null {
  switch (opcode) {
    case COMMAND.SAY:
      return cmdSay(game, reader);
    case COMMAND.CHOICE:
      return cmdChoice(game, reader);
    case COMMAND.MESSAGE:
      return cmdMessage(game, reader);
    case COMMAND.SHOWGUT:
      return cmdShowGut(game, reader);
    case COMMAND.MENU:
      return cmdMenu(game, reader);
    case COMMAND.TIMEMSG:
      return cmdTimedMessage(game, reader);
    case COMMAND.DISABLESAVE:
      return cmdSetSaveDisabled(game, true);
    case COMMAND.ENABLESAVE:
      return cmdSetSaveDisabled(game, false);
    case COMMAND.GAMESAVE:
      return cmdGameSave(game);
    case COMMAND.ENABLESHOWPOS:
      return cmdSetShowPosition(game, true);
    case COMMAND.DISABLESHOWPOS:
      return cmdSetShowPosition(game, false);
    default:
      return null;
  }
}

function cmdSay(game: Game, reader: ScriptReader): CommandBuilder {
  const headImageIndex = reader.readUint16(0);
  const message = reader.readCString(2);
  const text = message.text;

  return {
    len: message.byteLength + 2,
    execute: process => {
      const scene = game.mainScene;
      if (!scene || text.length === 0) return;
      process.pause();
      scene.showDialogue(
        text,
        () => {
          process.start();
        },
        headImageIndex
      );
    },
  };
}

function cmdChoice(game: Game, reader: ScriptReader): CommandBuilder {
  const firstChoiceValue = reader.readCString(0);
  const secondChoiceValue = reader.readCString(firstChoiceValue.byteLength);
  const firstChoice = firstChoiceValue.text;
  const secondChoice = secondChoiceValue.text;
  const address = reader.readUint16(firstChoiceValue.byteLength + secondChoiceValue.byteLength);

  return {
    len: firstChoiceValue.byteLength + secondChoiceValue.byteLength + 2,
    execute: process => {
      const scene = game.mainScene;
      if (!scene) throw new Error('主场景不存在，无法打开脚本选择框');
      process.pause();
      scene.screenStack.push(
        new ScriptChoiceScreen(game, firstChoice, secondChoice, choiceIndex => {
          if (choiceIndex === 1) process.gotoAddress(address);
          process.start();
        })
      );
    },
  };
}

function cmdMessage(game: Game, reader: ScriptReader): CommandBuilder {
  const message = reader.readCString(0);
  const text = message.text;

  return {
    len: message.byteLength,
    execute: process => {
      const scene = game.mainScene;
      if (!scene || text.length === 0) return;
      process.pause();
      scene.showDialogue(text, () => {
        process.start();
      });
    },
  };
}

function cmdShowGut(game: Game, reader: ScriptReader): CommandBuilder {
  const topImageIndex = reader.readUint16(0);
  const bottomImageIndex = reader.readUint16(2);
  const message = reader.readCString(4);
  const text = message.text;

  return {
    len: message.byteLength + 4,
    execute: process => {
      const scene = game.mainScene;
      if (!scene) return;
      process.pause();
      scene.showGut(topImageIndex, bottomImageIndex, text, () => {
        process.start();
      });
    },
  };
}

function cmdMenu(game: Game, reader: ScriptReader): CommandBuilder {
  const variableIndex = reader.readUint16(0);
  const menuText = reader.readCString(2);
  const items = menuText.text.split(' ').filter(item => item.length > 0);

  return {
    len: 2 + menuText.byteLength,
    execute: process => {
      const scene = game.mainScene;
      if (!scene) throw new Error('主场景不存在，无法打开脚本菜单');
      process.pause();
      scene.screenStack.push(
        new ScriptMenuScreen(game, items, menuValue => {
          game.setVariable(variableIndex, menuValue);
          process.start();
        })
      );
    },
  };
}

function cmdTimedMessage(game: Game, reader: ScriptReader): CommandBuilder {
  const duration = reader.readUint16(0);
  const message = reader.readCString(2);
  const text = message.text;

  return {
    len: message.byteLength + 2,
    execute: process => {
      const scene = game.mainScene;
      if (!scene || text.length === 0) return;
      process.pause();
      scene.showTimedMessage(text, duration * 10, () => {
        process.start();
      });
    },
  };
}

function cmdSetSaveDisabled(game: Game, disabled: boolean): CommandBuilder {
  return {
    len: 0,
    execute: () => {
      game.setSaveDisabled(disabled);
    },
  };
}

function cmdGameSave(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: process => {
      const scene = game.mainScene;
      if (!scene) throw new Error('主场景不存在，无法打开脚本存档页');
      if (game.state.disableSave) {
        scene.showMessage('当前不能存档');
        return;
      }
      if (process.parent) {
        scene.showMessage('副本中不能存档');
        return;
      }
      // 脚本存档点会先暂停当前指令，存档快照记录的是下一条指令的位置。
      process.pauseForSave();
      scene.screenStack.push(
        new ScreenSaveLoadGame(
          game,
          SaveLoadOperation.Save,
          () => process.start(),
          () => process.start()
        )
      );
    },
  };
}

function cmdSetShowPosition(game: Game, enabled: boolean): CommandBuilder {
  return {
    len: 0,
    execute: () => {
      game.state.showPosition = enabled;
    },
  };
}
