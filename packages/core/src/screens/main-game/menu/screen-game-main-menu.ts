import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';
import { drawVerticalMenu, moveSelectionWrap } from './menu-select';
import { ScreenMenuGoods } from './screen-menu-goods';
import { ScreenMenuProperties } from './screen-menu-properties';
import { ScreenMenuSystem } from './screen-menu-system';
import { getPartyPlayers, ScreenSelectActor } from './screen-select-actor';

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
export class ScreenGameMainMenu extends BaseScreen {
  private currentSelection = 0;

  constructor(game: Game) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, MONEY_FRAME_LEFT, MONEY_FRAME_TOP, MONEY_FRAME_WIDTH, MONEY_FRAME_HEIGHT);
    TextRender.drawText(surface, `金钱:${this.game.state.money}`, MONEY_FRAME_LEFT + 3, MONEY_FRAME_TOP + 3);
    drawMenuFrame(surface, MENU_LEFT, MENU_TOP, MENU_WIDTH, MENU_HEIGHT);
    drawVerticalMenu(surface, {
      items: IN_GAME_MENU_OPTIONS,
      selectedIndex: this.currentSelection,
      left: MENU_TEXT_LEFT,
      top: MENU_ITEM_TOP,
      lineGap: MENU_LINE_GAP,
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
        this.confirmSelection();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private moveSelection(step: number): void {
    this.currentSelection = moveSelectionWrap(this.currentSelection, step, IN_GAME_MENU_OPTIONS.length);
  }

  private confirmSelection(): void {
    const option = IN_GAME_MENU_OPTIONS[this.currentSelection];
    switch (option) {
      case '属性':
        this.screenStack.push(new ScreenMenuProperties(this.game));
        return;
      case '魔法':
        this.confirmMagicSelection();
        return;
      case '物品':
        this.screenStack.push(new ScreenMenuGoods(this.game));
        return;
      case '系统':
        this.screenStack.push(new ScreenMenuSystem(this.game));
        return;
    }
  }

  private confirmMagicSelection(): void {
    const players = getPartyPlayers(this.game);
    if (players.length > 1) {
      this.screenStack.push(new ScreenSelectActor(this.game));
      return;
    }
    console.log(`确认魔法角色:${players[0]?.name ?? '无角色'}`);
  }
}
