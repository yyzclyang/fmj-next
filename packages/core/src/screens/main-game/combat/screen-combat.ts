import type { CombatSession } from '@/combat';
import type { FightingSprite } from '@/characters';
import type { Game } from '@/game/game';
import { COLOR_BLACK } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { ScreenCombatSuccess } from './screen-combat-success';

export interface ScreenCombatOptions {
  readonly allowDebugWin?: boolean;
}

// 第一阶段只接通 Kotlin 的全屏战斗生命周期，回合 UI 后续继续补。
export class ScreenCombat extends BaseScreen {
  private successScreen: ScreenCombatSuccess | null = null;

  constructor(
    game: Game,
    private readonly session: CombatSession,
    private readonly options: ScreenCombatOptions = {}
  ) {
    super(game);
  }

  override update(delta: number): void {
    if (this.successScreen?.update(delta)) {
      this.finish('win');
    }
  }

  draw(surface: Surface): void {
    const bg = this.session.background;
    if (bg) {
      surface.drawBitmap(bg, 0, 0);
    } else {
      surface.drawColor(COLOR_BLACK);
    }

    for (const monster of this.session.monsters) {
      this.drawFightingSprite(surface, monster.fightingSprite);
    }
    for (let i = this.session.players.length - 1; i >= 0; i -= 1) {
      this.drawFightingSprite(surface, this.session.players[i]?.fightingSprite ?? null);
    }
    this.successScreen?.draw(surface);
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (this.successScreen) {
      this.successScreen.skip();
      return;
    }

    switch (key) {
      case KeyCode.Enter:
        if (!this.options.allowDebugWin) return;
        this.successScreen = new ScreenCombatSuccess(this.game, this.session.settleWin());
        return;
      case KeyCode.Cancel:
        this.finish('loss');
        return;
    }
  }

  private finish(result: 'win' | 'loss'): void {
    this.close();
    this.session.finish(result);
  }

  private drawFightingSprite(surface: Surface, sprite: FightingSprite | null): void {
    if (!sprite) return;
    const left = Math.trunc(sprite.combatX - sprite.width / 2);
    const top = Math.trunc(sprite.combatY - sprite.height / 2);
    sprite.image.draw(surface, sprite.currentFrame, left, top);
  }
}
