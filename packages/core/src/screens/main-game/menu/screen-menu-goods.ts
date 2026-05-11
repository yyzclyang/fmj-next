import type { Game } from '@/game/game';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawVerticalMenu, moveSelectionClamp } from './menu-select';

const GOODS_ITEMS = ['使用', '装备', '丢弃'] as const;
const LINE_GAP = 16;
export type GoodsMenuItem = (typeof GOODS_ITEMS)[number];

export interface ScreenMenuGoodsCallbacks {
  onConfirm(item: GoodsMenuItem): void;
  onCancel(): void;
}

// 物品菜单只保留三项分流，具体列表由一级菜单回调打开。
export class ScreenMenuGoods extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly callbacks: ScreenMenuGoodsCallbacks
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawInsetPanel(surface, 39, 39, 39, 55);
    drawVerticalMenu(surface, {
      items: GOODS_ITEMS,
      selectedIndex: this.selectedIndex,
      left: 42,
      top: 42,
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
    this.selectedIndex = moveSelectionClamp(this.selectedIndex, step, GOODS_ITEMS.length);
  }

  private confirm(): void {
    const item = GOODS_ITEMS[this.selectedIndex];
    this.callbacks.onConfirm(item);
  }
}
