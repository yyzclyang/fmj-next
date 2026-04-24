export interface GameGoodsState {
  type: number;
  index: number;
  count: number;
}

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
  collectedBoxKeys: string[];
  money: number;
  goods: GameGoodsState[];
  sceneName: string;
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
    collectedBoxKeys: [],
    money: 0,
    goods: [],
    sceneName: '',
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    eventFlags: [...state.eventFlags],
    collectedBoxKeys: [...state.collectedBoxKeys],
    goods: state.goods.map(g => ({ ...g })),
  };
}
