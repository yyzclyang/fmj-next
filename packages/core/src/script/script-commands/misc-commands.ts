import type { Game } from '@/game/game';
import type { CommandBuilder } from '../script-command-builder';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

export function compileMiscCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder | null {
  switch (opcode) {
    case COMMAND.MUSIC:
      return cmdMusic(game, reader);
    case COMMAND.MAPEVENT:
      return cmdMapEvent(reader);
    case COMMAND.SCREENR:
      return cmdIgnoredScreenFilter('SCREENR');
    case COMMAND.SCREENS:
      return cmdSetMapScreen(game, reader);
    case COMMAND.SCREENA:
      return cmdIgnoredScreenFilter('SCREENA');
    case COMMAND.SETCONTROLID:
      return cmdSetControlPlayer(game, reader);
    case COMMAND.FACETOFACE:
      return cmdFaceToFace(game, reader);
    case COMMAND.MOVIE:
      return cmdMovie(game, reader);
    case COMMAND.GAMEOVER:
      return cmdGameOver(game);
    case COMMAND.NPCMOVEMOD:
      return cmdNpcMoveMode(game, reader);
    case COMMAND.DELALLNPC:
      return cmdDeleteAllNpc(game);
    default:
      return null;
  }
}

function cmdMusic(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.playMusic(type, index);
    },
  };
}

function cmdMapEvent(reader: ScriptReader): CommandBuilder {
  const eventId = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      // Kotlin 与 C 基线都没有落地该指令；保留解析和兼容执行，避免破坏脚本流。
      void eventId;
    },
  };
}

function cmdIgnoredScreenFilter(commandName: string): CommandBuilder {
  return {
    len: 1,
    // C/Kotlin 基线都没有实际屏幕滤镜，这里只消耗 opcode 参数。
    execute: () => void commandName,
  };
}

function cmdSetMapScreen(game: Game, reader: ScriptReader): CommandBuilder {
  const screenX = reader.readUint16(0);
  const screenY = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.mainSceneRuntime?.setMapScreenPosition(screenX, screenY);
    },
  };
}

function cmdSetControlPlayer(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      game.mainSceneRuntime?.setControlPlayer(actorId);
    },
  };
}

function cmdFaceToFace(game: Game, reader: ScriptReader): CommandBuilder {
  const sourceId = reader.readUint16(0);
  const targetId = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.mainSceneRuntime?.faceActorTowardActor(targetId, sourceId);
    },
  };
}

function cmdMovie(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);
  const x = reader.readUint16(4);
  const y = reader.readUint16(6);
  const controlFlags = reader.readUint16(8);

  return {
    len: 10,
    execute: process => {
      game.mainSceneRuntime?.playMovie({ type, index, x, y, controlFlags }, process);
    },
  };
}

function cmdGameOver(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: process => {
      process.stop();
      game.returnToMenu();
    },
  };
}

function cmdNpcMoveMode(game: Game, reader: ScriptReader): CommandBuilder {
  const id = reader.readUint16(0);
  const state = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.mainSceneRuntime?.setNpcMoveMode(id, state);
    },
  };
}

function cmdDeleteAllNpc(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: () => {
      game.mainSceneRuntime?.deleteAllNpc();
    },
  };
}
