export { BaseGoods } from './base-goods';
export type { GoodsResourceProvider } from './base-goods';
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

import { BaseGoods, type GoodsResourceProvider } from './base-goods';
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

export function createGoods(type: number, resources: GoodsResourceProvider): BaseGoods | null {
  if (type >= 1 && type <= 5) return new GoodsEquipment(resources);
  switch (type) {
    case 6:
      return new GoodsDecorations(resources);
    case 7:
      return new GoodsWeapon(resources);
    case 8:
      return new GoodsHiddenWeapon(resources);
    case 9:
      return new GoodsMedicine(resources);
    case 10:
      return new GoodsMedicineLife(resources);
    case 11:
      return new GoodsMedicineChg4Ever(resources);
    case 12:
      return new GoodsStimulant(resources);
    case 13:
      return new GoodsTudun(resources);
    case 14:
      return new GoodsDrama(resources);
    default:
      return null;
  }
}
