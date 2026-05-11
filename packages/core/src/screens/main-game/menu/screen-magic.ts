import { type BaseMagic } from '@/magic';
import type { Game } from '@/game/game';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { drawText, wrapTextBlock } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { moveSelectionClamp } from './menu-select';

export interface ScreenMagicCallbacks {
  onConfirm(magic: BaseMagic): void;
}

const ITEM_NUM = 5;
const LIST_LEFT = 10;
const LIST_TOP = 10;
const LIST_WIDTH = 290;
const LIST_HEIGHT = 20 * ITEM_NUM;
const ITEM_TEXT_LEFT = LIST_LEFT + 20;
const ITEM_TOP = LIST_TOP + 4;
const ITEM_GAP = 20;
const DESCRIPTION_LEFT = 12;
const DESCRIPTION_TOP = 124;
const DESCRIPTION_WIDTH = 286;
const DESCRIPTION_HEIGHT = 36;
const DESCRIPTION_LINES = 2;
const COST_LEFT = 10;
const COST_TOP = 165;

// 魔法列表按 Kotlin ScreenMagic：上方五行列表，下方说明，底部显示真气消耗。
export class ScreenMagic extends BaseScreen {
  private firstItemIndex = 0;
  private currentItemIndex = 0;
  private descriptionLine = 0;

  constructor(
    game: Game,
    private readonly magics: readonly BaseMagic[],
    private readonly mp: number,
    private readonly callbacks: ScreenMagicCallbacks
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.drawMagicItems(surface);
    this.drawDescription(surface);
    const magic = this.currentMagic;
    if (magic) drawText(surface, `耗真气:${magic.costMp}`, COST_LEFT, COST_TOP);
    drawRect(surface, LIST_LEFT, LIST_TOP, LIST_WIDTH, LIST_HEIGHT);
    drawRect(surface, DESCRIPTION_LEFT, DESCRIPTION_TOP, DESCRIPTION_WIDTH, DESCRIPTION_HEIGHT);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.moveItem(-1);
        return;
      case KeyCode.Down:
        this.moveItem(1);
        return;
      case KeyCode.PageUp:
        this.pageDescription(-1);
        return;
      case KeyCode.PageDown:
        this.pageDescription(1);
        return;
      case KeyCode.Enter:
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private get currentMagic(): BaseMagic | undefined {
    return this.magics[this.currentItemIndex];
  }

  private drawMagicItems(surface: Surface): void {
    const showCount = Math.min(ITEM_NUM, this.magics.length - this.firstItemIndex);
    for (let i = 0; i < showCount; i += 1) {
      const index = this.firstItemIndex + i;
      const y = ITEM_TOP + i * ITEM_GAP;
      drawText(surface, this.magics[index]?.name ?? '', ITEM_TEXT_LEFT, y);
      if (index === this.currentItemIndex) drawMagicCursor(surface, LIST_LEFT + 4, y + 2);
    }
  }

  private drawDescription(surface: Surface): void {
    const magic = this.currentMagic;
    if (!magic) return;
    const lines = wrapTextBlock(magic.description, DESCRIPTION_WIDTH);
    const visible = lines.slice(this.descriptionLine, this.descriptionLine + DESCRIPTION_LINES);
    for (let i = 0; i < visible.length; i += 1) {
      drawText(surface, visible[i] ?? '', DESCRIPTION_LEFT, DESCRIPTION_TOP + i * 16);
    }
  }

  private moveItem(step: number): void {
    const next = moveSelectionClamp(this.currentItemIndex, step, this.magics.length);
    if (next === this.currentItemIndex) return;
    this.currentItemIndex = next;
    if (this.currentItemIndex < this.firstItemIndex) this.firstItemIndex = this.currentItemIndex;
    if (this.currentItemIndex >= this.firstItemIndex + ITEM_NUM) {
      this.firstItemIndex = this.currentItemIndex - ITEM_NUM + 1;
    }
    this.descriptionLine = 0;
  }

  private pageDescription(step: number): void {
    const magic = this.currentMagic;
    if (!magic) return;
    const lines = wrapTextBlock(magic.description, DESCRIPTION_WIDTH);
    const maxLine = Math.max(0, lines.length - DESCRIPTION_LINES);
    this.descriptionLine = Math.max(0, Math.min(maxLine, this.descriptionLine + step * DESCRIPTION_LINES));
  }

  private confirm(): void {
    const magic = this.currentMagic;
    if (!magic) return;
    if (this.mp < magic.costMp) {
      this.showMessage('真气不足');
      return;
    }
    this.callbacks.onConfirm(magic);
  }

  private showMessage(text: string): void {
    const mainScene = this.game.mainScene;
    if (!mainScene) throw new Error('主场景不存在，无法显示魔法消息');
    mainScene.showMessage(text, 1000);
  }
}

function drawRect(surface: Surface, left: number, top: number, width: number, height: number): void {
  surface.strokeRect(left, top, width, height, COLOR_BLACK);
}

function drawMagicCursor(surface: Surface, left: number, top: number): void {
  surface.fillRect(left + 8, top, 4, 1, COLOR_BLACK);
  surface.fillRect(left + 11, top + 1, 1, 4, COLOR_BLACK);
  surface.fillRect(left + 6, top + 1, 2, 4, COLOR_BLACK);
  surface.fillRect(left + 7, top + 4, 4, 2, COLOR_BLACK);
  for (let i = 0; i < 7; i += 1) {
    surface.fillRect(left + i, top + 11 - i, 1, 1, COLOR_BLACK);
    surface.fillRect(left + i + 2, top + 11 - i, 1, 1, COLOR_BLACK);
  }
}
