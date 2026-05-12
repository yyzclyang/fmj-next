import type { Game } from '@/game/game';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/utils/key-code';
import { drawVerticalMenu } from './menu-select';

const PROPERTY_ITEMS = ['状态', '穿戴'] as const;
const LINE_GAP = 16;
export type PropertyMenuItem = (typeof PROPERTY_ITEMS)[number];

export interface ScreenMenuPropertiesCallbacks {
  onConfirm(item: PropertyMenuItem): void;
  onCancel(): void;
}

// 属性菜单只负责分流，真实状态/穿戴页后续再接入。
export class ScreenMenuProperties extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly callbacks: ScreenMenuPropertiesCallbacks
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawInsetPanel(surface, 39, 16, 39, 39);
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
        this.callbacks.onCancel();
        return;
    }
  }

  private confirm(): void {
    const item = PROPERTY_ITEMS[this.selectedIndex];
    this.callbacks.onConfirm(item);
  }
}
