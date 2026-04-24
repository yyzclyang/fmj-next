import type { Game } from '@/game/game';
import { ResGut } from '@/lib/res-gut';
import { ResourceType, readGbkString, readUint16, readUint32 } from '@/lib/resource-utils';
import { KeyCode } from '@/shared/key-code';
import { ScriptProcess } from './script-process';

const COMMAND = {
  MUSIC: 0,
  LOADMAP: 1,
  CREATEACTOR: 2,
  DELETENPC: 3,
  MOVE: 6,
  CALLBACK: 9,
  IF: 11,
  SAY: 13,
  STARTCHAPTER: 14,
  SETEVENT: 26,
  MOVIE: 30,
  CREATEBOX: 32,
  DELETEBOX: 33,
  GAINGOODS: 34,
  INITFIGHT: 35,
  CREATENPC: 38,
  GAINMONEY: 41,
  SETMONEY: 43,
  BOXOPEN: 51,
  DELALLNPC: 52,
  NPCSTEP: 53,
  SETSCENENAME: 54,
  SHOWSCENENAME: 55,
  SHOWGUT: 61,
} as const;

type CommandBuilder = {
  readonly len: number;
  readonly execute: (process: ScriptProcess) => void;
};

type Facing = typeof KeyCode.Up | typeof KeyCode.Down | typeof KeyCode.Left | typeof KeyCode.Right;

// 现在只实现启动链真正需要的那几条指令，其余先占位跳过。
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
        return this.makeNoopCommand(4);
      case COMMAND.LOADMAP:
        return this.cmdLoadMap(code, start);
      case COMMAND.CREATEACTOR:
        return this.cmdCreateActor(code, start);
      case COMMAND.DELETENPC:
        return this.cmdDeleteNpc(code, start);
      case COMMAND.MOVE:
        return this.cmdMove(code, start);
      case COMMAND.CALLBACK:
        return {
          len: 0,
          execute: process => {
            process.stop();
          },
        };
      case COMMAND.IF:
        return this.cmdIf(code, start);
      case COMMAND.SAY:
        return this.cmdSay(code, start);
      case COMMAND.STARTCHAPTER:
        return this.cmdStartChapter(code, start);
      case COMMAND.SETEVENT:
        return this.cmdSetEvent(code, start);
      case COMMAND.MOVIE:
        return this.makeNoopCommand(10);
      case COMMAND.CREATEBOX:
        return this.cmdCreateBox(code, start);
      case COMMAND.DELETEBOX:
        return this.cmdDeleteBox(code, start);
      case COMMAND.GAINGOODS:
        return this.cmdGainGoods(code, start);
      case COMMAND.INITFIGHT:
        return this.makeNoopCommand(22);
      case COMMAND.CREATENPC:
        return this.cmdCreateNpc(code, start);
      case COMMAND.GAINMONEY:
        return this.cmdGainMoney(code, start);
      case COMMAND.SETMONEY:
        return this.cmdSetMoney(code, start);
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
      case COMMAND.SHOWGUT:
        return this.cmdShowGut(code, start);
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

  private cmdSetEvent(code: Uint8Array, start: number): CommandBuilder {
    const eventId = readUint16(code, start);

    return {
      len: 2,
      execute: () => {
        this.game.setEvent(eventId);
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
        this.game.gainGoods(type, index);
        this.game.mainSceneRuntime?.collectFacingBox();
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

  private cmdSetMoney(code: Uint8Array, start: number): CommandBuilder {
    const value = readUint32(code, start);

    return {
      len: 4,
      execute: () => {
        this.game.setMoney(value);
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
