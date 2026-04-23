export interface GameState {
  mapType: number;
  mapIndex: number;
  mapScreenX: number;
  mapScreenY: number;
  // 队伍里即使有多个角色，地图上也只跟踪当前可见的那个主角位置。
  playerMapX: number;
  playerMapY: number;
  sceneName: string;
}

export function createInitialGameState(): GameState {
  return {
    mapType: 1,
    mapIndex: 1,
    mapScreenX: 4,
    mapScreenY: 4,
    playerMapX: 13,
    playerMapY: 9,
    sceneName: '',
  };
}
