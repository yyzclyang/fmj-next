import type { CombatWinSettlement } from '@/combat/combat-runtime';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { createCombatSuccessPendingPages, createCombatSuccessVisiblePages, type SuccessPage } from './success-pages';

// CombatSuccess 会逐条显示经验、金钱、掉落和升级信息。
export class CombatSuccessSequence {
  private readonly visiblePages: SuccessPage[];
  private readonly pendingPages: SuccessPage[];
  private elapsed = 0;
  private skipRequested = false;

  constructor(game: Game, settlement: CombatWinSettlement) {
    this.visiblePages = createCombatSuccessVisiblePages(settlement);
    this.pendingPages = createCombatSuccessPendingPages(game, settlement);
  }

  update(delta: number): boolean {
    this.elapsed += delta;
    if (this.elapsed <= 1000 /* 信息间隔时间 */ && !this.skipRequested) return false;
    this.elapsed = 0;
    this.skipRequested = false;
    const page = this.pendingPages.shift();
    if (!page) return true;
    this.visiblePages.push(page);
    return false;
  }

  draw(surface: Surface): void {
    for (const page of this.visiblePages) {
      page.draw(surface);
    }
  }

  skip(): void {
    this.skipRequested = true;
  }
}
