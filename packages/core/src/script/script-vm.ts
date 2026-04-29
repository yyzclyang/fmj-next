import type { Game } from '@/game/game';
import { ResGut } from '@/lib/res-gut';
import { ResourceType, readGbkString, readUint16, readUint32 } from '@/lib/resource-utils';
import { SaveLoadOperation, ScreenSaveLoadGame } from '@/screens/main-game/menu/screen-save-load-game';
import {
  createScriptBuyGoodsScreen,
  createScriptSaleGoodsScreen,
  ScriptChoiceScreen,
  ScriptMenuScreen,
} from '@/screens/main-game/script';
import { KeyCode } from '@/shared/key-code';
import { ScriptProcess } from './script-process';

const COMMAND = {
  MUSIC: 0,
  LOADMAP: 1,
  CREATEACTOR: 2,
  DELETENPC: 3,
  MAPEVENT: 4,
  ACTOREVENT: 5,
  MOVE: 6,
  ACTORMOVE: 7,
  ACTORSPEED: 8,
  CALLBACK: 9,
  GOTO: 10,
  IF: 11,
  SET: 12,
  SAY: 13,
  STARTCHAPTER: 14,
  SCREENR: 15,
  SCREENS: 16,
  SCREENA: 17,
  EVENT: 18,
  MONEY: 19,
  GAMEOVER: 20,
  IFCMP: 21,
  ADD: 22,
  SUB: 23,
  SETCONTROLID: 24,
  GUTEVENT: 25,
  SETEVENT: 26,
  CLREVENT: 27,
  BUY: 28,
  FACETOFACE: 29,
  MOVIE: 30,
  CHOICE: 31,
  CREATEBOX: 32,
  DELETEBOX: 33,
  GAINGOODS: 34,
  INITFIGHT: 35,
  FIGHTENABLE: 36,
  FIGHTDISENABLE: 37,
  CREATENPC: 38,
  ENTERFIGHT: 39,
  DELETEACTOR: 40,
  GAINMONEY: 41,
  USEMONEY: 42,
  SETMONEY: 43,
  LEARNMAGIC: 44,
  SALE: 45,
  NPCMOVEMOD: 46,
  MESSAGE: 47,
  DELETEGOODS: 48,
  RESUMEACTORHP: 49,
  ACTORLAYERUP: 50,
  BOXOPEN: 51,
  DELALLNPC: 52,
  NPCSTEP: 53,
  SETSCENENAME: 54,
  SHOWSCENENAME: 55,
  SHOWSCREEN: 56,
  USEGOODS: 57,
  ATTRIBTEST: 58,
  ATTRIBSET: 59,
  ATTRIBADD: 60,
  SHOWGUT: 61,
  USEGOODSNUM: 62,
  RANDRADE: 63,
  MENU: 64,
  TESTMONEY: 65,
  CALLCHAPTER: 66,
  DISCMP: 67,
  RETURN: 68,
  TIMEMSG: 69,
  DISABLESAVE: 70,
  ENABLESAVE: 71,
  GAMESAVE: 72,
  SETEVENTTIMER: 73,
  ENABLESHOWPOS: 74,
  DISABLESHOWPOS: 75,
  SETTO: 76,
  TESTGOODSNUM: 77,
  SETFIGHTMISS: 78,
  SETARMSTOSS: 79,
} as const;

type CommandBuilder = {
  readonly len: number;
  readonly execute: (process: ScriptProcess) => void;
};

type Facing = typeof KeyCode.Up | typeof KeyCode.Down | typeof KeyCode.Left | typeof KeyCode.Right;

// 当前只迁移有明确运行时语义的脚本指令；菜单、战斗等依赖子系统的指令后续补齐。
export class ScriptVm {
  constructor(private readonly game: Game) {}

  loadScript(type: number, index: number): ScriptProcess {
    const res = this.game.datLib.getRes(ResourceType.GUT, type, index);
    if (!(res instanceof ResGut)) {
      return new ScriptProcess([], [], new Map<number, number>(), 0);
    }

    return this.compile(res);
  }

  private compile(gut: ResGut): ScriptProcess {
    const commands: CommandBuilder[] = [];
    const addressIndexMap = new Map<number, number>();
    const code = gut.scriptData;
    let pointer = 0;

    while (pointer < code.length) {
      addressIndexMap.set(pointer, commands.length);
      const opcode = code[pointer] ?? 0;
      const command = this.compileCommand(code, pointer, opcode);
      commands.push(command);
      pointer += command.len + 1;
    }

    const headerSize = gut.sceneEvent.length * 2 + 3;
    const eventIndex = gut.sceneEvent.map(address => {
      if (address === 0) return -1;
      return addressIndexMap.get(address - headerSize) ?? -1;
    });

    return new ScriptProcess(commands, eventIndex, addressIndexMap, headerSize);
  }

  private compileCommand(code: Uint8Array, pointer: number, opcode: number): CommandBuilder {
    const start = pointer + 1;

    switch (opcode) {
      case COMMAND.MUSIC:
        return this.cmdMusic(code, start);
      case COMMAND.LOADMAP:
        return this.cmdLoadMap(code, start);
      case COMMAND.CREATEACTOR:
        return this.cmdCreateActor(code, start);
      case COMMAND.DELETENPC:
        return this.cmdDeleteNpc(code, start);
      case COMMAND.MAPEVENT:
        return this.makeNoopCommand(2);
      case COMMAND.ACTOREVENT:
        return this.makeNoopCommand(4);
      case COMMAND.MOVE:
        return this.cmdMove(code, start);
      case COMMAND.ACTORMOVE:
        return this.makeNoopCommand(6);
      case COMMAND.ACTORSPEED:
        return this.makeNoopCommand(4);
      case COMMAND.CALLBACK:
        return {
          len: 0,
          execute: process => {
            process.stop();
          },
        };
      case COMMAND.GOTO:
        return this.cmdGoto(code, start);
      case COMMAND.IF:
        return this.cmdIf(code, start);
      case COMMAND.SET:
        return this.cmdSet(code, start);
      case COMMAND.SAY:
        return this.cmdSay(code, start);
      case COMMAND.STARTCHAPTER:
        return this.cmdStartChapter(code, start);
      case COMMAND.SCREENR:
        return this.makeNoopCommand(1);
      case COMMAND.SCREENS:
        return this.cmdSetMapScreen(code, start);
      case COMMAND.SCREENA:
        return this.makeNoopCommand(1);
      case COMMAND.EVENT:
        return this.cmdEvent(code, start);
      case COMMAND.MONEY:
        return this.cmdSetMoney(code, start);
      case COMMAND.GAMEOVER:
        return this.makeNoopCommand(0);
      case COMMAND.IFCMP:
        return this.cmdIfCmp(code, start);
      case COMMAND.ADD:
        return this.cmdAdd(code, start);
      case COMMAND.SUB:
        return this.cmdSub(code, start);
      case COMMAND.SETCONTROLID:
        return this.cmdSetControlPlayer(code, start);
      case COMMAND.GUTEVENT:
        return this.makeNoopCommand(4);
      case COMMAND.SETEVENT:
        return this.cmdSetEvent(code, start);
      case COMMAND.CLREVENT:
        return this.cmdClearEvent(code, start);
      case COMMAND.BUY:
        return this.cmdBuy(code, start);
      case COMMAND.FACETOFACE:
        return this.cmdFaceToFace(code, start);
      case COMMAND.MOVIE:
        return this.cmdMovie(code, start);
      case COMMAND.CHOICE:
        return this.cmdChoice(code, start);
      case COMMAND.CREATEBOX:
        return this.cmdCreateBox(code, start);
      case COMMAND.DELETEBOX:
        return this.cmdDeleteBox(code, start);
      case COMMAND.GAINGOODS:
        return this.cmdGainGoods(code, start);
      case COMMAND.INITFIGHT:
        return this.cmdInitFight(code, start);
      case COMMAND.FIGHTENABLE:
        return this.cmdFightEnable();
      case COMMAND.FIGHTDISENABLE:
        return this.cmdFightDisable();
      case COMMAND.CREATENPC:
        return this.cmdCreateNpc(code, start);
      case COMMAND.ENTERFIGHT:
        return this.cmdEnterFight(code, start);
      case COMMAND.DELETEACTOR:
        return this.cmdDeleteActor(code, start);
      case COMMAND.GAINMONEY:
        return this.cmdGainMoney(code, start);
      case COMMAND.USEMONEY:
        return this.cmdUseMoney(code, start);
      case COMMAND.SETMONEY:
        return this.cmdSetMoney(code, start);
      case COMMAND.LEARNMAGIC:
        return this.cmdLearnMagic(code, start);
      case COMMAND.SALE:
        return this.cmdSale();
      case COMMAND.NPCMOVEMOD:
        return this.cmdNpcMoveMode(code, start);
      case COMMAND.MESSAGE:
        return this.cmdMessage(code, start);
      case COMMAND.DELETEGOODS:
        return this.cmdDeleteGoods(code, start);
      case COMMAND.RESUMEACTORHP:
        return this.cmdResumeActorHp(code, start);
      case COMMAND.ACTORLAYERUP:
        return this.cmdActorLayerUp(code, start);
      case COMMAND.DELALLNPC:
        return {
          len: 0,
          execute: () => {
            this.game.mainSceneRuntime?.deleteAllNpc();
          },
        };
      case COMMAND.BOXOPEN:
        return this.cmdBoxOpen(code, start);
      case COMMAND.NPCSTEP:
        return this.cmdNpcStep(code, start);
      case COMMAND.SETSCENENAME:
        return this.cmdSetSceneName(code, start);
      case COMMAND.SHOWSCENENAME:
        return this.cmdShowSceneName();
      case COMMAND.SHOWSCREEN:
        return this.makeNoopCommand(0);
      case COMMAND.USEGOODS:
        return this.cmdUseGoods(code, start);
      case COMMAND.ATTRIBTEST:
        return this.cmdAttribTest(code, start);
      case COMMAND.ATTRIBSET:
        return this.cmdAttribSet(code, start);
      case COMMAND.ATTRIBADD:
        return this.cmdAttribAdd(code, start);
      case COMMAND.SHOWGUT:
        return this.cmdShowGut(code, start);
      case COMMAND.USEGOODSNUM:
        return this.cmdUseGoodsNum(code, start);
      case COMMAND.RANDRADE:
        return this.cmdRandRate(code, start);
      case COMMAND.MENU:
        return this.cmdMenu(code, start);
      case COMMAND.TESTMONEY:
        return this.cmdTestMoney(code, start);
      case COMMAND.CALLCHAPTER:
        return this.cmdCallChapter(code, start);
      case COMMAND.DISCMP:
        return this.cmdDisCmp(code, start);
      case COMMAND.RETURN:
        return this.cmdReturn();
      case COMMAND.TIMEMSG:
        return this.cmdTimedMessage(code, start);
      case COMMAND.DISABLESAVE:
        return this.cmdSetSaveDisabled(true);
      case COMMAND.ENABLESAVE:
        return this.cmdSetSaveDisabled(false);
      case COMMAND.GAMESAVE:
        return this.cmdGameSave();
      case COMMAND.SETEVENTTIMER:
        return this.cmdSetEventTimer(code, start);
      case COMMAND.ENABLESHOWPOS:
      case COMMAND.DISABLESHOWPOS:
        return this.makeNoopCommand(0);
      case COMMAND.SETTO:
        return this.cmdSetTo(code, start);
      case COMMAND.TESTGOODSNUM:
        return this.cmdTestGoodsNum(code, start);
      case COMMAND.SETFIGHTMISS:
        return this.cmdSetFightMiss(code, start);
      case COMMAND.SETARMSTOSS:
        return this.cmdSetArmsToss(code, start);
      default:
        throw new Error(`Unsupported script opcode ${opcode}`);
    }
  }

  private cmdLoadMap(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);
    const x = readUint16(code, start + 4);
    const y = readUint16(code, start + 6);

    return {
      len: 8,
      execute: () => {
        this.game.mainSceneRuntime?.loadMap(type, index, x - 5, y - 2);
      },
    };
  }

  private cmdMusic(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.playMusic(type, index);
      },
    };
  }

  private cmdCreateActor(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const x = readUint16(code, start + 2) + 5;
    const y = readUint16(code, start + 4) + 2;

    return {
      len: 6,
      execute: () => {
        this.game.mainSceneRuntime?.createActor(actorId, x, y);
      },
    };
  }

  private cmdDeleteNpc(code: Uint8Array, start: number): CommandBuilder {
    const npcId = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.deleteNpc(npcId);
      },
    };
  }

  private cmdMove(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const x = readUint16(code, start + 2);
    const y = readUint16(code, start + 4);

    return {
      len: 6,
      execute: process => {
        const runtime = this.game.mainSceneRuntime;
        const operation = runtime?.createMoveActorOperation(actorId, x, y);
        if (!operation) {
          runtime?.moveActor(actorId, x, y);
          return;
        }
        process.wait(operation);
      },
    };
  }

  private cmdIf(code: Uint8Array, start: number): CommandBuilder {
    const eventId = readUint16(code, start);
    const address = readUint16(code, start + 2);

    return {
      len: 4,
      execute: process => {
        const boxKey = this.game.consumePendingBoxEvent();
        if (boxKey) {
          this.game.rememberBoxEvent(boxKey, eventId);
        }
        if (this.game.hasEvent(eventId)) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdGoto(code: Uint8Array, start: number): CommandBuilder {
    const address = readUint16(code, start);

    return {
      len: 2,
      execute: process => {
        process.gotoAddress(address);
      },
    };
  }

  private cmdSet(code: Uint8Array, start: number): CommandBuilder {
    const index = readUint16(code, start);
    const value = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.setVariable(index, value);
      },
    };
  }

  private cmdIfCmp(code: Uint8Array, start: number): CommandBuilder {
    const index = readUint16(code, start);
    const value = readUint16(code, start + 2);
    const address = readUint16(code, start + 4);

    return {
      len: 6,
      execute: process => {
        if (this.game.getVariable(index) === value) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdAdd(code: Uint8Array, start: number): CommandBuilder {
    const index = readUint16(code, start);
    const value = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.addVariable(index, value);
      },
    };
  }

  private cmdSub(code: Uint8Array, start: number): CommandBuilder {
    const index = readUint16(code, start);
    const value = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.subVariable(index, value);
      },
    };
  }

  private cmdSetControlPlayer(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.setControlPlayer(actorId);
      },
    };
  }

  private cmdSetTo(code: Uint8Array, start: number): CommandBuilder {
    const sourceIndex = readUint16(code, start);
    const targetIndex = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.setVariable(targetIndex, this.game.getVariable(sourceIndex));
      },
    };
  }

  private cmdSay(code: Uint8Array, start: number): CommandBuilder {
    const len = getCStringLength(code, start + 2);
    const text = readGbkString(code, start + 2);

    return {
      len: len + 2,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene || text.length === 0) return;
        process.pause();
        scene.showDialogue(text, () => {
          process.start();
        });
      },
    };
  }

  private cmdStartChapter(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start) & 0xff;
    const index = readUint16(code, start + 2) & 0xff;

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.startChapter(type, index);
      },
    };
  }

  private cmdSetMapScreen(code: Uint8Array, start: number): CommandBuilder {
    const screenX = readUint16(code, start);
    const screenY = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.setMapScreenPosition(screenX, screenY);
      },
    };
  }

  private cmdEvent(code: Uint8Array, start: number): CommandBuilder {
    const eventId = readUint16(code, start);

    return {
      len: 2,
      execute: process => {
        if (!process.triggerEvent(eventId)) {
          process.stop();
        }
      },
    };
  }

  private cmdSetEvent(code: Uint8Array, start: number): CommandBuilder {
    const eventId = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.setEvent(eventId);
      },
    };
  }

  private cmdClearEvent(code: Uint8Array, start: number): CommandBuilder {
    const eventId = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.clearEvent(eventId);
      },
    };
  }

  private cmdBuy(code: Uint8Array, start: number): CommandBuilder {
    const len = getCStringLength(code, start);
    const goodsKeys: Array<{ type: number; index: number }> = [];

    // BUY 参数是以 index=0 结束的 [index,type] 列表，Kotlin 也是按这个顺序解析。
    for (let i = 0; i < len - 1; i += 2) {
      const index = code[start + i] ?? 0;
      if (index === 0) break;
      const type = code[start + i + 1] ?? 0;
      goodsKeys.push({ type, index });
    }

    return {
      len,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开买入菜单');
        const items = [];
        for (const { type, index } of goodsKeys) {
          const goods = this.game.datLib.getGoods(type, index);
          if (!goods) throw new Error(`BUY 指令引用了不存在的物品 type=${type}, index=${index}`);
          items.push({ goods, count: this.game.getGoodsNum(type, index) });
        }
        process.pause();
        scene.screenStack.push(
          createScriptBuyGoodsScreen(this.game, items, () => {
            process.start();
          })
        );
      },
    };
  }

  private cmdFaceToFace(code: Uint8Array, start: number): CommandBuilder {
    const sourceId = readUint16(code, start);
    const targetId = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.faceActorToActor(sourceId, targetId);
      },
    };
  }

  private cmdMovie(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);
    const x = readUint16(code, start + 4);
    const y = readUint16(code, start + 6);
    const ctl = readUint16(code, start + 8);

    return {
      len: 10,
      execute: process => {
        this.game.mainSceneRuntime?.playMovie({ type, index, x, y, ctl }, process);
      },
    };
  }

  private cmdCreateBox(code: Uint8Array, start: number): CommandBuilder {
    const id = readUint16(code, start);
    const resId = readUint16(code, start + 2);
    const x = readUint16(code, start + 4);
    const y = readUint16(code, start + 6);

    return {
      len: 8,
      execute: () => {
        this.game.mainSceneRuntime?.createBox(id, resId, x, y);
      },
    };
  }

  private cmdDeleteBox(code: Uint8Array, start: number): CommandBuilder {
    const id = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.deleteBox(id);
      },
    };
  }

  private cmdGainGoods(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        const goods = this.game.gainGoods(type, index);
        if (goods) {
          this.game.mainSceneRuntime?.collectFacingBox();
        }
      },
    };
  }

  private cmdInitFight(code: Uint8Array, start: number): CommandBuilder {
    const monsterTypes = Array.from({ length: 8 }, (_, i) => readUint16(code, start + i * 2));
    const scrb = readUint16(code, start + 16);
    const scrl = readUint16(code, start + 18);
    const scrr = readUint16(code, start + 20);

    return {
      len: 22,
      execute: () => {
        const runtime = this.game.mainSceneRuntime;
        if (!runtime) throw new Error('主场景运行时不存在，无法初始化战斗');
        runtime.initFight({ monsterTypes, scrb, scrl, scrr });
      },
    };
  }

  private cmdFightEnable(): CommandBuilder {
    return {
      len: 0,
      execute: () => {
        const runtime = this.game.mainSceneRuntime;
        if (!runtime) throw new Error('主场景运行时不存在，无法开启战斗');
        runtime.fightEnable();
      },
    };
  }

  private cmdFightDisable(): CommandBuilder {
    return {
      len: 0,
      execute: () => {
        const runtime = this.game.mainSceneRuntime;
        if (!runtime) throw new Error('主场景运行时不存在，无法关闭战斗');
        runtime.fightDisable();
      },
    };
  }

  private cmdEnterFight(code: Uint8Array, start: number): CommandBuilder {
    const roundMax = readUint16(code, start);
    const monsterTypes = [readUint16(code, start + 2), readUint16(code, start + 4), readUint16(code, start + 6)];
    const background = {
      scrb: readUint16(code, start + 8),
      scrl: readUint16(code, start + 10),
      scrr: readUint16(code, start + 12),
    };
    const eventRounds = [readUint16(code, start + 14), readUint16(code, start + 16), readUint16(code, start + 18)];
    const eventIds = [readUint16(code, start + 20), readUint16(code, start + 22), readUint16(code, start + 24)];
    const lossAddress = readUint16(code, start + 26);
    const winAddress = readUint16(code, start + 28);

    return {
      len: 30,
      execute: process => {
        const runtime = this.game.mainSceneRuntime;
        if (!runtime) throw new Error('主场景运行时不存在，无法进入战斗');
        runtime.enterFight(
          { roundMax, monsterTypes, background, eventRounds, eventIds, lossAddress, winAddress },
          process
        );
      },
    };
  }

  private cmdCreateNpc(code: Uint8Array, start: number): CommandBuilder {
    const id = readUint16(code, start);
    const resId = readUint16(code, start + 2);
    const x = readUint16(code, start + 4);
    const y = readUint16(code, start + 6);

    return {
      len: 8,
      execute: () => {
        this.game.mainSceneRuntime?.createNpc(id, resId, x, y);
      },
    };
  }

  private cmdDeleteActor(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.deleteActor(actorId);
      },
    };
  }

  private cmdGainMoney(code: Uint8Array, start: number): CommandBuilder {
    const value = readUint32(code, start);

    return {
      len: 4,
      execute: () => {
        this.game.gainMoney(value);
        this.game.mainSceneRuntime?.collectFacingBox();
      },
    };
  }

  private cmdUseMoney(code: Uint8Array, start: number): CommandBuilder {
    const value = readUint32(code, start);

    return {
      len: 4,
      execute: () => {
        this.game.useMoney(value);
      },
    };
  }

  private cmdSetMoney(code: Uint8Array, start: number): CommandBuilder {
    const value = readUint32(code, start);

    return {
      len: 4,
      execute: () => {
        this.game.setMoney(value);
      },
    };
  }

  private cmdLearnMagic(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const type = readUint16(code, start + 2);
    const index = readUint16(code, start + 4);

    return {
      len: 6,
      execute: () => {
        const player = this.game.getPlayer(actorId);
        const magic = this.game.datLib.getMagic(type, index);
        if (!player || !magic) return;
        player.learnMagic(magic);
        this.game.mainScene?.showTip(`${player.name}学会:${magic.magicName}`);
      },
    };
  }

  private cmdSale(): CommandBuilder {
    return {
      len: 0,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开卖出菜单');
        process.pause();
        scene.screenStack.push(
          createScriptSaleGoodsScreen(this.game, () => {
            process.start();
          })
        );
      },
    };
  }

  private cmdNpcMoveMode(code: Uint8Array, start: number): CommandBuilder {
    const id = readUint16(code, start);
    const state = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.setNpcMoveMode(id, state);
      },
    };
  }

  private cmdResumeActorHp(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const value = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        const player = this.game.getPlayer(actorId);
        if (!player) return;
        player.hp = Math.trunc((player.maxHp * value) / 100);
      },
    };
  }

  private cmdActorLayerUp(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const toLevel = readUint16(code, start + 2);

    return {
      len: 4,
      execute: () => {
        const player = this.game.getPlayer(actorId);
        if (!player || !player.levelUp(toLevel)) return;
        this.game.mainScene?.showTip(`${player.name}修行提升`);
      },
    };
  }

  private cmdMessage(code: Uint8Array, start: number): CommandBuilder {
    const len = getCStringLength(code, start);
    const text = readGbkString(code, start);

    return {
      len,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene || text.length === 0) return;
        process.pause();
        scene.showDialogue(text, () => {
          process.start();
        });
      },
    };
  }

  private cmdChoice(code: Uint8Array, start: number): CommandBuilder {
    const firstChoiceLength = getCStringLength(code, start);
    const secondChoiceLength = getCStringLength(code, start + firstChoiceLength);
    const firstChoice = readGbkString(code, start);
    const secondChoice = readGbkString(code, start + firstChoiceLength);
    const address = readUint16(code, start + firstChoiceLength + secondChoiceLength);

    return {
      len: firstChoiceLength + secondChoiceLength + 2,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开脚本选择框');
        process.pause();
        scene.screenStack.push(
          new ScriptChoiceScreen(this.game, firstChoice, secondChoice, selectedIndex => {
            if (selectedIndex === 1) process.gotoAddress(address);
            process.start();
          })
        );
      },
    };
  }

  private cmdTimedMessage(code: Uint8Array, start: number): CommandBuilder {
    const len = getCStringLength(code, start + 2);
    const text = readGbkString(code, start + 2);

    return {
      len: len + 2,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene || text.length === 0) return;
        process.pause();
        scene.showDialogue(text, () => {
          process.start();
        });
      },
    };
  }

  private cmdSetSaveDisabled(disabled: boolean): CommandBuilder {
    return {
      len: 0,
      execute: () => {
        this.game.setSaveDisabled(disabled);
      },
    };
  }

  private cmdGameSave(): CommandBuilder {
    return {
      len: 0,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开脚本存档页');
        if (this.game.state.disableSave) {
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
            this.game,
            SaveLoadOperation.Save,
            () => process.start(),
            () => process.start()
          )
        );
      },
    };
  }

  private cmdSetEventTimer(code: Uint8Array, start: number): CommandBuilder {
    const eventId = readUint16(code, start);
    const timer = readUint16(code, start + 2);

    return {
      len: 4,
      execute: process => {
        process.setTimer(timer, eventId);
      },
    };
  }

  private cmdSetFightMiss(code: Uint8Array, start: number): CommandBuilder {
    const enabled = readUint16(code, start) === 1;
    return {
      len: 2,
      execute: () => {
        this.game.state.allowFightMiss = enabled;
      },
    };
  }

  private cmdSetArmsToss(code: Uint8Array, start: number): CommandBuilder {
    const enabled = readUint16(code, start) === 1;
    return {
      len: 2,
      execute: () => {
        this.game.state.allowTossArm = enabled;
      },
    };
  }

  private cmdMenu(code: Uint8Array, start: number): CommandBuilder {
    const variableIndex = readUint16(code, start);
    const textLength = getCStringLength(code, start + 2);
    const items = readGbkString(code, start + 2)
      .split(' ')
      .filter(item => item.length > 0);

    return {
      len: 2 + textLength,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开脚本菜单');
        process.pause();
        scene.screenStack.push(
          new ScriptMenuScreen(this.game, items, value => {
            this.game.setVariable(variableIndex, value);
            process.start();
          })
        );
      },
    };
  }

  private cmdRandRate(code: Uint8Array, start: number): CommandBuilder {
    const rate = readUint16(code, start);
    const address = readUint16(code, start + 2);

    return {
      len: 4,
      execute: process => {
        if (Math.trunc(Math.random() * 1000) <= rate) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdTestMoney(code: Uint8Array, start: number): CommandBuilder {
    const value = readUint32(code, start);
    const address = readUint16(code, start + 4);

    return {
      len: 6,
      execute: process => {
        if (this.game.state.money < value) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdCallChapter(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);

    return {
      len: 4,
      execute: process => {
        const runtime = this.game.mainSceneRuntime;
        if (!runtime) return;
        process.pause();
        runtime.callChapter(type, index, process);
      },
    };
  }

  private cmdDisCmp(code: Uint8Array, start: number): CommandBuilder {
    const variableIndex = readUint16(code, start);
    const value = readUint16(code, start + 2);
    const lessAddress = readUint16(code, start + 4);
    const greaterAddress = readUint16(code, start + 6);

    return {
      len: 8,
      execute: process => {
        const currentValue = this.game.getVariable(variableIndex);
        if (currentValue < value) {
          process.gotoAddress(lessAddress);
        } else if (currentValue > value) {
          process.gotoAddress(greaterAddress);
        }
      },
    };
  }

  private cmdReturn(): CommandBuilder {
    return {
      len: 0,
      execute: process => {
        if (!this.game.mainSceneRuntime?.returnToParentScript(process)) {
          process.stop();
        }
      },
    };
  }

  private cmdDeleteGoods(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);
    const address = readUint16(code, start + 4);

    return {
      len: 6,
      execute: process => {
        if (!this.game.deleteGoods(type, index)) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdBoxOpen(code: Uint8Array, start: number): CommandBuilder {
    const id = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.openBox(id);
      },
    };
  }

  private cmdNpcStep(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const faceTo = readUint16(code, start + 2);
    const step = readUint16(code, start + 4);

    return {
      len: 6,
      execute: process => {
        const operation = this.game.mainSceneRuntime?.createActorPoseOperation(actorId, mapFacing(faceTo), step);
        if (!operation) return;
        process.wait(operation);
      },
    };
  }

  private cmdSetSceneName(code: Uint8Array, start: number): CommandBuilder {
    const len = getCStringLength(code, start);
    const name = readGbkString(code, start);

    return {
      len,
      execute: () => {
        this.game.mainSceneRuntime?.setSceneName(name);
      },
    };
  }

  private cmdShowSceneName(): CommandBuilder {
    return {
      len: 0,
      execute: () => {
        const scene = this.game.mainScene;
        const name = this.game.state.sceneName.trim();
        if (!scene || name.length === 0) return;
        scene.showTip(name, 'information');
      },
    };
  }

  private cmdShowGut(code: Uint8Array, start: number): CommandBuilder {
    const topImageIndex = readUint16(code, start);
    const bottomImageIndex = readUint16(code, start + 2);
    const len = getCStringLength(code, start + 4);
    const text = readGbkString(code, start + 4);

    return {
      len: len + 4,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) return;
        process.pause();
        scene.showGut(topImageIndex, bottomImageIndex, text, () => {
          process.start();
        });
      },
    };
  }

  private cmdUseGoods(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);
    const address = readUint16(code, start + 4);

    return {
      len: 6,
      execute: process => {
        if (!this.game.deleteGoods(type, index)) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdAttribTest(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const type = readUint16(code, start + 2);
    const value = readUint16(code, start + 4);
    const lessAddress = readUint16(code, start + 6);
    const greaterAddress = readUint16(code, start + 8);

    return {
      len: 10,
      execute: process => {
        const player = this.game.getPlayer(actorId);
        if (!player) return;
        const currentValue = player.getAttribute(type);
        if (currentValue < value) {
          process.gotoAddress(lessAddress);
        } else if (currentValue > value) {
          process.gotoAddress(greaterAddress);
        }
      },
    };
  }

  private cmdAttribSet(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const type = readUint16(code, start + 2);
    const value = readUint16(code, start + 4);

    return {
      len: 6,
      execute: () => {
        this.game.getPlayer(actorId)?.setAttribute(type, value);
      },
    };
  }

  private cmdAttribAdd(code: Uint8Array, start: number): CommandBuilder {
    const actorId = readUint16(code, start);
    const type = readUint16(code, start + 2);
    const value = toSignedUint16(readUint16(code, start + 4));

    return {
      len: 6,
      execute: () => {
        this.game.getPlayer(actorId)?.addAttribute(type, value);
      },
    };
  }

  private cmdUseGoodsNum(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);
    const count = readUint16(code, start + 4);
    const address = readUint16(code, start + 6);

    return {
      len: 8,
      execute: process => {
        if (!this.game.useGoodsNum(type, index, count)) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdTestGoodsNum(code: Uint8Array, start: number): CommandBuilder {
    const type = readUint16(code, start);
    const index = readUint16(code, start + 2);
    const count = readUint16(code, start + 4);
    const equalAddress = readUint16(code, start + 6);
    const greaterAddress = readUint16(code, start + 8);

    return {
      len: 10,
      execute: process => {
        const goodsNum = this.game.getGoodsNum(type, index);
        if (goodsNum === count) {
          process.gotoAddress(equalAddress);
        } else if (goodsNum > count) {
          process.gotoAddress(greaterAddress);
        }
      },
    };
  }

  private makeNoopCommand(len: number): CommandBuilder {
    return {
      len,
      execute: () => {},
    };
  }

  private makeTextNoopCommand(code: Uint8Array, start: number, dataOffset: number): CommandBuilder {
    return {
      len: dataOffset + getCStringLength(code, start + dataOffset),
      execute: () => {},
    };
  }
}

function getCStringLength(buf: Uint8Array, start: number): number {
  let end = start;
  while (end < buf.length && buf[end] !== 0) {
    end += 1;
  }
  return end - start + 1;
}

function toSignedUint16(value: number): number {
  return value >= 0x8000 ? value - 0x10000 : value;
}

function mapFacing(faceTo: number): Facing {
  switch (faceTo) {
    case 0:
      return KeyCode.Up;
    case 1:
      return KeyCode.Right;
    case 2:
      return KeyCode.Down;
    case 3:
      return KeyCode.Left;
    default:
      return KeyCode.Down;
  }
}
