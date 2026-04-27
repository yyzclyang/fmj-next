import type { BaseGoods } from '@/goods';
import type { Game } from '@/game/game';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { wrapTextBlock } from '../ui-utils';

export const ScreenGoodsListMode = {
  Sale: 'sale',
  Buy: 'buy',
  Use: 'use',
} as const;

export type ScreenGoodsListMode = (typeof ScreenGoodsListMode)[keyof typeof ScreenGoodsListMode];

export interface ScreenGoodsListItem {
  readonly goods: BaseGoods;
  readonly count: number;
}

export interface ScreenGoodsListCallbacks {
  onConfirm(item: ScreenGoodsListItem, index: number): void;
}

const LEFT = 10;
const TOP = 10;
const WIDTH = 300;
const HEIGHT = 172;
const ITEM_NUMBER_PER_PAGE = 5;
const ITEM_TOP = 25;
const ITEM_LEFT = 40;
const ITEM_GAP = 30;
const CURSOR_LEFT = 20;
const INFO_LEFT = 85;
const DESC_LEFT = 85;
const DESC_TOP = 85;
const DESC_WIDTH = 210;
const DESC_LINES = 5;

// 物品列表沿用 Kotlin ScreenGoodsList 的 320x192 适配布局，选择结果交给上层处理。
export class ScreenGoodsList extends BaseScreen {
  private firstDisplayItemIndex = 0;
  private currentItemIndex = 0;
  private descriptionLine = 0;

  constructor(
    game: Game,
    private readonly goodsList: readonly ScreenGoodsListItem[],
    private readonly mode: ScreenGoodsListMode,
    private readonly callbacks: ScreenGoodsListCallbacks,
    initialCursorIndex = 0
  ) {
    super(game);
    this.currentItemIndex = initialCursorIndex;
  }

  override onEnter(): void {
    if (this.goodsList.length === 0) {
      this.currentItemIndex = 0;
      return;
    }
    if (this.currentItemIndex >= this.goodsList.length) {
      this.currentItemIndex = this.goodsList.length - 1;
    }
    if (this.currentItemIndex >= ITEM_NUMBER_PER_PAGE) {
      this.firstDisplayItemIndex = this.currentItemIndex - ITEM_NUMBER_PER_PAGE + 1;
    }
  }

  override update(delta: number): void {
    void delta;
    if (this.goodsList.length === 0) this.close();
  }

  override draw(surface: Surface): void {
    drawGoodsListFrame(surface);
    const item = this.goodsList[this.currentItemIndex];
    if (!item) return;
    this.drawInfo(surface, item);
    drawTriangleCursor(
      surface,
      CURSOR_LEFT,
      ITEM_TOP + ITEM_GAP * (this.currentItemIndex - this.firstDisplayItemIndex)
    );
    this.drawItems(surface);
    this.drawDescription(surface, item.goods);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.showPreviousItem();
        return;
      case KeyCode.Down:
        this.showNextItem();
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

  private drawInfo(surface: Surface, item: ScreenGoodsListItem): void {
    const goods = item.goods;
    const countText = this.mode === ScreenGoodsListMode.Buy ? `金钱:${this.game.state.money}` : `数量:${item.count}`;
    const price = this.mode === ScreenGoodsListMode.Buy ? goods.buyPrice : goods.sellPrice;
    TextRender.drawText(surface, countText, INFO_LEFT, 20);
    TextRender.drawText(surface, `名称:${goods.name}`, INFO_LEFT, 38);
    TextRender.drawText(surface, `价格:${price}`, INFO_LEFT, 55);
  }

  private drawItems(surface: Surface): void {
    const end = Math.min(this.firstDisplayItemIndex + ITEM_NUMBER_PER_PAGE, this.goodsList.length);
    for (let i = this.firstDisplayItemIndex; i < end; i += 1) {
      const item = this.goodsList[i];
      if (!item) continue;
      item.goods.image?.draw(surface, 1, ITEM_LEFT, ITEM_TOP + ITEM_GAP * (i - this.firstDisplayItemIndex));
    }
  }

  private drawDescription(surface: Surface, goods: BaseGoods): void {
    const lines = wrapTextBlock(`说明:${goods.description}`, DESC_WIDTH);
    const visible = lines.slice(this.descriptionLine, this.descriptionLine + DESC_LINES);
    for (let i = 0; i < visible.length; i += 1) {
      TextRender.drawText(surface, visible[i] ?? '', DESC_LEFT, DESC_TOP + i * 16);
    }
  }

  private showNextItem(): void {
    if (this.currentItemIndex + 1 >= this.goodsList.length) return;
    this.currentItemIndex += 1;
    if (this.currentItemIndex >= this.firstDisplayItemIndex + ITEM_NUMBER_PER_PAGE) {
      this.firstDisplayItemIndex += 1;
    }
    this.descriptionLine = 0;
  }

  private showPreviousItem(): void {
    if (this.currentItemIndex <= 0) return;
    this.currentItemIndex -= 1;
    if (this.currentItemIndex < this.firstDisplayItemIndex) {
      this.firstDisplayItemIndex -= 1;
    }
    this.descriptionLine = 0;
  }

  private pageDescription(step: number): void {
    const item = this.goodsList[this.currentItemIndex];
    if (!item) return;
    const lines = wrapTextBlock(`说明:${item.goods.description}`, DESC_WIDTH);
    const maxLine = Math.max(0, lines.length - DESC_LINES);
    this.descriptionLine = Math.max(0, Math.min(maxLine, this.descriptionLine + step * DESC_LINES));
  }

  private confirm(): void {
    const item = this.goodsList[this.currentItemIndex];
    if (!item) return;
    this.callbacks.onConfirm(item, this.currentItemIndex);
  }
}

function drawGoodsListFrame(surface: Surface): void {
  surface.fillRect(LEFT, TOP, WIDTH, HEIGHT, COLOR_WHITE);
  drawRect(surface, LEFT, TOP, WIDTH, HEIGHT);
  drawRect(surface, LEFT + 5, TOP + 5, 60, 160);
  drawRect(surface, LEFT + 70, TOP + 5, 224, 60);
  drawRect(surface, LEFT + 70, TOP + 70, 224, 95);
}

function drawRect(surface: Surface, left: number, top: number, width: number, height: number): void {
  surface.fillRect(left, top, width, 1, COLOR_BLACK);
  surface.fillRect(left, top + height - 1, width, 1, COLOR_BLACK);
  surface.fillRect(left, top, 1, height, COLOR_BLACK);
  surface.fillRect(left + width - 1, top, 1, height, COLOR_BLACK);
}

function drawTriangleCursor(surface: Surface, left: number, top: number): void {
  for (let i = 0; i < 7; i += 1) {
    surface.fillRect(left + i, top + i, 1, 13 - i * 2, COLOR_BLACK);
  }
}
