export { BaseGoods } from './base-goods';
export type { ResourceRef } from './base-goods';
export { GoodsDecorations } from './goods-decorations';
export { GoodsDrama } from './goods-drama';
export { GoodsEquipment } from './goods-equipment';
export { GoodsHiddenWeapon } from './goods-hidden-weapon';
export { GoodsMedicine } from './goods-medicine';
export { GoodsMedicineChg4Ever } from './goods-medicine-chg4ever';
export { GoodsMedicineLife } from './goods-medicine-life';
export { GoodsStimulant } from './goods-stimulant';
export { GoodsTudun } from './goods-tudun';
export { GoodsWeapon } from './goods-weapon';

import { BaseGoods } from './base-goods';
import { GoodsDecorations } from './goods-decorations';
import { GoodsDrama } from './goods-drama';
import { GoodsEquipment } from './goods-equipment';
import { GoodsHiddenWeapon } from './goods-hidden-weapon';
import { GoodsMedicine } from './goods-medicine';
import { GoodsMedicineChg4Ever } from './goods-medicine-chg4ever';
import { GoodsMedicineLife } from './goods-medicine-life';
import { GoodsStimulant } from './goods-stimulant';
import { GoodsTudun } from './goods-tudun';
import { GoodsWeapon } from './goods-weapon';

export function createGoods(type: number): BaseGoods | null {
  if (type >= 1 && type <= 5) return new GoodsEquipment();
  switch (type) {
    case 6:
      return new GoodsDecorations();
    case 7:
      return new GoodsWeapon();
    case 8:
      return new GoodsHiddenWeapon();
    case 9:
      return new GoodsMedicine();
    case 10:
      return new GoodsMedicineLife();
    case 11:
      return new GoodsMedicineChg4Ever();
    case 12:
      return new GoodsStimulant();
    case 13:
      return new GoodsTudun();
    case 14:
      return new GoodsDrama();
    default:
      return null;
  }
}
