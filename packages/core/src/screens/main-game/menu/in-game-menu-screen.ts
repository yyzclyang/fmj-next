import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';

const IN_GAME_MENU_OPTIONS = ['属性', '魔法', '物品', '系统'] as const;
const MONEY_FRAME_LEFT = 9;
const MONEY_FRAME_TOP = 3;
const MONEY_FRAME_WIDTH = 93;
const MONEY_FRAME_HEIGHT = 22;
const MENU_LEFT = 9;
const MENU_TOP = 24;
const MENU_WIDTH = 38;
const MENU_HEIGHT = 70;
const MENU_TEXT_LEFT = 12;
const MENU_ITEM_TOP = 27;
const MENU_LINE_GAP = 16;

// 游戏内菜单是主场景的子 screen，后续二级菜单也从这里继续 push。
export class InGameMenuScreen extends BaseScreen {
  private currentSelection = 0;

  constructor(game: Game) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, MONEY_FRAME_LEFT, MONEY_FRAME_TOP, MONEY_FRAME_WIDTH, MONEY_FRAME_HEIGHT);
    TextRender.drawText(surface, `金钱:${this.game.state.money}`, MONEY_FRAME_LEFT + 3, MONEY_FRAME_TOP + 3);
    drawMenuFrame(surface, MENU_LEFT, MENU_TOP, MENU_WIDTH, MENU_HEIGHT);
    for (let i = 0; i < IN_GAME_MENU_OPTIONS.length; i += 1) {
      const top = MENU_ITEM_TOP + i * MENU_LINE_GAP;
      const draw = i === this.currentSelection ? TextRender.drawSelText : TextRender.drawText;
      draw(surface, IN_GAME_MENU_OPTIONS[i] ?? '', MENU_TEXT_LEFT, top);
    }
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
        this.confirmSelection();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private moveSelection(step: number): void {
    const count = IN_GAME_MENU_OPTIONS.length;
    this.currentSelection = (this.currentSelection + step + count) % count;
  }

  private confirmSelection(): void {
    const option = IN_GAME_MENU_OPTIONS[this.currentSelection];
    console.log(`确认游戏菜单:${option}`);
  }
}
