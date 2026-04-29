import type { FightingSprite, Monster, Player } from '@/characters';
import type { ActionIconIndex, CombatPhase } from '@/combat/combat-actions';
import type { CombatSession } from '@/combat/combat-runtime';
import type { Game } from '@/game/game';
import { COLOR_BLACK } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import type { CombatActionAnimation } from './combat-animations';
import { CombatUi } from './combat-ui';
import type { ScreenCombatSuccess } from './screen-combat-success';

interface CombatRendererState {
  readonly session: CombatSession;
  readonly phase: CombatPhase;
  readonly autoAttack: boolean;
  readonly successScreen: ScreenCombatSuccess | null;
  readonly animation: CombatActionAnimation | null;
  readonly actionIconIndex: ActionIconIndex;
  readonly miscIndex: number;
  readonly combatGoodsIndex: number;
  readonly statusPlayerIndex: number;
  readonly currentPlayer: Player | null;
  readonly currentMonster: Monster | null;
  readonly currentTargetPlayer: Player | null;
  readonly message: string;
  readonly showMessage: boolean;
}

// 渲染器只读取战斗状态并绘制画面，所有状态推进仍留在 ScreenCombat。
export class CombatRenderer {
  private readonly ui: CombatUi;

  constructor(game: Game) {
    this.ui = new CombatUi(game);
  }

  draw(surface: Surface, state: CombatRendererState): void {
    this.drawBackground(surface, state.session);
    this.drawFighters(surface, state);
    if (state.phase === 'performing') {
      state.animation?.draw(surface);
    }
    if (!state.successScreen && state.phase !== 'performing' && !state.autoAttack) {
      this.drawUi(surface, state);
    }
    if (state.showMessage) {
      this.ui.drawMessage(surface, state.message);
    }
    state.successScreen?.draw(surface);
  }

  private drawBackground(surface: Surface, session: CombatSession): void {
    if (session.background) {
      surface.drawBitmap(session.background, 0, 0);
      return;
    }
    surface.drawColor(COLOR_BLACK);
  }

  private drawFighters(surface: Surface, state: CombatRendererState): void {
    for (const monster of state.session.monsters) {
      if (!monster.isAlive && !state.animation?.keepsVisible?.(monster)) continue;
      drawFightingSprite(surface, monster.fightingSprite);
    }
    for (let i = state.session.players.length - 1; i >= 0; i -= 1) {
      drawFightingSprite(surface, state.session.players[i]?.fightingSprite ?? null);
    }
  }

  private drawUi(surface: Surface, state: CombatRendererState): void {
    this.ui.draw(surface, {
      phase: state.phase,
      actionIconIndex: state.actionIconIndex,
      miscIndex: state.miscIndex,
      combatGoodsIndex: state.combatGoodsIndex,
      statusPlayerIndex: state.statusPlayerIndex,
      currentPlayer: state.currentPlayer,
      currentMonster: state.currentMonster,
      currentTargetPlayer: state.currentTargetPlayer,
      players: state.session.players,
    });
  }
}

function drawFightingSprite(surface: Surface, sprite: FightingSprite | null): void {
  if (!sprite) return;
  const left = Math.trunc(sprite.combatX - sprite.width / 2);
  const top = Math.trunc(sprite.combatY - sprite.height / 2);
  sprite.image.draw(surface, sprite.currentFrame, left, top);
}
