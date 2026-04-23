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
    sceneName: '',
  };
}
