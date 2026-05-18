import type { Game } from '@/game/game';
import { toInt16 } from '@/utils/integer';
import { createLogger } from '@/utils/logger';
import type { CommandBuilder } from '../script-command-builder';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

const IGNORE_SET_FIGHT_MISS = false;
const logger = createLogger('脚本命令');

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
    case COMMAND.ACTORLEVELUP:
      return cmdActorLevelUp(game, reader);
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
      runtime.enterFight(
        { roundMax, monsterTypes, background, eventRounds, eventIds, lossAddress, winAddress },
        process
      );
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
      if (!player || !magic) {
        logger.warn('角色', `LEARNMAGIC 已跳过，角色=${actorId} 法术=${type}:${index}`);
        return;
      }
      player.learnMagic(magic);
      logger.log('角色', `LEARNMAGIC ${player.name} 学会 ${magic.name} ${type}:${index}`);
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
      if (!player) {
        logger.warn('角色', `RESUMEACTORHP 已跳过，角色=${actorId}`);
        return;
      }
      const before = player.hp;
      if (value < 1 || value > 100) {
        logger.warn('角色', `RESUMEACTORHP 已跳过，角色=${actorId} 百分比=${value}`);
        return;
      }
      const heal = Math.max(1, Math.trunc((player.hpMax * value) / 100));
      player.hp = Math.min(player.hpMax, player.hp + heal);
      logger.log('角色', `RESUMEACTORHP ${player.name} ${before}->${player.hp} 百分比=${value} 恢复=${heal}`);
    },
  };
}

function cmdActorLevelUp(game: Game, reader: ScriptReader): CommandBuilder {
  const actorId = reader.readUint16(0);
  const toLevel = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      const player = game.getPlayer(actorId);
      if (!player) {
        logger.warn('角色', `ACTORLEVELUP 已跳过，角色=${actorId} 目标等级=${toLevel}`);
        return;
      }
      const before = player.level;
      if (!player.levelUp(toLevel)) {
        return;
      }
      logger.log(
        '角色',
        `ACTORLEVELUP ${player.name} ${before}->${player.level} 生命=${player.hp}/${player.hpMax} 真气=${player.mp}/${player.mpMax}`
      );
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
      if (!player) {
        logger.warn('分支', `ATTRIBTEST 已跳过，角色=${actorId} 属性=${type}`);
        return;
      }
      const currentValue = player.getScriptAttribute(type);
      if (currentValue < value) {
        logger.log('分支', `ATTRIBTEST ${player.name} 属性=${type} ${currentValue}<${value} 地址=${lessAddress}`);
        process.gotoAddress(lessAddress);
      } else if (currentValue > value) {
        logger.log('分支', `ATTRIBTEST ${player.name} 属性=${type} ${currentValue}>${value} 地址=${greaterAddress}`);
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
      const player = game.getPlayer(actorId);
      if (!player) {
        logger.warn('角色', `ATTRIBSET 已跳过，角色=${actorId} 属性=${type}`);
        return;
      }
      const before = player.getScriptAttribute(type);
      player.setScriptAttribute(type, value);
      logger.log('角色', `ATTRIBSET ${player.name} 属性=${type} ${before}->${player.getScriptAttribute(type)}`);
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
      const player = game.getPlayer(actorId);
      if (!player) {
        logger.warn('角色', `ATTRIBADD 已跳过，角色=${actorId} 属性=${type} 值=${value}`);
        return;
      }
      const before = player.getScriptAttribute(type);
      player.addScriptAttribute(type, value);
      logger.log('角色', `ATTRIBADD ${player.name} 属性=${type} ${before}+${value}=${player.getScriptAttribute(type)}`);
    },
  };
}

function cmdSetFightMiss(game: Game, reader: ScriptReader): CommandBuilder {
  const enabled = reader.readUint16(0) === 1;
  return {
    len: 2,
    execute: () => {
      if (IGNORE_SET_FIGHT_MISS) {
        logger.warn('战斗', `SETFIGHTMISS 已忽略，开启=${enabled}`);
        return;
      }
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
