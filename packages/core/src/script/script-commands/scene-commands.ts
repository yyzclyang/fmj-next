import type { Game } from '@/game/game';
import type { CommandBuilder } from '../script-command';
import { toNpcStepDirection } from '../script-direction';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

export function compileSceneCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder | null {
  switch (opcode) {
    case COMMAND.LOADMAP:
      return cmdLoadMap(game, reader);
    case COMMAND.CREATEACTOR:
      return cmdCreateActor(game, reader);
    case COMMAND.DELETENPC:
      return cmdDeleteNpc(game, reader);
    case COMMAND.ACTOREVENT:
      return cmdActorEvent(game, reader);
    case COMMAND.MOVE:
      return cmdMove(game, reader);
    case COMMAND.ACTORMOVE:
      return cmdMove(game, reader);
    case COMMAND.ACTORSPEED:
      return cmdActorSpeed(game, reader);
    case COMMAND.STARTCHAPTER:
      return cmdStartChapter(game, reader);
    case COMMAND.CREATEBOX:
      return cmdCreateBox(game, reader);
    case COMMAND.DELETEBOX:
      return cmdDeleteBox(game, reader);
    case COMMAND.CREATENPC:
      return cmdCreateNpc(game, reader);
    case COMMAND.DELETEACTOR:
      return cmdDeleteActor(game, reader);
    case COMMAND.BOXOPEN:
      return cmdBoxOpen(game, reader);
    case COMMAND.NPCSTEP:
      return cmdNpcStep(game, reader);
    case COMMAND.SETSCENENAME:
      return cmdSetSceneName(game, reader);
    case COMMAND.SHOWSCENENAME:
      return cmdShowSceneName(game);
    case COMMAND.SHOWSCREEN:
      return cmdShowScreen(game);
    default:
      return null;
  }
}

function cmdLoadMap(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);
  const x = reader.readUint16(4);
  const y = reader.readUint16(6);

  return {
    len: 8,
    execute: () => {
      game.mainSceneRuntime?.loadMap(type, index, x - 5, y - 2);
    },
  };
}

function cmdCreateActor(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const x = reader.readUint16(2) + 5;
  const y = reader.readUint16(4) + 2;

  return {
    len: 6,
    execute: () => {
      game.mainSceneRuntime?.createActor(actorId, x, y);
    },
  };
}

function cmdDeleteNpc(game: Game, reader: ScriptReader): CommandBuilder {
  const npcId = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      game.mainSceneRuntime?.deleteNpc(npcId);
    },
  };
}

function cmdActorEvent(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const eventId = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.mainSceneRuntime?.setActorEvent(actorId, eventId);
    },
  };
}

function cmdMove(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const x = reader.readUint16(2);
  const y = reader.readUint16(4);

  return {
    len: 6,
    execute: process => {
      const runtime = game.mainSceneRuntime;
      const operation = runtime?.createMoveActorOperation(actorId, x, y);
      if (!operation) {
        runtime?.moveActor(actorId, x, y);
        return;
      }
      process.wait(operation);
    },
  };
}

function cmdActorSpeed(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const speed = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      game.mainSceneRuntime?.setActorMoveInterval(actorId, speed);
    },
  };
}

function cmdStartChapter(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint8(0);
  const index = reader.readUint8(2);

  return {
    len: 4,
    execute: () => {
      game.mainSceneRuntime?.startChapter(type, index);
    },
  };
}

function cmdCreateBox(game: Game, reader: ScriptReader): CommandBuilder {
  const id = reader.readUint16(0);
  const resId = reader.readUint16(2);
  const x = reader.readUint16(4);
  const y = reader.readUint16(6);

  return {
    len: 8,
    execute: () => {
      game.mainSceneRuntime?.createBox(id, resId, x, y);
    },
  };
}

function cmdDeleteBox(game: Game, reader: ScriptReader): CommandBuilder {
  const id = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      game.mainSceneRuntime?.deleteBox(id);
    },
  };
}

function cmdCreateNpc(game: Game, reader: ScriptReader): CommandBuilder {
  const id = reader.readUint16(0);
  const resId = reader.readUint16(2);
  const x = reader.readUint16(4);
  const y = reader.readUint16(6);

  return {
    len: 8,
    execute: () => {
      game.mainSceneRuntime?.createNpc(id, resId, x, y);
    },
  };
}

function cmdDeleteActor(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      game.mainSceneRuntime?.deleteActor(actorId);
    },
  };
}

function cmdBoxOpen(game: Game, reader: ScriptReader): CommandBuilder {
  const id = reader.readUint16(0);

  return {
    len: 2,
    execute: () => {
      game.mainSceneRuntime?.openBox(id);
    },
  };
}

function cmdNpcStep(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const faceTo = reader.readUint16(2);
  const step = reader.readUint16(4);

  return {
    len: 6,
    execute: process => {
      const operation = game.mainSceneRuntime?.createActorPoseOperation(actorId, toNpcStepDirection(faceTo), step);
      if (!operation) return;
      process.wait(operation);
    },
  };
}

function cmdSetSceneName(game: Game, reader: ScriptReader): CommandBuilder {
  const sceneName = reader.readCString(0);
  const name = sceneName.text;

  return {
    len: sceneName.byteLength,
    execute: () => {
      game.mainSceneRuntime?.setSceneName(name);
    },
  };
}

function cmdShowSceneName(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: () => {
      const scene = game.mainScene;
      const name = game.state.sceneName.trim();
      if (!scene || name.length === 0) return;
      scene.showTip(name, 'information');
    },
  };
}

function cmdShowScreen(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: () => {
      game.mainSceneRuntime?.clearOverlay();
    },
  };
}
