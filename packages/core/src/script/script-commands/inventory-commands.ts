import type { Game } from '@/game/game';
import { createScriptBuyGoodsScreen, createScriptSaleGoodsScreen } from '@/screens/main-game/script';
import type { CommandBuilder } from '../script-command';
import { COMMAND } from '../script-opcodes';
import type { ScriptReader } from '../script-reader';

export function compileInventoryCommand(game: Game, reader: ScriptReader, opcode: number): CommandBuilder | null {
  switch (opcode) {
    case COMMAND.MONEY:
      return cmdSetMoney(game, reader);
    case COMMAND.BUY:
      return cmdBuy(game, reader);
    case COMMAND.GAINGOODS:
      return cmdGainGoods(game, reader);
    case COMMAND.GAINMONEY:
      return cmdGainMoney(game, reader);
    case COMMAND.USEMONEY:
      return cmdUseMoney(game, reader);
    case COMMAND.SETMONEY:
      return cmdSetMoney(game, reader);
    case COMMAND.SALE:
      return cmdSale(game);
    case COMMAND.DELETEGOODS:
      return cmdDeleteGoods(game, reader);
    case COMMAND.USEGOODS:
      return cmdUseGoods(game, reader);
    case COMMAND.USEGOODSNUM:
      return cmdUseGoodsNum(game, reader);
    case COMMAND.TESTMONEY:
      return cmdTestMoney(game, reader);
    case COMMAND.TESTGOODSNUM:
      return cmdTestGoodsNum(game, reader);
    default:
      return null;
  }
}

function cmdSetMoney(game: Game, reader: ScriptReader): CommandBuilder {
  const value = reader.readUint32(0);

  return {
    len: 4,
    execute: () => {
      game.setMoney(value);
    },
  };
}

function cmdBuy(game: Game, reader: ScriptReader): CommandBuilder {
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
      const scene = game.mainScene;
      if (!scene) throw new Error('主场景不存在，无法打开买入菜单');
      const items = [];
      for (const { type, index } of goodsKeys) {
        const goods = game.datLib.getGoods(type, index);
        if (!goods) throw new Error(`BUY 指令引用了不存在的物品 type=${type}, index=${index}`);
        items.push({ goods, count: game.getGoodsCount(type, index) });
      }
      process.pause();
      scene.screenStack.push(
        createScriptBuyGoodsScreen(game, items, () => {
          process.start();
        })
      );
    },
  };
}

function cmdGainGoods(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);

  return {
    len: 4,
    execute: () => {
      const goods = game.gainGoods(type, index);
      if (goods) {
        game.mainSceneRuntime?.collectFacingBox();
      }
    },
  };
}

function cmdGainMoney(game: Game, reader: ScriptReader): CommandBuilder {
  const value = reader.readUint32(0);

  return {
    len: 4,
    execute: () => {
      game.gainMoney(value);
      game.mainSceneRuntime?.collectFacingBox();
    },
  };
}

function cmdUseMoney(game: Game, reader: ScriptReader): CommandBuilder {
  const value = reader.readUint32(0);

  return {
    len: 4,
    execute: () => {
      game.useMoney(value);
    },
  };
}

function cmdSale(game: Game): CommandBuilder {
  return {
    len: 0,
    execute: process => {
      const scene = game.mainScene;
      if (!scene) throw new Error('主场景不存在，无法打开卖出菜单');
      process.pause();
      scene.screenStack.push(
        createScriptSaleGoodsScreen(game, () => {
          process.start();
        })
      );
    },
  };
}

function cmdDeleteGoods(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);
  const address = reader.readUint16(4);

  return {
    len: 6,
    execute: process => {
      if (!game.consumeGoods(type, index, 1)) {
        process.gotoAddress(address);
      }
    },
  };
}

function cmdUseGoods(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);
  const address = reader.readUint16(4);

  return {
    len: 6,
    execute: process => {
      if (!game.consumeGoods(type, index, 1)) {
        process.gotoAddress(address);
      }
    },
  };
}

function cmdUseGoodsNum(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);
  const count = reader.readUint16(4);
  const address = reader.readUint16(6);

  return {
    len: 8,
    execute: process => {
      if (!game.consumeGoods(type, index, count)) {
        process.gotoAddress(address);
      }
    },
  };
}

function cmdTestMoney(game: Game, reader: ScriptReader): CommandBuilder {
  const value = reader.readUint32(0);
  const address = reader.readUint16(4);

  return {
    len: 6,
    execute: process => {
      if (game.state.money < value) {
        process.gotoAddress(address);
      }
    },
  };
}

function cmdTestGoodsNum(game: Game, reader: ScriptReader): CommandBuilder {
  const type = reader.readUint16(0);
  const index = reader.readUint16(2);
  const count = reader.readUint16(4);
  const equalAddress = reader.readUint16(6);
  const greaterAddress = reader.readUint16(8);

  return {
    len: 10,
    execute: process => {
      const goodsCount = game.getGoodsCount(type, index);
      if (goodsCount === count) {
        process.gotoAddress(equalAddress);
      } else if (goodsCount > count) {
        process.gotoAddress(greaterAddress);
      }
    },
  };
}
