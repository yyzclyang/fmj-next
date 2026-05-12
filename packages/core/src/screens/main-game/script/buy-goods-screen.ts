import type { BaseGoods } from '@/goods';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { drawText } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/utils/key-code';
import { createLogger } from '@/utils/logger';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from '../menu/screen-goods-list';
import { drawTradePanel, showTradeMessage, TRADE_PANEL_TEXT_LEFT } from './ui-utils';

const logger = createLogger('交易');

// BUY 指令先打开商品列表，数量确认页只在确认时提交背包和金钱变化。
export function createScriptBuyGoodsScreen(
  game: Game,
  items: readonly ScreenGoodsListItem[],
  onClose: () => void
): ScreenGoodsList {
  return new ScreenGoodsList(game, items, ScreenGoodsListMode.Buy, {
    onConfirm: (item, actions) => {
      if (game.state.money < item.goods.buyPrice) {
        logger.log('买入', `金钱不足 ${item.goods.name} 价格=${item.goods.buyPrice} 金钱=${game.state.money}`);
        showTradeMessage(game, '金钱不足!');
        return;
      }
      actions.openChildScreen(new BuyGoodsCountScreen(game, item.goods));
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
    drawTradePanel(surface);
    drawText(surface, `金钱：${this.money}`, TRADE_PANEL_TEXT_LEFT, 24);
    drawText(surface, this.goods.name, TRADE_PANEL_TEXT_LEFT, 40);
    drawText(surface, `: ${this.currentCount}`, 93, 40);
    drawText(surface, `买入个数　：${this.buyCount}`, TRADE_PANEL_TEXT_LEFT, 56);
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
    return this.game.getGoodsCount(this.goods.type, this.goods.index) + this.buyCount;
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
    const beforeMoney = this.game.state.money;
    this.game.setMoney(this.money);
    if (this.buyCount > 0 && !this.game.bag.addGoods(this.goods.type, this.goods.index, this.buyCount)) {
      throw new Error('买入物品失败');
    }
    if (this.buyCount > 0) {
      logger.log('买入', `${this.goods.name} x${this.buyCount} 金钱=${beforeMoney}->${this.money}`);
    }
    this.close();
  }
}
