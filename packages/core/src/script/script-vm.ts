import type { Game } from '@/game/game';
import type { ResGut } from '@/lib/res-gut';
import { SaveLoadOperation, ScreenSaveLoadGame } from '@/screens/main-game/menu/screen-save-load-game';
import {
  createScriptBuyGoodsScreen,
  createScriptSaleGoodsScreen,
  ScriptChoiceScreen,
  ScriptMenuScreen,
} from '@/screens/main-game/script';
import { toInt16 } from '@/shared/integer';
import type { CommandBuilder } from './script-command';
import { toNpcStepDirection } from './script-direction';
import { COMMAND, getCommandName } from './script-opcodes';
import { type ScriptCommand, ScriptProcess } from './script-process';
import { ScriptReader } from './script-reader';

const IGNORE_SET_FIGHT_MISS = false;

// 按 Kotlin ScriptVM 指令表迁移；个别基线自身也未落地的指令在对应 cmd 中保留兼容降级说明。
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
        command = this.compileCommand(new ScriptReader(code, pointer), opcode);
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

  private compileCommand(reader: ScriptReader, opcode: number): CommandBuilder {
    switch (opcode) {
      case COMMAND.MUSIC:
        return this.cmdMusic(reader);
      case COMMAND.LOADMAP:
        return this.cmdLoadMap(reader);
      case COMMAND.CREATEACTOR:
        return this.cmdCreateActor(reader);
      case COMMAND.DELETENPC:
        return this.cmdDeleteNpc(reader);
      case COMMAND.MAPEVENT:
        return this.cmdMapEvent(reader);
      case COMMAND.ACTOREVENT:
        return this.cmdActorEvent(reader);
      case COMMAND.MOVE:
        return this.cmdMove(reader);
      case COMMAND.ACTORMOVE:
        return this.cmdActorMove(reader);
      case COMMAND.ACTORSPEED:
        return this.cmdActorSpeed(reader);
      case COMMAND.CALLBACK:
        return {
          len: 0,
          execute: process => {
            process.stop();
          },
        };
      case COMMAND.GOTO:
        return this.cmdGoto(reader);
      case COMMAND.IF:
        return this.cmdIf(reader);
      case COMMAND.SET:
        return this.cmdSet(reader);
      case COMMAND.SAY:
        return this.cmdSay(reader);
      case COMMAND.STARTCHAPTER:
        return this.cmdStartChapter(reader);
      case COMMAND.SCREENR:
        return this.cmdIgnoredScreenFilter();
      case COMMAND.SCREENS:
        return this.cmdSetMapScreen(reader);
      case COMMAND.SCREENA:
        return this.cmdIgnoredScreenFilter();
      case COMMAND.EVENT:
        return this.cmdEvent(reader);
      case COMMAND.MONEY:
        return this.cmdSetMoney(reader);
      case COMMAND.GAMEOVER:
        return this.cmdGameOver();
      case COMMAND.IFCMP:
        return this.cmdIfCmp(reader);
      case COMMAND.ADD:
        return this.cmdAdd(reader);
      case COMMAND.SUB:
        return this.cmdSub(reader);
      case COMMAND.SETCONTROLID:
        return this.cmdSetControlPlayer(reader);
      case COMMAND.GUTEVENT:
        return this.cmdGutEvent(reader);
      case COMMAND.SETEVENT:
        return this.cmdSetEvent(reader);
      case COMMAND.CLREVENT:
        return this.cmdClearEvent(reader);
      case COMMAND.BUY:
        return this.cmdBuy(reader);
      case COMMAND.FACETOFACE:
        return this.cmdFaceToFace(reader);
      case COMMAND.MOVIE:
        return this.cmdMovie(reader);
      case COMMAND.CHOICE:
        return this.cmdChoice(reader);
      case COMMAND.CREATEBOX:
        return this.cmdCreateBox(reader);
      case COMMAND.DELETEBOX:
        return this.cmdDeleteBox(reader);
      case COMMAND.GAINGOODS:
        return this.cmdGainGoods(reader);
      case COMMAND.INITFIGHT:
        return this.cmdInitFight(reader);
      case COMMAND.FIGHTENABLE:
        return this.cmdFightEnable();
      case COMMAND.FIGHTDISENABLE:
        return this.cmdFightDisable();
      case COMMAND.CREATENPC:
        return this.cmdCreateNpc(reader);
      case COMMAND.ENTERFIGHT:
        return this.cmdEnterFight(reader);
      case COMMAND.DELETEACTOR:
        return this.cmdDeleteActor(reader);
      case COMMAND.GAINMONEY:
        return this.cmdGainMoney(reader);
      case COMMAND.USEMONEY:
        return this.cmdUseMoney(reader);
      case COMMAND.SETMONEY:
        return this.cmdSetMoney(reader);
      case COMMAND.LEARNMAGIC:
        return this.cmdLearnMagic(reader);
      case COMMAND.SALE:
        return this.cmdSale();
      case COMMAND.NPCMOVEMOD:
        return this.cmdNpcMoveMode(reader);
      case COMMAND.MESSAGE:
        return this.cmdMessage(reader);
      case COMMAND.DELETEGOODS:
        return this.cmdDeleteGoods(reader);
      case COMMAND.RESUMEACTORHP:
        return this.cmdResumeActorHp(reader);
      case COMMAND.ACTORLAYERUP:
        return this.cmdActorLayerUp(reader);
      case COMMAND.DELALLNPC:
        return {
          len: 0,
          execute: () => {
            this.game.mainSceneRuntime?.deleteAllNpc();
          },
        };
      case COMMAND.BOXOPEN:
        return this.cmdBoxOpen(reader);
      case COMMAND.NPCSTEP:
        return this.cmdNpcStep(reader);
      case COMMAND.SETSCENENAME:
        return this.cmdSetSceneName(reader);
      case COMMAND.SHOWSCENENAME:
        return this.cmdShowSceneName();
      case COMMAND.SHOWSCREEN:
        return this.cmdShowScreen();
      case COMMAND.USEGOODS:
        return this.cmdUseGoods(reader);
      case COMMAND.ATTRIBTEST:
        return this.cmdAttribTest(reader);
      case COMMAND.ATTRIBSET:
        return this.cmdAttribSet(reader);
      case COMMAND.ATTRIBADD:
        return this.cmdAttribAdd(reader);
      case COMMAND.SHOWGUT:
        return this.cmdShowGut(reader);
      case COMMAND.USEGOODSNUM:
        return this.cmdUseGoodsNum(reader);
      case COMMAND.RANDRADE:
        return this.cmdRandRate(reader);
      case COMMAND.MENU:
        return this.cmdMenu(reader);
      case COMMAND.TESTMONEY:
        return this.cmdTestMoney(reader);
      case COMMAND.CALLCHAPTER:
        return this.cmdCallChapter(reader);
      case COMMAND.DISCMP:
        return this.cmdDisCmp(reader);
      case COMMAND.RETURN:
        return this.cmdReturn();
      case COMMAND.TIMEMSG:
        return this.cmdTimedMessage(reader);
      case COMMAND.DISABLESAVE:
        return this.cmdSetSaveDisabled(true);
      case COMMAND.ENABLESAVE:
        return this.cmdSetSaveDisabled(false);
      case COMMAND.GAMESAVE:
        return this.cmdGameSave();
      case COMMAND.SETEVENTTIMER:
        return this.cmdSetEventTimer(reader);
      case COMMAND.ENABLESHOWPOS:
        return this.cmdSetShowPosition(true);
      case COMMAND.DISABLESHOWPOS:
        return this.cmdSetShowPosition(false);
      case COMMAND.SETTO:
        return this.cmdSetTo(reader);
      case COMMAND.TESTGOODSNUM:
        return this.cmdTestGoodsNum(reader);
      case COMMAND.SETFIGHTMISS:
        return this.cmdSetFightMiss(reader);
      case COMMAND.SETARMSTOSS:
        return this.cmdSetArmsToss(reader);
      default:
        throw new Error(`Unsupported script opcode ${opcode} at offset ${reader.commandOffset}`);
    }
  }

  private cmdLoadMap(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);
    const x = reader.readUint16(4);
    const y = reader.readUint16(6);

    return {
      len: 8,
      execute: () => {
        this.game.mainSceneRuntime?.loadMap(type, index, x - 5, y - 2);
      },
    };
  }

  private cmdMusic(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.playMusic(type, index);
      },
    };
  }

  private cmdCreateActor(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const x = reader.readUint16(2) + 5;
    const y = reader.readUint16(4) + 2;

    return {
      len: 6,
      execute: () => {
        this.game.mainSceneRuntime?.createActor(actorId, x, y);
      },
    };
  }

  private cmdDeleteNpc(reader: ScriptReader): CommandBuilder {
    const npcId = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.deleteNpc(npcId);
      },
    };
  }

  private cmdMapEvent(reader: ScriptReader): CommandBuilder {
    const eventId = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        // Kotlin 与 C 基线都没有落地该指令；保留解析和兼容执行，避免破坏脚本流。
        void eventId;
      },
    };
  }

  private cmdActorEvent(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const eventId = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.setActorEvent(actorId, eventId);
      },
    };
  }

  private cmdMove(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const x = reader.readUint16(2);
    const y = reader.readUint16(4);

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

  private cmdActorMove(reader: ScriptReader): CommandBuilder {
    return this.cmdMove(reader);
  }

  private cmdActorSpeed(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const speed = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.setActorMoveInterval(actorId, speed);
      },
    };
  }

  private cmdIf(reader: ScriptReader): CommandBuilder {
    const eventId = reader.readUint16(0);
    const address = reader.readUint16(2);

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

  private cmdGoto(reader: ScriptReader): CommandBuilder {
    const address = reader.readUint16(0);

    return {
      len: 2,
      execute: process => {
        process.gotoAddress(address);
      },
    };
  }

  private cmdSet(reader: ScriptReader): CommandBuilder {
    const index = reader.readUint16(0);
    const value = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.setVariable(index, value);
      },
    };
  }

  private cmdIfCmp(reader: ScriptReader): CommandBuilder {
    const index = reader.readUint16(0);
    const value = reader.readUint16(2);
    const address = reader.readUint16(4);

    return {
      len: 6,
      execute: process => {
        if (this.game.getVariable(index) === value) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdAdd(reader: ScriptReader): CommandBuilder {
    const index = reader.readUint16(0);
    const value = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.addVariable(index, value);
      },
    };
  }

  private cmdSub(reader: ScriptReader): CommandBuilder {
    const index = reader.readUint16(0);
    const value = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.subVariable(index, value);
      },
    };
  }

  private cmdSetControlPlayer(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.setControlPlayer(actorId);
      },
    };
  }

  private cmdGutEvent(reader: ScriptReader): CommandBuilder {
    const gutId = reader.readUint16(0);
    const eventId = reader.readUint16(2);

    return {
      len: 4,
      execute: process => {
        const runtime = this.game.mainSceneRuntime;
        if (!runtime) return;
        process.pause();
        const child = runtime.callChapter(1, gutId, process);
        if (!child.triggerEvent(eventId)) {
          runtime.returnToParentScript(child);
        }
      },
    };
  }

  private cmdSetTo(reader: ScriptReader): CommandBuilder {
    const sourceIndex = reader.readUint16(0);
    const targetIndex = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.setVariable(targetIndex, this.game.getVariable(sourceIndex));
      },
    };
  }

  private cmdSay(reader: ScriptReader): CommandBuilder {
    const headImageIndex = reader.readUint16(0);
    const message = reader.readCString(2);
    const text = message.text;

    return {
      len: message.byteLength + 2,
      execute: process => {
        const scene = this.game.mainScene;
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

  private cmdStartChapter(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint8(0);
    const index = reader.readUint8(2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.startChapter(type, index);
      },
    };
  }

  private cmdSetMapScreen(reader: ScriptReader): CommandBuilder {
    const screenX = reader.readUint16(0);
    const screenY = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.setMapScreenPosition(screenX, screenY);
      },
    };
  }

  private cmdIgnoredScreenFilter(): CommandBuilder {
    return {
      len: 1,
      // C/Kotlin 基线都没有实际屏幕滤镜，这里只消耗 opcode 参数。
      execute: () => undefined,
    };
  }

  private cmdEvent(reader: ScriptReader): CommandBuilder {
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

  private cmdSetEvent(reader: ScriptReader): CommandBuilder {
    const eventId = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        this.game.setEvent(eventId);
      },
    };
  }

  private cmdClearEvent(reader: ScriptReader): CommandBuilder {
    const eventId = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        this.game.clearEvent(eventId);
      },
    };
  }

  private cmdBuy(reader: ScriptReader): CommandBuilder {
    const goodsListByteLength = reader.readNullTerminatedByteLength(0);
    const goodsKeys: Array<{ type: number; index: number }> = [];

    // BUY 参数是以 index=0 结束的 [index,type] 列表，Kotlin 也是按这个顺序解析。
    for (let i = 0; i < goodsListByteLength - 1; i += 2) {
      const index = reader.readUint8(i);
      if (index === 0) break;
      const type = reader.readUint8(i + 1);
      goodsKeys.push({ type, index });
    }

    return {
      len: goodsListByteLength,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开买入菜单');
        const items = [];
        for (const { type, index } of goodsKeys) {
          const goods = this.game.datLib.getGoods(type, index);
          if (!goods) throw new Error(`BUY 指令引用了不存在的物品 type=${type}, index=${index}`);
          items.push({ goods, count: this.game.getGoodsCount(type, index) });
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

  private cmdFaceToFace(reader: ScriptReader): CommandBuilder {
    const sourceId = reader.readUint16(0);
    const targetId = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.faceActorTowardActor(targetId, sourceId);
      },
    };
  }

  private cmdMovie(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);
    const x = reader.readUint16(4);
    const y = reader.readUint16(6);
    const controlFlags = reader.readUint16(8);

    return {
      len: 10,
      execute: process => {
        this.game.mainSceneRuntime?.playMovie({ type, index, x, y, controlFlags }, process);
      },
    };
  }

  private cmdCreateBox(reader: ScriptReader): CommandBuilder {
    const id = reader.readUint16(0);
    const resId = reader.readUint16(2);
    const x = reader.readUint16(4);
    const y = reader.readUint16(6);

    return {
      len: 8,
      execute: () => {
        this.game.mainSceneRuntime?.createBox(id, resId, x, y);
      },
    };
  }

  private cmdDeleteBox(reader: ScriptReader): CommandBuilder {
    const id = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.deleteBox(id);
      },
    };
  }

  private cmdGainGoods(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);

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

  private cmdInitFight(reader: ScriptReader): CommandBuilder {
    const monsterTypes = Array.from({ length: 8 }, (_, i) => reader.readUint16(i * 2));
    const scrb = reader.readUint16(16);
    const scrl = reader.readUint16(18);
    const scrr = reader.readUint16(20);

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

  private cmdEnterFight(reader: ScriptReader): CommandBuilder {
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
        const runtime = this.game.mainSceneRuntime;
        if (!runtime) throw new Error('主场景运行时不存在，无法进入战斗');
        runtime.enterFight(
          { roundMax, monsterTypes, background, eventRounds, eventIds, lossAddress, winAddress },
          process
        );
      },
    };
  }

  private cmdCreateNpc(reader: ScriptReader): CommandBuilder {
    const id = reader.readUint16(0);
    const resId = reader.readUint16(2);
    const x = reader.readUint16(4);
    const y = reader.readUint16(6);

    return {
      len: 8,
      execute: () => {
        this.game.mainSceneRuntime?.createNpc(id, resId, x, y);
      },
    };
  }

  private cmdDeleteActor(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.deleteActor(actorId);
      },
    };
  }

  private cmdGainMoney(reader: ScriptReader): CommandBuilder {
    const value = reader.readUint32(0);

    return {
      len: 4,
      execute: () => {
        this.game.gainMoney(value);
        this.game.mainSceneRuntime?.collectFacingBox();
      },
    };
  }

  private cmdUseMoney(reader: ScriptReader): CommandBuilder {
    const value = reader.readUint32(0);

    return {
      len: 4,
      execute: () => {
        this.game.useMoney(value);
      },
    };
  }

  private cmdSetMoney(reader: ScriptReader): CommandBuilder {
    const value = reader.readUint32(0);

    return {
      len: 4,
      execute: () => {
        this.game.setMoney(value);
      },
    };
  }

  private cmdGameOver(): CommandBuilder {
    return {
      len: 0,
      execute: process => {
        process.stop();
        this.game.returnToMenu();
      },
    };
  }

  private cmdLearnMagic(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const type = reader.readUint16(2);
    const index = reader.readUint16(4);

    return {
      len: 6,
      execute: () => {
        const player = this.game.getPlayer(actorId);
        const magic = this.game.datLib.getMagic(type, index);
        if (!player || !magic) return;
        player.learnMagic(magic);
        this.game.mainScene?.showTip(`${player.name}学会:${magic.name}`);
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

  private cmdNpcMoveMode(reader: ScriptReader): CommandBuilder {
    const id = reader.readUint16(0);
    const state = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        this.game.mainSceneRuntime?.setNpcMoveMode(id, state);
      },
    };
  }

  private cmdResumeActorHp(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const value = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        const player = this.game.getPlayer(actorId);
        if (!player) return;
        player.hp = Math.trunc((player.hpMax * value) / 100);
      },
    };
  }

  private cmdActorLayerUp(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const toLevel = reader.readUint16(2);

    return {
      len: 4,
      execute: () => {
        const player = this.game.getPlayer(actorId);
        if (!player || !player.levelUp(toLevel)) return;
        this.game.mainScene?.showTip(`${player.name}修行提升`);
      },
    };
  }

  private cmdMessage(reader: ScriptReader): CommandBuilder {
    const message = reader.readCString(0);
    const text = message.text;

    return {
      len: message.byteLength,
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

  private cmdChoice(reader: ScriptReader): CommandBuilder {
    const firstChoiceValue = reader.readCString(0);
    const secondChoiceValue = reader.readCString(firstChoiceValue.byteLength);
    const firstChoice = firstChoiceValue.text;
    const secondChoice = secondChoiceValue.text;
    const address = reader.readUint16(firstChoiceValue.byteLength + secondChoiceValue.byteLength);

    return {
      len: firstChoiceValue.byteLength + secondChoiceValue.byteLength + 2,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开脚本选择框');
        process.pause();
        scene.screenStack.push(
          new ScriptChoiceScreen(this.game, firstChoice, secondChoice, choiceIndex => {
            if (choiceIndex === 1) process.gotoAddress(address);
            process.start();
          })
        );
      },
    };
  }

  private cmdTimedMessage(reader: ScriptReader): CommandBuilder {
    const duration = reader.readUint16(0);
    const message = reader.readCString(2);
    const text = message.text;

    return {
      len: message.byteLength + 2,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene || text.length === 0) return;
        process.pause();
        scene.showTimedMessage(text, duration * 10, () => {
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

  private cmdSetEventTimer(reader: ScriptReader): CommandBuilder {
    const eventId = reader.readUint16(0);
    const timer = reader.readUint16(2);

    return {
      len: 4,
      execute: process => {
        process.setTimer(timer, eventId);
      },
    };
  }

  private cmdSetShowPosition(enabled: boolean): CommandBuilder {
    return {
      len: 0,
      execute: () => {
        this.game.state.showPosition = enabled;
      },
    };
  }

  private cmdSetFightMiss(reader: ScriptReader): CommandBuilder {
    const enabled = reader.readUint16(0) === 1;
    return {
      len: 2,
      execute: () => {
        if (IGNORE_SET_FIGHT_MISS) return;
        this.game.state.allowFightMiss = enabled;
      },
    };
  }

  private cmdSetArmsToss(reader: ScriptReader): CommandBuilder {
    const enabled = reader.readUint16(0) === 1;
    return {
      len: 2,
      execute: () => {
        this.game.state.allowTossArm = enabled;
      },
    };
  }

  private cmdMenu(reader: ScriptReader): CommandBuilder {
    const variableIndex = reader.readUint16(0);
    const menuText = reader.readCString(2);
    const items = menuText.text.split(' ').filter(item => item.length > 0);

    return {
      len: 2 + menuText.byteLength,
      execute: process => {
        const scene = this.game.mainScene;
        if (!scene) throw new Error('主场景不存在，无法打开脚本菜单');
        process.pause();
        scene.screenStack.push(
          new ScriptMenuScreen(this.game, items, menuValue => {
            this.game.setVariable(variableIndex, menuValue);
            process.start();
          })
        );
      },
    };
  }

  private cmdRandRate(reader: ScriptReader): CommandBuilder {
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

  private cmdTestMoney(reader: ScriptReader): CommandBuilder {
    const value = reader.readUint32(0);
    const address = reader.readUint16(4);

    return {
      len: 6,
      execute: process => {
        if (this.game.state.money < value) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdCallChapter(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);

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

  private cmdDisCmp(reader: ScriptReader): CommandBuilder {
    const variableIndex = reader.readUint16(0);
    const value = reader.readUint16(2);
    const lessAddress = reader.readUint16(4);
    const greaterAddress = reader.readUint16(6);

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

  private cmdDeleteGoods(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);
    const address = reader.readUint16(4);

    return {
      len: 6,
      execute: process => {
        if (!this.game.consumeGoods(type, index, 1)) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdBoxOpen(reader: ScriptReader): CommandBuilder {
    const id = reader.readUint16(0);

    return {
      len: 2,
      execute: () => {
        this.game.mainSceneRuntime?.openBox(id);
      },
    };
  }

  private cmdNpcStep(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const faceTo = reader.readUint16(2);
    const step = reader.readUint16(4);

    return {
      len: 6,
      execute: process => {
        const operation = this.game.mainSceneRuntime?.createActorPoseOperation(
          actorId,
          toNpcStepDirection(faceTo),
          step
        );
        if (!operation) return;
        process.wait(operation);
      },
    };
  }

  private cmdSetSceneName(reader: ScriptReader): CommandBuilder {
    const sceneName = reader.readCString(0);
    const name = sceneName.text;

    return {
      len: sceneName.byteLength,
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

  private cmdShowScreen(): CommandBuilder {
    return {
      len: 0,
      execute: () => {
        this.game.mainSceneRuntime?.clearOverlay();
      },
    };
  }

  private cmdShowGut(reader: ScriptReader): CommandBuilder {
    const topImageIndex = reader.readUint16(0);
    const bottomImageIndex = reader.readUint16(2);
    const message = reader.readCString(4);
    const text = message.text;

    return {
      len: message.byteLength + 4,
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

  private cmdUseGoods(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);
    const address = reader.readUint16(4);

    return {
      len: 6,
      execute: process => {
        if (!this.game.consumeGoods(type, index, 1)) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdAttribTest(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const type = reader.readUint16(2);
    const value = reader.readUint16(4);
    const lessAddress = reader.readUint16(6);
    const greaterAddress = reader.readUint16(8);

    return {
      len: 10,
      execute: process => {
        const player = this.game.getPlayer(actorId);
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

  private cmdAttribSet(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const type = reader.readUint16(2);
    const value = reader.readUint16(4);

    return {
      len: 6,
      execute: () => {
        this.game.getPlayer(actorId)?.setScriptAttribute(type, value);
      },
    };
  }

  private cmdAttribAdd(reader: ScriptReader): CommandBuilder {
    const actorId = reader.readUint16(0);
    const type = reader.readUint16(2);
    const value = toInt16(reader.readUint16(4));

    return {
      len: 6,
      execute: () => {
        this.game.getPlayer(actorId)?.addScriptAttribute(type, value);
      },
    };
  }

  private cmdUseGoodsNum(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);
    const count = reader.readUint16(4);
    const address = reader.readUint16(6);

    return {
      len: 8,
      execute: process => {
        if (!this.game.consumeGoods(type, index, count)) {
          process.gotoAddress(address);
        }
      },
    };
  }

  private cmdTestGoodsNum(reader: ScriptReader): CommandBuilder {
    const type = reader.readUint16(0);
    const index = reader.readUint16(2);
    const count = reader.readUint16(4);
    const equalAddress = reader.readUint16(6);
    const greaterAddress = reader.readUint16(8);

    return {
      len: 10,
      execute: process => {
        const goodsCount = this.game.getGoodsCount(type, index);
        if (goodsCount === count) {
          process.gotoAddress(equalAddress);
        } else if (goodsCount > count) {
          process.gotoAddress(greaterAddress);
        }
      },
    };
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
