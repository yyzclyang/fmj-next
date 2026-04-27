import { GoodsDrama, type BaseGoods } from '@/goods';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from '../menu/screen-goods-list';
import { drawTradeFrame, showTradeMessage, TRADE_TEXT_LEFT } from './ui-utils';

// SALE 指令使用动态背包列表，卖出后列表会自动反映数量变化。
export function createScriptSaleGoodsScreen(game: Game, onClose: () => void): ScreenGoodsList {
  return new ScreenGoodsList(game, () => getSaleGoodsList(game), ScreenGoodsListMode.Sale, {
    onConfirm: (item, _index, screen) => {
      if (item.goods instanceof GoodsDrama) {
        showTradeMessage(game, '任务物品!');
        return;
      }
      screen.screenStack.push(new SaleGoodsCountScreen(game, item.goods));
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
    drawTradeFrame(surface);
    TextRender.drawText(surface, `金钱：${this.money}`, TRADE_TEXT_LEFT, 24);
    TextRender.drawText(surface, this.goods.name, TRADE_TEXT_LEFT, 40);
    TextRender.drawText(surface, `: ${this.remainingCount}`, 93, 40);
    TextRender.drawText(surface, `卖出个数　：${this.saleCount}`, TRADE_TEXT_LEFT, 56);
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
    return this.game.getGoodsNum(this.goods.type, this.goods.index);
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
    this.game.setMoney(this.money);
    if (this.saleCount > 0 && !this.game.bag.useGoodsNum(this.goods.type, this.goods.index, this.saleCount)) {
      throw new Error('卖出物品时背包数量不足');
    }
    this.close();
  }
}

function getSaleGoodsList(game: Game): ScreenGoodsListItem[] {
  return [...game.bag.goodsList, ...game.bag.equipList];
}
