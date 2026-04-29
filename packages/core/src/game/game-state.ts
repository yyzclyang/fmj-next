import type { Player } from '@/characters';

export interface GameGoodsState {
  type: number;
  index: number;
  count: number;
}

export const SCRIPT_VARIABLE_COUNT = 800;
export const SCRIPT_LOCAL_VARIABLE_START = 200;
export const SCRIPT_LOCAL_VARIABLE_END = 240;

export interface GameState {
  mapType: number;
  mapIndex: number;
  mapScreenX: number;
  mapScreenY: number;
  // 队伍里即使有多个角色，地图上也只跟踪当前可见的那个主角位置。
  playerMapX: number;
  playerMapY: number;
  scriptType: number;
  scriptIndex: number;
  eventFlags: number[];
  scriptVariables: number[];
  collectedBoxKeys: string[];
  players: Player[];
  partyActorIds: number[];
  controlActorId: number;
  money: number;
  goods: GameGoodsState[];
  sceneName: string;
  disableSave: boolean;
  allowFightMiss: boolean;
  allowTossArm: boolean;
}

export function createInitialGameState(): GameState {
  return {
    mapType: 0,
    mapIndex: 0,
    mapScreenX: 0,
    mapScreenY: 0,
    playerMapX: 0,
    playerMapY: 0,
    scriptType: 1,
    scriptIndex: 1,
    eventFlags: [],
    scriptVariables: Array.from({ length: SCRIPT_VARIABLE_COUNT }, () => 0),
    collectedBoxKeys: [],
    players: [],
    partyActorIds: [],
    controlActorId: 0,
    money: 0,
    goods: [],
    sceneName: '',
    disableSave: false,
    allowFightMiss: false,
    allowTossArm: true,
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    eventFlags: [...state.eventFlags],
    scriptVariables: [...state.scriptVariables],
    collectedBoxKeys: [...state.collectedBoxKeys],
    players: [...state.players],
    partyActorIds: [...state.partyActorIds],
    goods: state.goods.map(g => ({ ...g })),
  };
}
