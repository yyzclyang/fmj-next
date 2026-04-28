import type { Game } from '@/game/game';
import { Player } from '@/characters';
import { BaseGoods } from '@/goods';
import { ResourceType } from '@/lib/resource-utils';

const DEFAULT_DEBUG_PLAYER_COUNT = 4;

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
  player: DebugPlayerApi;
  script: DebugScriptApi;
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

export interface DebugPlayerApi {
  list(): DebugPlayerItem[];
  listAll(): DebugPlayerItem[];
  add(ids?: readonly number[]): DebugPlayerItem[];
}

export interface DebugScriptApi {
  start(type: number, index: number, offset?: number): boolean;
}

export interface DebugPlayerItem {
  index: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defend: number;
  speed: number;
  lingli: number;
  luck: number;
  inParty: boolean;
  isControl: boolean;
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
    player: {
      list() {
        const game = getGame();
        const items = game ? listPartyPlayers(game).map(player => toDebugPlayerItem(game, player)) : [];
        console.table(items);
        return items;
      },
      listAll() {
        const game = getGame();
        const items = game ? listAllPlayers(game).map(player => toDebugPlayerItem(game, player)) : [];
        console.table(items);
        return items;
      },
      add(actorIds?: readonly number[]) {
        const game = getGame();
        if (!game) return [];
        const ids = actorIds ?? listAllPlayerIds(game).slice(0, DEFAULT_DEBUG_PLAYER_COUNT);
        // 默认批量补人只用于调试多角色菜单，实际入队仍走 Game.addActor。
        const items = ids.map(id => toDebugPlayerItem(game, addDebugPlayer(game, id)));
        console.table(items);
        return items;
      },
    },
    script: {
      start(type: number, index: number, offset?: number) {
        const runtime = getGame()?.mainSceneRuntime ?? null;
        if (!runtime) throw new Error('主场景运行时不存在，无法调试启动脚本');
        if (offset == null) {
          runtime.startChapter(type, index);
          console.debug(`已启动脚本 GUT ${type}-${index}`);
        } else {
          runtime.startChapterAtOffset(type, index, offset);
          console.debug(`已启动脚本 GUT ${type}-${index} offset=${offset}`);
        }
        return true;
      },
    },
  };
}

function listPartyPlayers(game: Game): Player[] {
  return game.state.partyActorIds.map(id => {
    const player = game.getPlayer(id);
    if (!player) throw new Error(`队伍角色不存在: ${id}`);
    return player;
  });
}

function listAllPlayerIds(game: Game): number[] {
  return game.datLib
    .listResourceKeys(ResourceType.ARS)
    .filter(key => key.type === 1)
    .map(key => key.index);
}

function listAllPlayers(game: Game): Player[] {
  return listAllPlayerIds(game).map(id => {
    const player = findPlayer(game, id);
    if (!player) throw new Error(`角色资源不存在: ARS 1-${id}`);
    return player;
  });
}

function addDebugPlayer(game: Game, actorId: number): Player {
  if (!Number.isInteger(actorId) || actorId <= 0) {
    throw new Error(`角色 id 非法: ${actorId}`);
  }
  const player = game.getPlayer(actorId);
  if (!player) throw new Error(`角色资源不存在: ARS 1-${actorId}`);
  if (!game.state.partyActorIds.includes(actorId)) {
    const added = game.addActor(actorId);
    if (!added) throw new Error(`添加角色失败: ${actorId}`);
    return added;
  }
  return player;
}

function listAllGoods(game: Game): BaseGoods[] {
  const items: BaseGoods[] = [];
  for (const key of game.datLib.listResourceKeys(ResourceType.GRS)) {
    const goods = game.datLib.getRes(key.resType, key.type, key.index);
    if (goods instanceof BaseGoods) items.push(goods);
  }
  return items;
}

function findPlayer(game: Game, actorId: number): Player | null {
  const player = game.state.players.find(item => item.index === actorId);
  if (player) return player;
  const res = game.datLib.getRes(ResourceType.ARS, 1, actorId);
  return res instanceof Player ? res : null;
}

function toDebugPlayerItem(game: Game, player: Player): DebugPlayerItem {
  return {
    index: player.index,
    name: player.name,
    level: player.level,
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    attack: player.attack,
    defend: player.defend,
    speed: player.speed,
    lingli: player.lingli,
    luck: player.luck,
    inParty: game.state.partyActorIds.includes(player.index),
    isControl: game.state.controlActorId === player.index,
  };
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
