export const MISC_MENU_ITEMS = [
  { label: '围攻', selection: 'autoAttack' },
  { label: '道具', selection: 'goodsMenu' },
  { label: '防御', selection: 'defend' },
  { label: '逃跑', selection: 'flee' },
  { label: '状态', selection: 'statusMenu' },
] as const;

export const COMBAT_GOODS_MENU_ITEMS = [
  { label: '装备', selection: 'equipment' },
  { label: '投掷', selection: 'throw' },
  { label: '使用', selection: 'use' },
] as const;

export type MiscMenuSelection = typeof MISC_MENU_ITEMS[number]['selection'] | 'none';
export type CombatGoodsMenuSelection = typeof COMBAT_GOODS_MENU_ITEMS[number]['selection'] | 'none';

export const MISC_ITEMS = MISC_MENU_ITEMS.map(item => item.label);
export const COMBAT_GOODS_ITEMS = COMBAT_GOODS_MENU_ITEMS.map(item => item.label);
