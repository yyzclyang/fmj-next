import type { GameState } from '@/game/game-state';

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
}

export function createDebugApi(getState: () => GameState | null): DebugApi {
  return {
    getSnapshot() {
      const state = getState();
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
  };
}
