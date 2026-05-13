import type { Game } from '@/game/game';
import type { ResSrs } from '@/lib/res-srs';
import { COLOR_TRANSPARENT } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import type { CombatActionAnimation } from './animation-types';

// 随机战失败飞桃过场，播完后才真正退出战斗。
export class CombatLossAnimation implements CombatActionAnimation {
  private readonly srs: ResSrs;
  private readonly frameSurface = new Surface(160 /* 动画原始宽度 */, 96 /* 动画原始高度 */);

  constructor(game: Game) {
    const srs = game.datLib.getSrs(1, 249);
    if (!srs) throw new Error('战斗失败动画资源不存在: SRS 1-249');
    this.srs = srs;
    this.srs.start();
    this.srs.setIteratorNum(5);
  }

  update(delta: number): boolean {
    return this.srs.update(delta);
  }

  draw(surface: Surface): void {
    this.frameSurface.drawColor(COLOR_TRANSPARENT);
    this.srs.draw(this.frameSurface, 0, 0);
    surface.drawCenteredScaledSurface(this.frameSurface, 2);
  }
}
