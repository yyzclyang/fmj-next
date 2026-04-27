import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';
import { drawVerticalMenu, moveSelectionWrap } from './menu-select';

const SYSTEM_ITEMS = ['读入进度', '存储进度', '游戏设置', '结束游戏'] as const;
const LINE_GAP = 16;
const TEXT_PADDING = 3;
export type SystemMenuItem = (typeof SYSTEM_ITEMS)[number];

export interface ScreenMenuSystemCallbacks {
  onConfirm(item: SystemMenuItem): void;
  onCancel(): void;
}

// 当前屏幕高度足够展示四项，所以系统菜单不沿用 Kotlin 的滚动箭头。
export class ScreenMenuSystem extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly callbacks: ScreenMenuSystemCallbacks
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, 39, 29, 71, SYSTEM_ITEMS.length * LINE_GAP + TEXT_PADDING * 2);
    drawVerticalMenu(surface, {
      items: SYSTEM_ITEMS,
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
    this.selectedIndex = moveSelectionWrap(this.selectedIndex, step, SYSTEM_ITEMS.length);
  }

  private confirm(): void {
    const item = SYSTEM_ITEMS[this.selectedIndex];
    this.callbacks.onConfirm(item);
  }
}
