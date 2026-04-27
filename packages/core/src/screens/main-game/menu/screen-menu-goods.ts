import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';
import { drawVerticalMenu, moveSelectionClamp } from './menu-select';

const GOODS_ITEMS = ['使用', '装备', '丢弃'] as const;
const LINE_GAP = 16;

// 物品菜单保留 Kotlin 的三项分流，具体物品列表后续再实现。
export class ScreenMenuGoods extends BaseScreen {
  private selectedIndex = 0;

  constructor(game: Game) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, 39, 39, 39, 55);
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
        this.close();
        return;
    }
  }

  private moveSelection(step: number): void {
    this.selectedIndex = moveSelectionClamp(this.selectedIndex, step, GOODS_ITEMS.length);
  }

  private confirm(): void {
    const item = GOODS_ITEMS[this.selectedIndex];
    this.close();
    console.log(`确认物品菜单:${item}`);
  }
}
