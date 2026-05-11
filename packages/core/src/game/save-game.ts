import { createInitialGameState, type GameGoodsState, type GameState } from './game-state';
import type { StatusSlot, Player } from '@/characters';
import type { MainSceneRuntimeSnapshot } from '@/screens/main-game/runtime';

export const SAVE_SLOT_COUNT = 5;
export const CORRUPT_SAVE_MESSAGE = '存档损坏';

const SAVE_VERSION = 1;
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

export interface SaveGameState {
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
  disableSave?: boolean;
  mainScene: MainSceneRuntimeSnapshot | null;
  allowFightMiss: boolean;
  allowTossArm: boolean;
  allowWallWalking: boolean;
  useOriginalDamageFormula: boolean;
  showPosition: boolean;
}

export interface SaveResourceRef {
  type: number;
  index: number;
}

export interface SavePlayerState {
  index: number;
  state?: number;
  direction?: number;
  step?: number;
  mapX?: number;
  mapY?: number;
  level: number;
  learnedMagicCount: number;
  magicChainLearnedMagicCount: number;
  hpMax: number;
  hp: number;
  mpMax: number;
  mp: number;
  attack: number;
  defense: number;
  agility: number;
  spirit: number;
  luck: number;
  exp: number;
  onHitEffectRounds: number;
  onHitEffectFlags: number;
  coopMagicIndex: number;
  hpPerRound: number;
  mpPerRound: number;
  equipment: Array<SaveResourceRef | null>;
  privateMagics: SaveResourceRef[];
  immuneStatuses: StatusSlot[];
  activeStatuses: StatusSlot[];
}

export function createSavePayload(
  state: GameState,
  slot: number,
  mainScene: MainSceneRuntimeSnapshot | null
): SaveGamePayload {
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
      players: state.players.map(createPlayerState),
      partyActorIds: [...state.partyActorIds],
      controlActorId: state.controlActorId,
      money: state.money,
      goods: state.goods.map(goods => ({ ...goods })),
      sceneName: state.sceneName,
      disableSave: state.disableSave,
      mainScene,
      allowFightMiss: state.allowFightMiss,
      allowTossArm: state.allowTossArm,
      allowWallWalking: state.allowWallWalking,
      useOriginalDamageFormula: state.useOriginalDamageFormula,
      showPosition: state.showPosition,
    },
  };
}

function createPlayerState(player: Player): SavePlayerState {
  const onHitEffect = player.getOnHitEffectConfig();
  return {
    index: player.index,
    state: player.state,
    direction: player.direction,
    step: player.step,
    mapX: player.mapX,
    mapY: player.mapY,
    level: player.level,
    learnedMagicCount: player.learnedMagicCount,
    magicChainLearnedMagicCount: player.magicChain?.learnedMagicCount ?? 0,
    hpMax: player.hpMax,
    hp: player.hp,
    mpMax: player.mpMax,
    mp: player.mp,
    attack: player.attack,
    defense: player.defense,
    agility: player.agility,
    spirit: player.spirit,
    luck: player.luck,
    exp: player.exp,
    onHitEffectRounds: onHitEffect.rounds,
    onHitEffectFlags: onHitEffect.flags,
    coopMagicIndex: player.coopMagicIndex,
    hpPerRound: player.hpPerRound,
    mpPerRound: player.mpPerRound,
    equipment: player.equipment.map(goods => (goods ? { type: goods.type, index: goods.index } : null)),
    privateMagics: player.getPrivateLearnedMagicRefs(),
    immuneStatuses: cloneStatusSlots(player.immuneStatuses.slots),
    activeStatuses: cloneStatusSlots(player.activeStatuses.slots),
  };
}

function cloneStatusSlots(slots: readonly StatusSlot[]): StatusSlot[] {
  return slots.map(slot => ({ value: slot.value, round: slot.round }));
}

export function encodeSavePayload(payload: SaveGamePayload): Uint8Array {
  return textEncoder.encode(JSON.stringify(payload));
}

export function decodeSavePayload(data: Uint8Array): SaveGamePayload {
  let payload: unknown;
  try {
    payload = JSON.parse(textDecoder.decode(data)) as unknown;
  } catch {
    throw new Error(CORRUPT_SAVE_MESSAGE);
  }
  if (!isSavePayloadShape(payload)) {
    throw new Error(CORRUPT_SAVE_MESSAGE);
  }
  return payload;
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
    disableSave: state.disableSave ?? false,
    allowFightMiss: state.allowFightMiss ?? false,
    allowTossArm: state.allowTossArm ?? true,
    allowWallWalking: state.allowWallWalking,
    useOriginalDamageFormula: state.useOriginalDamageFormula,
    showPosition: state.showPosition,
  };
}

function isSavePayloadShape(value: unknown): value is SaveGamePayload {
  if (!isRecord(value)) return false;
  if (value.version !== SAVE_VERSION || !isRecord(value.summary) || !isRecord(value.state)) return false;
  const summary = value.summary;
  const state = value.state;
  return (
    typeof summary.slot === 'number' &&
    typeof summary.sceneName === 'string' &&
    isNumberArray(summary.partyActorIds) &&
    isStringArray(summary.partyNames) &&
    typeof summary.money === 'number' &&
    typeof summary.savedAt === 'string' &&
    isNumberArray(state.eventFlags) &&
    isNumberArray(state.scriptVariables) &&
    isStringArray(state.collectedBoxKeys) &&
    Array.isArray(state.players) &&
    isNumberArray(state.partyActorIds) &&
    isGoodsArray(state.goods) &&
    typeof state.allowWallWalking === 'boolean' &&
    typeof state.useOriginalDamageFormula === 'boolean' &&
    typeof state.showPosition === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isGoodsArray(value: unknown): value is GameGoodsState[] {
  return (
    Array.isArray(value) &&
    value.every(item => {
      if (!isRecord(item)) return false;
      return typeof item.type === 'number' && typeof item.index === 'number' && typeof item.count === 'number';
    })
  );
}
