import type { BaseGoods } from '@/goods';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from '../menu/screen-goods-list';
import { drawTradeFrame, showTradeMessage, TRADE_TEXT_LEFT } from './ui-utils';

// BUY 指令先打开商品列表，数量确认页只在确认时提交背包和金钱变化。
export function createScriptBuyGoodsScreen(
  game: Game,
  items: readonly ScreenGoodsListItem[],
  onClose: () => void
): ScreenGoodsList {
  return new ScreenGoodsList(game, items, ScreenGoodsListMode.Buy, {
    onConfirm: (item, _index, screen) => {
      if (game.state.money < item.goods.buyPrice) {
        showTradeMessage(game, '金钱不足!');
        return;
      }
      screen.screenStack.push(new BuyGoodsCountScreen(game, item.goods));
    },
    onCancel: onClose,
  });
}

class BuyGoodsCountScreen extends BaseScreen {
  private buyCount = 0;
  private money: number;

  constructor(
    game: Game,
    private readonly goods: BaseGoods
  ) {
    super(game);
    this.money = game.state.money;
  }

  override draw(surface: Surface): void {
    drawTradeFrame(surface);
    TextRender.drawText(surface, `金钱：${this.money}`, TRADE_TEXT_LEFT, 24);
    TextRender.drawText(surface, this.goods.name, TRADE_TEXT_LEFT, 40);
    TextRender.drawText(surface, `: ${this.currentCount}`, 93, 40);
    TextRender.drawText(surface, `买入个数　：${this.buyCount}`, TRADE_TEXT_LEFT, 56);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.increase();
        return;
      case KeyCode.Down:
        this.decrease();
        return;
      case KeyCode.Enter:
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private get currentCount(): number {
    return this.game.getGoodsNum(this.goods.type, this.goods.index) + this.buyCount;
  }

  private increase(): void {
    if (this.currentCount >= 99) return;
    if (this.money < this.goods.buyPrice) {
      showTradeMessage(this.game, '金钱不足!');
      return;
    }
    this.buyCount += 1;
    this.money -= this.goods.buyPrice;
  }

  private decrease(): void {
    if (this.buyCount <= 0) return;
    this.buyCount -= 1;
    this.money += this.goods.buyPrice;
  }

  private confirm(): void {
    this.game.setMoney(this.money);
    if (this.buyCount > 0 && !this.game.bag.addGoods(this.goods.type, this.goods.index, this.buyCount)) {
      throw new Error('买入物品失败');
    }
    this.close();
  }
}
