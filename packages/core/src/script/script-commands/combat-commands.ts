import type { Game } from '@/game/game';
import { toInt16 } from '@/shared/integer';
import type { CommandBuilder } from '../script-command-builder';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

const IGNORE_SET_FIGHT_MISS = false;

export function compileCombatCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder | null {
  switch (opcode) {
    case COMMAND.INITFIGHT:
      return cmdInitFight(game, reader);
    case COMMAND.FIGHTENABLE:
      return cmdFightEnable(game);
    case COMMAND.FIGHTDISENABLE:
      return cmdFightDisable(game);
    case COMMAND.ENTERFIGHT:
      return cmdEnterFight(game, reader);
    case COMMAND.LEARNMAGIC:
      return cmdLearnMagic(game, reader);
    case COMMAND.RESUMEACTORHP:
      return cmdResumeActorHp(game, reader);
    case COMMAND.ACTORLAYERUP:
      return cmdActorLayerUp(game, reader);
    case COMMAND.ATTRIBTEST:
      return cmdAttribTest(game, reader);
    case COMMAND.ATTRIBSET:
      return cmdAttribSet(game, reader);
    case COMMAND.ATTRIBADD:
      return cmdAttribAdd(game, reader);
    case COMMAND.SETFIGHTMISS:
      return cmdSetFightMiss(game, reader);
    case COMMAND.SETARMSTOSS:
      return cmdSetArmsToss(game, reader);
    default:
      return null;
  }
}

function cmdInitFight(game: Game, reader: ScriptReader): CommandBuilder {
  const monsterTypes = Array.from({ length: 8 }, (_, i) => reader.readUint16(i * 2));
  const scrb = reader.readUint16(16);
  const scrl = reader.readUint16(18);
  const scrr = reader.readUint16(20);

  return {
    len: 22,
    execute: () => {
      const runtime = game.mainSceneRuntime;
      if (!runtime) throw new Error('主场景运行时不存在，无法初始化战斗');
      runtime.initFight({ monsterTypes, scrb, scrl, scrr });
    },
  };
}

function cmdFightEnable(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: () => {
      const runtime = game.mainSceneRuntime;
      if (!runtime) throw new Error('主场景运行时不存在，无法开启战斗');
      runtime.fightEnable();
    },
  };
}

function cmdFightDisable(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: () => {
      const runtime = game.mainSceneRuntime;
      if (!runtime) throw new Error('主场景运行时不存在，无法关闭战斗');
      runtime.fightDisable();
    },
  };
}

function cmdEnterFight(game: Game, reader: ScriptReader): CommandBuilder {
  const roundMax = reader.readUint16(0);
  const monsterTypes = [reader.readUint16(2), reader.readUint16(4), reader.readUint16(6)];
  const background = {
    scrb: reader.readUint16(8),
    scrl: reader.readUint16(10),
    scrr: reader.readUint16(12),
  };
  const eventRounds = [reader.readUint16(14), reader.readUint16(16), reader.readUint16(18)];
  const eventIds = [reader.readUint16(20), reader.readUint16(22), reader.readUint16(24)];
  const lossAddress = reader.readUint16(26);
  const winAddress = reader.readUint16(28);

  return {
    len: 30,
    execute: process => {
      const runtime = game.mainSceneRuntime;
      if (!runtime) throw new Error('主场景运行时不存在，无法进入战斗');
      runtime.enterFight({ roundMax, monsterTypes, background, eventRounds, eventIds, lossAddress, winAddress }, process);
    },
  };
}

function cmdLearnMagic(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const type = reader.readUint16(2);
  const index = reader.readUint16(4);

  return {
    len: 6,
    execute: () => {
      const player = game.getPlayer(actorId);
      const magic = game.datLib.getMagic(type, index);
      if (!player || !magic) return;
      player.learnMagic(magic);
      game.mainScene?.showTip(`${player.name}学会:${magic.name}`);
    },
  };
}

function cmdResumeActorHp(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const value = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      const player = game.getPlayer(actorId);
      if (!player) return;
      player.hp = Math.trunc((player.hpMax * value) / 100);
    },
  };
}

function cmdActorLayerUp(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const toLevel = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      const player = game.getPlayer(actorId);
      if (!player || !player.levelUp(toLevel)) return;
      game.mainScene?.showTip(`${player.name}修行提升`);
    },
  };
}

function cmdAttribTest(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const type = reader.readUint16(2);
  const value = reader.readUint16(4);
  const lessAddress = reader.readUint16(6);
  const greaterAddress = reader.readUint16(8);

  return {
    len: 10,
    execute: process => {
      const player = game.getPlayer(actorId);
      if (!player) return;
      const currentValue = player.getScriptAttribute(type);
      if (currentValue < value) {
        process.gotoAddress(lessAddress);
      } else if (currentValue > value) {
        process.gotoAddress(greaterAddress);
      }
    },
  };
}

function cmdAttribSet(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const type = reader.readUint16(2);
  const value = reader.readUint16(4);

  return {
    len: 6,
    execute: () => {
      game.getPlayer(actorId)?.setScriptAttribute(type, value);
    },
  };
}

function cmdAttribAdd(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const type = reader.readUint16(2);
  const value = toInt16(reader.readUint16(4));

  return {
    len: 6,
    execute: () => {
      game.getPlayer(actorId)?.addScriptAttribute(type, value);
    },
  };
}

function cmdSetFightMiss(game: Game, reader: ScriptReader): CommandBuilder {
  const enabled = reader.readUint16(0) === 1;
  return {
    len: 2,
    execute: () => {
      if (IGNORE_SET_FIGHT_MISS) return;
      game.state.allowFightMiss = enabled;
    },
  };
}

function cmdSetArmsToss(game: Game, reader: ScriptReader): CommandBuilder {
  const enabled = reader.readUint16(0) === 1;
  return {
    len: 2,
    execute: () => {
      game.state.allowTossArm = enabled;
    },
  };
}
