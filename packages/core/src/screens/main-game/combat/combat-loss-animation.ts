import type { Game } from '@/game/game';
import type { ResSrs } from '@/lib/res-srs';
import type { Surface } from '@/rendering/surface';
import type { CombatActionAnimation } from './combat-animation-types';

// 随机战失败沿用 Kotlin 的飞桃过场，播完后才真正退出战斗。
export class CombatLossAnimation implements CombatActionAnimation {
  private readonly srs: ResSrs;

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
    this.srs.draw(surface, 0, 0);
  }
}
