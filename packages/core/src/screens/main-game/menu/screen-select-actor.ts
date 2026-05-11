import type { Player } from '@/characters';
import type { Game } from '@/game/game';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawVerticalMenu, moveSelectionWrap } from './menu-select';

const LINE_GAP = 16;
const TEXT_PADDING = 3;

export interface ScreenSelectActorCallbacks {
  onConfirm(player: Player): void;
  onCancel(): void;
}

// 多角色使用魔法前先选角色；单角色场景由主菜单直接确认。
export class ScreenSelectActor extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly players: readonly Player[],
    private readonly callbacks: ScreenSelectActorCallbacks
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawInsetPanel(surface, 39, 29, 86, this.players.length * LINE_GAP + TEXT_PADDING * 2);
    drawVerticalMenu(surface, {
      items: this.players.map(player => player.name),
      selectedIndex: this.selectedIndex,
      left: 42,
      top: 32,
      lineGap: LINE_GAP,
    });
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.moveSelection(-1);
        return;
      case KeyCode.Down:
        this.moveSelection(1);
        return;
      case KeyCode.Enter:
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.callbacks.onCancel();
        return;
    }
  }

  private moveSelection(step: number): void {
    this.selectedIndex = moveSelectionWrap(this.selectedIndex, step, this.players.length);
  }

  private confirm(): void {
    const player = this.players[this.selectedIndex];
    if (!player) {
      throw new Error('没有可选择的角色');
    }
    this.callbacks.onConfirm(player);
  }
}
