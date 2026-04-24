import type { Game } from '@/game/game';
import { BaseGoods } from '@/goods';
import { ResourceType } from '@/lib/resource-utils';

export interface DebugSnapshot {
  money: number;
  goodsCount: number;
  eventCount: number;
  collectedBoxCount: number;
  sceneName: string;
  map: {
    type: number;
    index: number;
    screenX: number;
    screenY: number;
  };
  player: {
    mapX: number;
    mapY: number;
  };
}

export interface DebugApi {
  getSnapshot(): DebugSnapshot | null;
  bag: DebugBagApi;
}

export interface DebugBagApi {
  list(): DebugGoodsItem[];
  listAll(): DebugGoodsItem[];
  add(type: number, index: number, count?: number): DebugGoodsItem | null;
  addAll(count?: number): DebugGoodsItem[];
  delete(type: number, index: number, count?: number): boolean;
}

export interface DebugGoodsItem {
  type: number;
  index: number;
  count: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
  description: string;
}

export function createDebugApi(getGame: () => Game | null): DebugApi {
  return {
    getSnapshot() {
      const state = getGame()?.getStateSnapshot() ?? null;
      if (!state) return null;
      return {
        money: state.money,
        goodsCount: state.goods.reduce((sum, g) => sum + g.count, 0),
        eventCount: state.eventFlags.length,
        collectedBoxCount: state.collectedBoxKeys.length,
        sceneName: state.sceneName,
        map: {
          type: state.mapType,
          index: state.mapIndex,
          screenX: state.mapScreenX,
          screenY: state.mapScreenY,
        },
        player: {
          mapX: state.playerMapX,
          mapY: state.playerMapY,
        },
      };
    },
    bag: {
      list() {
        const game = getGame();
        const items = game?.bag.allGoodsList.map(item => toDebugGoodsItem(item.goods, item.count)) ?? [];
        console.table(items);
        return items;
      },
      listAll() {
        const game = getGame();
        const items = game
          ? listAllGoods(game).map(goods => toDebugGoodsItem(goods, game.getGoodsNum(goods.type, goods.index)))
          : [];
        console.table(items);
        return items;
      },
      add(type: number, index: number, count = 1) {
        if (count <= 0) return null;
        const game = getGame();
        const goods = game?.bag.addGoods(type, index, count) ?? null;
        const item = goods ? toDebugGoodsItem(goods, game?.getGoodsNum(type, index) ?? 0) : null;
        if (item) console.table([item]);
        return item;
      },
      addAll(count = 1) {
        if (count <= 0) return [];
        const game = getGame();
        if (!game) return [];
        const items: DebugGoodsItem[] = [];
        for (const goods of listAllGoods(game)) {
          game.bag.addGoods(goods.type, goods.index, count);
          items.push(toDebugGoodsItem(goods, game.getGoodsNum(goods.type, goods.index)));
        }
        console.table(items);
        return items;
      },
      delete(type: number, index: number, count = 1) {
        if (count <= 0) return false;
        const game = getGame();
        const ok = game?.useGoodsNum(type, index, count) ?? false;
        console.debug(ok ? `已删除道具 ${type}-${index} x${count}` : `删除道具失败 ${type}-${index} x${count}`);
        return ok;
      },
    },
  };
}

function listAllGoods(game: Game): BaseGoods[] {
  const items: BaseGoods[] = [];
  for (const key of game.datLib.listResourceKeys(ResourceType.GRS)) {
    const goods = game.datLib.getRes(key.resType, key.type, key.index);
    if (goods instanceof BaseGoods) items.push(goods);
  }
  return items;
}

function toDebugGoodsItem(goods: BaseGoods, count: number): DebugGoodsItem {
  return {
    type: goods.type,
    index: goods.index,
    count,
    name: goods.name,
    buyPrice: goods.buyPrice,
    sellPrice: goods.sellPrice,
    description: goods.description,
  };
}
