import type { Game } from '@/game/game';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';

export const TRADE_PANEL_TEXT_LEFT = 15;

const TRADE_FRAME_LEFT = 12;
const TRADE_FRAME_TOP = 21;
const TRADE_FRAME_WIDTH = 136;
const TRADE_FRAME_HEIGHT = 55;

// 买卖数量框是脚本商店共用的小弹层，位置跟 Kotlin 保持一致。
export function drawTradePanel(surface: Surface): void {
  drawInsetPanel(surface, TRADE_FRAME_LEFT, TRADE_FRAME_TOP, TRADE_FRAME_WIDTH, TRADE_FRAME_HEIGHT);
}

export function showTradeMessage(game: Game, text: string): void {
  const mainScene = game.mainScene;
  if (!mainScene) throw new Error('主场景不存在，无法显示交易消息');
  mainScene.showMessage(text, 1000);
}
