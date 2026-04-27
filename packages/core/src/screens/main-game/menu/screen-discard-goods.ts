import type { BaseGoods } from '@/goods';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';

const FRAME_LEFT = 25;
const FRAME_TOP = 35;
const FRAME_WIDTH = 128;
const FRAME_HEIGHT = 64;
const TEXT_LEFT = 28;
const FIRST_OPTION_LEFT = 28;
const SECOND_OPTION_LEFT = 95;
const OPTION_TOP = 70;

// 丢弃确认框按 Kotlin 保留“全部丢弃 / 丢弃1个”两个动作。
export class ScreenDiscardGoods extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly goods: BaseGoods
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, FRAME_LEFT, FRAME_TOP, FRAME_WIDTH, FRAME_HEIGHT);
    TextRender.drawText(surface, '确认丢弃?', TEXT_LEFT, 38);
    TextRender.drawText(surface, `数量:${this.count}`, TEXT_LEFT, 54);
    const firstDraw = this.selectedIndex === 0 ? TextRender.drawSelText : TextRender.drawText;
    const secondDraw = this.selectedIndex === 1 ? TextRender.drawSelText : TextRender.drawText;
    firstDraw(surface, '全部丢弃', FIRST_OPTION_LEFT, OPTION_TOP);
    secondDraw(surface, '丢弃1个', SECOND_OPTION_LEFT, OPTION_TOP);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Left:
      case KeyCode.Right:
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

  private get count(): number {
    return this.game.getGoodsNum(this.goods.type, this.goods.index);
  }

  private confirm(): void {
    const count = this.count;
    if (count <= 0) {
      this.close();
      return;
    }
    if (this.selectedIndex === 0) {
      if (!this.game.bag.useGoodsNum(this.goods.type, this.goods.index, count)) {
        throw new Error('全部丢弃时背包数量不足');
      }
      this.close();
      return;
    }
    if (!this.game.bag.deleteGoods(this.goods.type, this.goods.index)) {
      throw new Error('丢弃单个物品时背包数量不足');
    }
    if (count <= 1) this.close();
  }
}
