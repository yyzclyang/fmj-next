import type { Game } from '@/game/game';
import type { Monster, Player } from '@/characters';
import { STATUS_FLAGS_ALL } from '@/characters/status';
import type { CombatBackgroundIds, CombatEnterFightParams } from '@/combat/combat-runtime';
import type { BaseGoods } from '@/goods';
import { ResourceType } from '@/lib/resource-utils';

const DEFAULT_DEBUG_PLAYER_COUNT = 4;
const DEBUG_PLAYER_INCREASE_KEYS = [
  'level',
  'hp',
  'hpMax',
  'mp',
  'mpMax',
  'attack',
  'defense',
  'agility',
  'spirit',
  'luck',
  'exp',
] as const;

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
  combat: DebugCombatApi;
}

export interface DebugBagApi {
  list(): DebugGoodsItem[];
  listAll(): DebugGoodsItem[];
  add(type: number, index: number, count?: number): DebugGoodsItem | null;
  addAll(count?: number): DebugGoodsItem[];
  delete(type: number, index: number, count?: number): boolean;
  addMoney(value: number): number;
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
  increase(actorIds: readonly number[], input: DebugPlayerIncreaseInput): DebugPlayerItem[];
}

export interface DebugPlayerIncreaseInput {
  level?: number;
  hp?: number;
  hpMax?: number;
  mp?: number;
  mpMax?: number;
  attack?: number;
  defense?: number;
  agility?: number;
  spirit?: number;
  luck?: number;
  exp?: number;
}

export interface DebugScriptApi {
  start(type: number, index: number, offset?: number): boolean;
}

export type DebugCombatBackgroundInput =
  | number
  | {
      scrb?: number;
      scrl?: number;
      scrr?: number;
    };

export interface DebugCombatGoodsInput {
  type: number;
  index: number;
  count?: number;
}

export interface DebugCombatPlayerStateInput {
  id: number;
  hp?: number;
  mp?: number;
  immuneStatusFlags?: number;
  immuneStatusRounds?: number;
  activeStatusFlags?: number;
  activeStatusRounds?: number;
  onHitEffectFlags?: number;
  onHitEffectRounds?: number;
}

export interface DebugCombatStartOptions {
  monsterIds?: readonly number[];
  background?: DebugCombatBackgroundInput;
  roundMax?: number;
  eventRounds?: readonly number[];
  eventIds?: readonly number[];
  lossAddress?: number;
  winAddress?: number;
  playerIds?: readonly number[];
  playerStates?: readonly DebugCombatPlayerStateInput[];
  goods?: readonly DebugCombatGoodsInput[];
  allowFightMiss?: boolean;
  allowTossArm?: boolean;
}

export interface DebugCombatApi {
  listMonsters(): DebugCombatMonsterItem[];
  listBackgrounds(): DebugCombatBackgroundItem[];
  start(options?: readonly number[] | DebugCombatStartOptions): boolean;
  setEncounterRate(rate?: number | null): number;
}

export interface DebugCombatMonsterItem {
  index: number;
  name: string;
  level: number;
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  agility: number;
  spirit: number;
  luck: number;
  iq: number;
  exp: number;
  money: number;
  stealGoods: DebugCarryGoodsItem | null;
  dropGoods: DebugCarryGoodsItem | null;
}

export interface DebugCarryGoodsItem {
  type: number;
  index: number;
  count: number;
  name: string;
}

export interface DebugCombatBackgroundItem {
  index: number;
  width: number;
  height: number;
  frames: number;
}

export interface DebugPlayerItem {
  index: number;
  name: string;
  level: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  attack: number;
  defense: number;
  agility: number;
  spirit: number;
  luck: number;
  exp: number;
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
          ? listAllGoods(game).map(goods => toDebugGoodsItem(goods, game.getGoodsCount(goods.type, goods.index)))
          : [];
        console.table(items);
        return items;
      },
      add(type: number, index: number, count = 1) {
        if (count <= 0) return null;
        const game = getGame();
        const goods = game?.bag.addGoods(type, index, count) ?? null;
        const item = goods ? toDebugGoodsItem(goods, game?.getGoodsCount(type, index) ?? 0) : null;
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
          items.push(toDebugGoodsItem(goods, game.getGoodsCount(goods.type, goods.index)));
        }
        console.table(items);
        return items;
      },
      delete(type: number, index: number, count = 1) {
        if (count <= 0) return false;
        const game = getGame();
        const ok = game?.consumeGoods(type, index, count) ?? false;
        console.debug(ok ? `已删除道具 ${type}-${index} x${count}` : `删除道具失败 ${type}-${index} x${count}`);
        return ok;
      },
      addMoney(value: number) {
        const game = getGame();
        if (!game) return 0;
        game.setMoney(game.state.money + assertDebugInt(value, 'money'));
        console.debug(`当前金钱:${game.state.money}`);
        return game.state.money;
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
      increase(actorIds: readonly number[], input: DebugPlayerIncreaseInput) {
        const game = getGame();
        if (!game) return [];
        const players = resolveDebugPlayers(game, actorIds, input);
        for (const player of players) applyDebugPlayerIncrease(player, input);
        const items = players.map(player => toDebugPlayerItem(game, player));
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
    combat: {
      listMonsters() {
        const game = getGame();
        const items = game ? listAllMonsters(game).map(toDebugCombatMonsterItem) : [];
        console.table(items);
        return items;
      },
      listBackgrounds() {
        const game = getGame();
        const items = game ? listAllCombatBackgrounds(game) : [];
        console.table(items);
        return items;
      },
      start(input?: readonly number[] | DebugCombatStartOptions) {
        const game = getGame();
        const runtime = game?.mainSceneRuntime ?? null;
        if (!game || !runtime) throw new Error('主场景运行时不存在，无法调试进入战斗');
        const options = normalizeCombatStartOptions(input);
        const ids = resolveDebugMonsterIds(game, options.monsterIds);
        if (ids.length === 0) throw new Error('没有可用的怪物 ARS 3-*');
        const background = resolveCombatBackground(game, options.background);
        const params: CombatEnterFightParams = {
          roundMax: assertDebugNonNegativeInt(options.roundMax ?? 0, 'roundMax'),
          monsterTypes: ids,
          background,
          eventRounds: toCombatTriple(options.eventRounds, 'eventRounds'),
          eventIds: toCombatTriple(options.eventIds, 'eventIds'),
          lossAddress: assertDebugNonNegativeInt(options.lossAddress ?? 0, 'lossAddress'),
          winAddress: assertDebugNonNegativeInt(options.winAddress ?? 0, 'winAddress'),
        };
        applyDebugCombatSetup(game, options);
        runtime.startDebugCombat(params);
        console.debug(`已进入调试战斗 monster=${ids.join(',')} bg=${background.scrb}`);
        return true;
      },
      setEncounterRate(rate?: number | null) {
        const game = getGame();
        if (!game) return 0;
        const nextRate = rate == null ? null : assertDebugRate(rate, 'encounterRate');
        const currentRate = game.combat.setRandomEncounterRate(nextRate);
        console.debug(`当前遇敌几率:${currentRate}`);
        return currentRate;
      },
    },
  };
}

function normalizeCombatStartOptions(input?: readonly number[] | DebugCombatStartOptions): DebugCombatStartOptions {
  if (!input) return {};
  return isDebugNumberArray(input) ? { monsterIds: input } : input;
}

// 调试战斗允许一次性搭好队伍、背包和战斗开关，方便复现 Kotlin 对照场景。
function applyDebugCombatSetup(game: Game, options: DebugCombatStartOptions): void {
  if (options.allowFightMiss != null) game.state.allowFightMiss = options.allowFightMiss;
  if (options.allowTossArm != null) game.state.allowTossArm = options.allowTossArm;
  for (const id of options.playerIds ?? []) addDebugPlayer(game, id);
  for (const state of options.playerStates ?? []) applyDebugPlayerState(game, state);
  for (const item of options.goods ?? []) addDebugGoods(game, item);
}

function resolveDebugMonsterIds(game: Game, input?: readonly number[]): number[] {
  const ids = input ?? listAllMonsterIds(game).slice(0, 1);
  return ids.map((id, i) => assertDebugPositiveInt(id, `monsterIds[${i}]`));
}

function resolveCombatBackground(game: Game, input?: DebugCombatBackgroundInput): CombatBackgroundIds {
  if (input == null) return { scrb: getFirstCombatBackgroundIndex(game), scrl: 0, scrr: 0 };
  if (typeof input === 'number') return { scrb: assertDebugNonNegativeInt(input, 'background'), scrl: 0, scrr: 0 };
  return {
    scrb:
      input.scrb == null
        ? getFirstCombatBackgroundIndex(game)
        : assertDebugNonNegativeInt(input.scrb, 'background.scrb'),
    scrl: input.scrl == null ? 0 : assertDebugNonNegativeInt(input.scrl, 'background.scrl'),
    scrr: input.scrr == null ? 0 : assertDebugNonNegativeInt(input.scrr, 'background.scrr'),
  };
}

function toCombatTriple(values: readonly number[] | undefined, name: string): [number, number, number] {
  if (!values) return [0, 0, 0];
  if (values.length > 3) throw new Error(`${name} 最多只能配置 3 项`);
  return [
    values[0] == null ? 0 : assertDebugNonNegativeInt(values[0], `${name}[0]`),
    values[1] == null ? 0 : assertDebugNonNegativeInt(values[1], `${name}[1]`),
    values[2] == null ? 0 : assertDebugNonNegativeInt(values[2], `${name}[2]`),
  ];
}

function applyDebugPlayerState(game: Game, input: DebugCombatPlayerStateInput): void {
  const player = addDebugPlayer(game, input.id);
  if (input.hp != null) player.hp = clampDebugInt(input.hp, 'hp', 0, player.hpMax);
  if (input.mp != null) player.mp = clampDebugInt(input.mp, 'mp', 0, player.mpMax);
  applyDebugStatuses(player.immuneStatuses, input.immuneStatusFlags, input.immuneStatusRounds, 'immuneStatus');
  applyDebugStatuses(player.activeStatuses, input.activeStatusFlags, input.activeStatusRounds, 'activeStatus');
  applyDebugStatuses(player.onHitStatuses, input.onHitEffectFlags, input.onHitEffectRounds, 'onHitEffect');
}

function resolveDebugPlayers(game: Game, actorIds: readonly number[], input: DebugPlayerIncreaseInput): Player[] {
  if (!Array.isArray(actorIds)) throw new Error('player.increase 第一个参数必须是角色 id 数组');
  assertDebugObject(input, 'player.increase');
  assertDebugKnownKeys(input, DEBUG_PLAYER_INCREASE_KEYS, 'player.increase');
  const ids = actorIds.length === 0 ? listAllPlayerIds(game) : actorIds;
  return ids.map((id, i) => {
    const actorId = assertDebugPositiveInt(id, `actorIds[${i}]`);
    const player = game.getPlayer(actorId);
    if (!player) throw new Error(`角色资源不存在: ARS 1-${actorId}`);
    return player;
  });
}

// 这里复用脚本 ATTRIBADD 的字段编号，方便调试结果和 Kotlin 行为对照。
function applyDebugPlayerIncrease(player: Player, input: DebugPlayerIncreaseInput): void {
  let applied = false;
  applied = addDebugPlayerAttribute(player, 0, input.level, 'level') || applied;
  applied = addDebugPlayerAttribute(player, 1, input.attack, 'attack') || applied;
  applied = addDebugPlayerAttribute(player, 2, input.defense, 'defense') || applied;
  applied = addDebugPlayerAttribute(player, 3, input.agility, 'agility') || applied;
  applied = addDebugPlayerAttribute(player, 4, input.hp, 'hp') || applied;
  applied = addDebugPlayerAttribute(player, 5, input.mp, 'mp') || applied;
  applied = addDebugPlayerAttribute(player, 6, input.exp, 'exp') || applied;
  applied = addDebugPlayerAttribute(player, 7, input.spirit, 'spirit') || applied;
  applied = addDebugPlayerAttribute(player, 8, input.luck, 'luck') || applied;
  applied = addDebugPlayerAttribute(player, 10, input.hpMax, 'hpMax') || applied;
  applied = addDebugPlayerAttribute(player, 11, input.mpMax, 'mpMax') || applied;
  if (!applied) throw new Error('player.increase 至少需要一个属性增量');
}

function addDebugPlayerAttribute(player: Player, type: number, value: number | undefined, name: string): boolean {
  if (value == null) return false;
  player.addScriptAttribute(type, assertDebugInt(value, name));
  return true;
}

function applyDebugStatuses(statuses: Player['immuneStatuses'], flags: number | undefined, round: number | undefined, name: string): void {
  if (flags == null) return;
  const value = assertDebugNonNegativeInt(flags, `${name}Flags`);
  statuses.clearFlags(STATUS_FLAGS_ALL);
  if (value !== 0) statuses.addFlags(value, round == null ? 99 : assertDebugNonNegativeInt(round, `${name}Rounds`));
}

function addDebugGoods(game: Game, input: DebugCombatGoodsInput): void {
  const type = assertDebugPositiveInt(input.type, 'goods.type');
  const index = assertDebugPositiveInt(input.index, 'goods.index');
  const count = assertDebugPositiveInt(input.count ?? 1, 'goods.count');
  const goods = game.bag.addGoods(type, index, count);
  if (!goods) throw new Error(`调试战斗物品不存在: GRS ${type}-${index}`);
}

function isDebugNumberArray(value: unknown): value is readonly number[] {
  return Array.isArray(value);
}

function assertDebugObject(value: unknown, name: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} 参数必须是对象`);
}

function assertDebugKnownKeys(value: object, allowed: readonly string[], name: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${name} 不支持字段: ${key}`);
  }
}

function assertDebugInt(value: number, name: string): number {
  if (!Number.isInteger(value)) throw new Error(`调试参数 ${name} 必须是整数: ${value}`);
  return value;
}

function assertDebugNonNegativeInt(value: number, name: string): number {
  const intValue = assertDebugInt(value, name);
  if (intValue < 0) throw new Error(`调试参数 ${name} 不能小于 0: ${value}`);
  return intValue;
}

function assertDebugPositiveInt(value: number, name: string): number {
  const intValue = assertDebugInt(value, name);
  if (intValue <= 0) throw new Error(`调试参数 ${name} 必须大于 0: ${value}`);
  return intValue;
}

function assertDebugRate(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`调试参数 ${name} 必须是数字: ${value}`);
  if (value < 0 || value > 1) throw new Error(`调试参数 ${name} 必须在 0 到 1 之间: ${value}`);
  return value;
}

function clampDebugInt(value: number, name: string, min: number, max: number): number {
  const intValue = assertDebugInt(value, name);
  if (intValue < min) return min;
  if (intValue > max) return max;
  return intValue;
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

function listAllMonsterIds(game: Game): number[] {
  return game.datLib
    .listResourceKeys(ResourceType.ARS)
    .filter(key => key.type === 3)
    .map(key => key.index);
}

function listAllMonsters(game: Game): Monster[] {
  return listAllMonsterIds(game).map(id => {
    const monster = game.datLib.getMonster(id);
    if (!monster) throw new Error(`怪物资源不存在: ARS 3-${id}`);
    return monster;
  });
}

function listAllCombatBackgrounds(game: Game): DebugCombatBackgroundItem[] {
  return game.datLib
    .listResourceKeys(ResourceType.PIC)
    .filter(key => key.type === 4)
    .map(key => {
      const image = game.datLib.getImage(ResourceType.PIC, 4, key.index);
      if (!image) throw new Error(`战斗背景资源不存在: PIC 4-${key.index}`);
      return { index: key.index, width: image.width, height: image.height, frames: image.number };
    });
}

function getFirstCombatBackgroundIndex(game: Game): number {
  const key = game.datLib.listResourceKeys(ResourceType.PIC).find(item => item.type === 4);
  if (!key) throw new Error('没有可用的战斗背景 PIC 4-*');
  return key.index;
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
    const goods = game.datLib.getGoods(key.type, key.index);
    if (goods) items.push(goods);
  }
  return items;
}

function findPlayer(game: Game, actorId: number): Player | null {
  const player = game.state.players.find(item => item.index === actorId);
  if (player) return player;
  return game.datLib.getPlayer(actorId);
}

function toDebugPlayerItem(game: Game, player: Player): DebugPlayerItem {
  return {
    index: player.index,
    name: player.name,
    level: player.level,
    hp: player.hp,
    hpMax: player.hpMax,
    mp: player.mp,
    mpMax: player.mpMax,
    attack: player.attack,
    defense: player.defense,
    agility: player.agility,
    spirit: player.spirit,
    luck: player.luck,
    exp: player.exp,
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

function toDebugCombatMonsterItem(monster: Monster): DebugCombatMonsterItem {
  return {
    index: monster.index,
    name: monster.name,
    level: monster.level,
    hp: monster.hpMax,
    mp: monster.mpMax,
    attack: monster.attack,
    defense: monster.defense,
    agility: monster.agility,
    spirit: monster.spirit,
    luck: monster.luck,
    iq: monster.iq,
    exp: monster.exp,
    money: monster.money,
    stealGoods: monster.stealGoods ? toDebugCarryGoodsItem(monster.stealGoods.goods, monster.stealGoods.count) : null,
    dropGoods: monster.dropGoods ? toDebugCarryGoodsItem(monster.dropGoods.goods, monster.dropGoods.count) : null,
  };
}

function toDebugCarryGoodsItem(goods: BaseGoods, count: number): DebugCarryGoodsItem {
  return {
    type: goods.type,
    index: goods.index,
    count,
    name: goods.name,
  };
}
