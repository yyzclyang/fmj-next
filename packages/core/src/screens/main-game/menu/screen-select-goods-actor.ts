import type { Player } from '@/characters';
import type { Game } from '@/game/game';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawVerticalMenu, moveSelectionClamp } from './menu-select';

const FRAME_LEFT = 50;
const FRAME_TOP = 14;
const FRAME_WIDTH = 86;
const TEXT_LEFT = 53;
const TEXT_TOP = 17;
const LINE_GAP = 16;
const PADDING_HEIGHT = 6;

export interface ScreenSelectGoodsActorCallbacks {
  onConfirm(player: Player): void;
}

// 物品装备分支的角色选择弹窗，坐标按 Kotlin 匿名 screen 固定。
export class ScreenSelectGoodsActor extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly players: readonly Player[],
    private readonly callbacks: ScreenSelectGoodsActorCallbacks
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawInsetPanel(surface, FRAME_LEFT, FRAME_TOP, FRAME_WIDTH, PADDING_HEIGHT + LINE_GAP * this.players.length);
    drawVerticalMenu(surface, {
      items: this.players.map(player => player.name),
      selectedIndex: this.selectedIndex,
      left: TEXT_LEFT,
      top: TEXT_TOP,
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
        this.close();
        return;
    }
  }

  private moveSelection(step: number): void {
    this.selectedIndex = moveSelectionClamp(this.selectedIndex, step, this.players.length);
  }

  private confirm(): void {
    const player = this.players[this.selectedIndex];
    if (!player) throw new Error('没有可选择的装备角色');
    this.callbacks.onConfirm(player);
  }
}
