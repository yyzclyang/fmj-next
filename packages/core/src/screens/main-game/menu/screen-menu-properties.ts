import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';
import { drawVerticalMenu } from './menu-select';

const PROPERTY_ITEMS = ['状态', '穿戴'] as const;
const LINE_GAP = 16;

// 属性菜单只负责分流，真实状态/穿戴页后续再接入。
export class ScreenMenuProperties extends BaseScreen {
  private selectedIndex = 0;

  constructor(game: Game) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, 39, 16, 39, 39);
    drawVerticalMenu(surface, {
      items: PROPERTY_ITEMS,
      selectedIndex: this.selectedIndex,
      left: 42,
      top: 19,
      lineGap: LINE_GAP,
    });
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
      case KeyCode.Down:
        this.selectedIndex = 1 - this.selectedIndex;
        return;
      case KeyCode.Enter:
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private confirm(): void {
    const item = PROPERTY_ITEMS[this.selectedIndex];
    this.close();
    console.log(`确认属性菜单:${item}`);
  }
}
