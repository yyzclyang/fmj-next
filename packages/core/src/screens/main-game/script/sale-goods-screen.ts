import { GoodsDrama, type BaseGoods } from '@/goods';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { drawText } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/utils/key-code';
import { createLogger } from '@/utils/logger';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from '../menu/screen-goods-list';
import { drawTradePanel, showTradeMessage, TRADE_PANEL_TEXT_LEFT } from './ui-utils';

const logger = createLogger('交易');

// SALE 指令使用动态背包列表，卖出后列表会自动反映数量变化。
export function createScriptSaleGoodsScreen(game: Game, onClose: () => void): ScreenGoodsList {
  return new ScreenGoodsList(game, () => getSaleGoodsList(game), ScreenGoodsListMode.Sale, {
    onConfirm: (item, actions) => {
      if (item.goods instanceof GoodsDrama) {
        logger.log('卖出', `任务物品禁止出售 ${item.goods.name}`);
        showTradeMessage(game, '任务物品!');
        return;
      }
      actions.openChildScreen(new SaleGoodsCountScreen(game, item.goods));
    },
    onCancel: onClose,
  });
}

class SaleGoodsCountScreen extends BaseScreen {
  private saleCount = 0;
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
    drawText(surface, `: ${this.remainingCount}`, 93, 40);
    drawText(surface, `卖出个数　：${this.saleCount}`, TRADE_PANEL_TEXT_LEFT, 56);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.decrease();
        return;
      case KeyCode.Down:
        this.increase();
        return;
      case KeyCode.Enter:
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private get totalCount(): number {
    return this.game.getGoodsCount(this.goods.type, this.goods.index);
  }

  private get remainingCount(): number {
    return this.totalCount - this.saleCount;
  }

  private increase(): void {
    if (this.saleCount >= this.totalCount) return;
    this.saleCount += 1;
    this.money += this.goods.sellPrice;
  }

  private decrease(): void {
    if (this.saleCount <= 0) return;
    this.saleCount -= 1;
    this.money -= this.goods.sellPrice;
  }

  private confirm(): void {
    const beforeMoney = this.game.state.money;
    this.game.setMoney(this.money);
    if (this.saleCount > 0 && !this.game.bag.consumeGoods(this.goods.type, this.goods.index, this.saleCount)) {
      throw new Error('卖出物品时背包数量不足');
    }
    if (this.saleCount > 0) {
      logger.log('卖出', `${this.goods.name} x${this.saleCount} 金钱=${beforeMoney}->${this.money}`);
    }
    this.close();
  }
}

function getSaleGoodsList(game: Game): ScreenGoodsListItem[] {
  return [...game.bag.goodsList, ...game.bag.equipList];
}
