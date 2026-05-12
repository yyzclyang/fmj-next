import type { GameGoodsState } from '@/game/game-state';
import type { DatLib } from '@/lib/dat-lib';
import { createLogger } from '@/utils/logger';
import { BaseGoods } from './base-goods';

const logger = createLogger('背包');

export interface GoodsBagItem {
  readonly goods: BaseGoods;
  readonly count: number;
}

export class GoodsBag {
  constructor(
    private readonly items: GameGoodsState[],
    private readonly datLib: DatLib
  ) {}

  get goodsList(): GoodsBagItem[] {
    return this.resolveList(item => item.type >= 8 && item.type <= 14);
  }

  get equipList(): GoodsBagItem[] {
    return this.resolveList(item => item.type >= 1 && item.type <= 7);
  }

  get allGoodsList(): GoodsBagItem[] {
    return [...this.equipList, ...this.goodsList];
  }

  getGoodsCount(type: number, index: number): number {
    return this.items.find(item => item.type === type && item.index === index)?.count ?? 0;
  }

  addGoods(type: number, index: number, count = 1): BaseGoods | null {
    if (!isKnownGoodsType(type) || count <= 0) {
      logger.warn('物品', `增加失败 GRS ${type}-${index} 数量=${count}`);
      return null;
    }
    const goods = this.resolveGoods(type, index);
    if (!goods) {
      logger.warn('物品', `增加失败，资源缺失 GRS ${type}-${index} 数量=${count}`);
      return null;
    }

    const item = this.items.find(i => i.type === type && i.index === index);
    if (item) {
      item.count += count;
    } else {
      this.items.push({ type, index, count });
    }
    return goods;
  }

  consumeGoods(type: number, index: number, count: number): boolean {
    if (!isKnownGoodsType(type) || count <= 0) {
      logger.warn('物品', `消耗失败 GRS ${type}-${index} 数量=${count}`);
      return false;
    }
    const itemIndex = this.items.findIndex(item => item.type === type && item.index === index);
    if (itemIndex < 0) {
      logger.warn('物品', `消耗失败，背包缺少 GRS ${type}-${index} 数量=${count}`);
      return false;
    }

    const item = this.items[itemIndex];
    if (!item || item.count < count) {
      logger.warn('物品', `消耗失败 GRS ${type}-${index} 数量=${item?.count ?? 0}<${count}`);
      return false;
    }
    item.count -= count;
    if (item.count <= 0) {
      this.items.splice(itemIndex, 1);
    }
    return true;
  }

  private resolveList(filter: (item: GameGoodsState) => boolean): GoodsBagItem[] {
    const res: GoodsBagItem[] = [];
    for (const item of this.items) {
      if (!filter(item) || item.count <= 0) continue;
      const goods = this.resolveGoods(item.type, item.index);
      if (goods) res.push({ goods, count: item.count });
    }
    return res;
  }

  private resolveGoods(type: number, index: number): BaseGoods | null {
    return this.datLib.getGoods(type, index);
  }
}

function isKnownGoodsType(type: number): boolean {
  return type >= 1 && type <= 14;
}
