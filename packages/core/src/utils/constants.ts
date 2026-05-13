// Core 固定输出 320x192 的像素缓冲，host 再决定实际显示尺寸。
export const SCREEN_WIDTH = 320;
export const SCREEN_HEIGHT = 192;

// 游戏文件原始宽高
export const ORIGIN_SCREEN_WIDTH = 160;
export const ORIGIN_SCREEN_HEIGHT = 96;

// 引擎内部固定按 40ms 逻辑帧推进，host 通过调用频率控制倍速。
export const FIXED_STEP_MS = 40;

// 地图和图块渲染固定按 16x16 格子工作。
export const MAP_TILE_SIZE = 16;
export const MAP_VIEW_TILE_WIDTH = Math.floor(SCREEN_WIDTH / MAP_TILE_SIZE);
export const MAP_VIEW_TILE_HEIGHT = Math.floor(SCREEN_HEIGHT / MAP_TILE_SIZE);
