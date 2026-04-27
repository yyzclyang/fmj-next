import {
  createInitialGameState,
  type GameGoodsState,
  type GameState,
} from './game-state';
import type { BuffState, Player } from '@/characters';

export const SAVE_SLOT_COUNT = 5;

const SAVE_VERSION = 1;
const SAVE_KEY_PREFIX = 'fmj-save-';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface SaveSlotSummary {
  slot: number;
  sceneName: string;
  partyActorIds: number[];
  partyNames: string[];
  money: number;
  savedAt: string;
}

export interface SaveGamePayload {
  version: typeof SAVE_VERSION;
  summary: SaveSlotSummary;
  state: SaveGameState;
}

interface SaveGameState {
  mapType: number;
  mapIndex: number;
  mapScreenX: number;
  mapScreenY: number;
  playerMapX: number;
  playerMapY: number;
  scriptType: number;
  scriptIndex: number;
  eventFlags: number[];
  scriptVariables: number[];
  collectedBoxKeys: string[];
  players: SavePlayerState[];
  partyActorIds: number[];
  controlActorId: number;
  money: number;
  goods: GameGoodsState[];
  sceneName: string;
}

export interface SaveResourceRef {
  type: number;
  index: number;
}

export interface SavePlayerState {
  index: number;
  level: number;
  learntMagicCount: number;
  magicChainLearnNum: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  attack: number;
  defend: number;
  speed: number;
  lingli: number;
  luck: number;
  currentExp: number;
  totalMaxHp: number;
  totalMaxMp: number;
  totalAttack: number;
  totalDefend: number;
  totalSpeed: number;
  totalLingli: number;
  totalLuck: number;
  equipment: Array<SaveResourceRef | null>;
  privateMagics: SaveResourceRef[];
  buff: BuffState[];
  debuff: BuffState[];
  atbuff: BuffState[];
}

export function getSaveSlotKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

export function createSavePayload(state: GameState, slot: number): SaveGamePayload {
  return {
    version: SAVE_VERSION,
    summary: {
      slot,
      sceneName: state.sceneName,
      partyActorIds: [...state.partyActorIds],
      partyNames: state.partyActorIds.map(id => state.players.find(player => player.index === id)?.name ?? `角色${id}`),
      money: state.money,
      savedAt: new Date().toISOString(),
    },
    state: {
      mapType: state.mapType,
      mapIndex: state.mapIndex,
      mapScreenX: state.mapScreenX,
      mapScreenY: state.mapScreenY,
      playerMapX: state.playerMapX,
      playerMapY: state.playerMapY,
      scriptType: state.scriptType,
      scriptIndex: state.scriptIndex,
      eventFlags: [...state.eventFlags],
      scriptVariables: [...state.scriptVariables],
      collectedBoxKeys: [...state.collectedBoxKeys],
      players: state.partyActorIds.map(id => createPlayerState(getPartyPlayer(state, id))),
      partyActorIds: [...state.partyActorIds],
      controlActorId: state.controlActorId,
      money: state.money,
      goods: state.goods.map(goods => ({ ...goods })),
      sceneName: state.sceneName,
    },
  };
}

function getPartyPlayer(state: GameState, actorId: number): Player {
  const player = state.players.find(item => item.index === actorId);
  if (!player) throw new Error(`存档队伍角色不存在: ${actorId}`);
  return player;
}

function createPlayerState(player: Player): SavePlayerState {
  return {
    index: player.index,
    level: player.level,
    learntMagicCount: player.learntMagicCount,
    magicChainLearnNum: player.magicChain?.learnNum ?? 0,
    maxHp: player.maxHp,
    hp: player.hp,
    maxMp: player.maxMp,
    mp: player.mp,
    attack: player.attack,
    defend: player.defend,
    speed: player.speed,
    lingli: player.lingli,
    luck: player.luck,
    currentExp: player.currentExp,
    totalMaxHp: player.totalMaxHp,
    totalMaxMp: player.totalMaxMp,
    totalAttack: player.totalAttack,
    totalDefend: player.totalDefend,
    totalSpeed: player.totalSpeed,
    totalLingli: player.totalLingli,
    totalLuck: player.totalLuck,
    equipment: player.equipment.map(goods => (goods ? { type: goods.type, index: goods.index } : null)),
    privateMagics: player.getPrivateLearntMagicKeys(),
    buff: cloneBuffs(player.buff.buffs),
    debuff: cloneBuffs(player.debuff.buffs),
    atbuff: cloneBuffs(player.atbuff.buffs),
  };
}

function cloneBuffs(buffs: readonly BuffState[]): BuffState[] {
  return buffs.map(buff => ({ value: buff.value, round: buff.round }));
}

export function encodeSavePayload(payload: SaveGamePayload): Uint8Array {
  return textEncoder.encode(JSON.stringify(payload));
}

export function decodeSavePayload(data: Uint8Array): SaveGamePayload {
  const payload = JSON.parse(textDecoder.decode(data)) as Partial<SaveGamePayload>;
  if (payload.version !== SAVE_VERSION || !payload.summary || !payload.state) {
    throw new Error('存档数据版本不兼容');
  }
  return payload as SaveGamePayload;
}

export function toLoadedGameState(payload: SaveGamePayload): GameState {
  const state = payload.state;
  return {
    ...createInitialGameState(),
    mapType: state.mapType,
    mapIndex: state.mapIndex,
    mapScreenX: state.mapScreenX,
    mapScreenY: state.mapScreenY,
    playerMapX: state.playerMapX,
    playerMapY: state.playerMapY,
    scriptType: state.scriptType,
    scriptIndex: state.scriptIndex,
    eventFlags: [...state.eventFlags],
    scriptVariables: [...state.scriptVariables],
    collectedBoxKeys: [...state.collectedBoxKeys],
    // Player 资源对象不直接入存档，读回后由 Game.getPlayer 按队伍 id 重新构造。
    players: [],
    partyActorIds: [...state.partyActorIds],
    controlActorId: state.controlActorId,
    money: state.money,
    goods: state.goods.map(goods => ({ ...goods })),
    sceneName: state.sceneName,
  };
}
