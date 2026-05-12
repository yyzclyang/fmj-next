import {
  isCombatMedicineGoods,
  isCombatThrowableGoods,
  type CombatMedicineGoods,
  type CombatThrowableGoods,
} from '@/combat/combat-actions';
import type { Player } from '@/characters';
import type { Game } from '@/game/game';
import { GoodsEquipment, GoodsHiddenWeapon, GoodsWeapon } from '@/goods';
import type { ScreenStack } from '@/screens/screen-stack';
import { ScreenChangeEquipment } from '@/screens/main-game/menu/screen-change-equipment';
import {
  ScreenGoodsList,
  ScreenGoodsListMode,
  type ScreenGoodsListActions,
  type ScreenGoodsListItem,
} from '@/screens/main-game/menu/screen-goods-list';
import { ScreenSelectActor } from '@/screens/main-game/menu/screen-select-actor';

interface CombatGoodsMenuOptions {
  readonly game: Game;
  readonly screenStack: ScreenStack;
  readonly players: readonly Player[];
  readonly setMessage: (message: string) => void;
  readonly onCancel: () => void;
  readonly onConfirmThrowGoods: (goods: CombatThrowableGoods) => void;
  readonly onConfirmUseGoods: (goods: CombatMedicineGoods) => void;
}

// 战斗物品菜单只负责打开列表和装备子页面，确认后的战斗动作仍交回 ScreenCombat。
export class CombatGoodsMenu {
  constructor(private readonly options: CombatGoodsMenuOptions) {}

  openEquipmentList(): void {
    const list = this.getEquipmentList();
    if (list.length === 0) return;
    this.screenStack.push(
      new ScreenGoodsList(this.game, () => this.getEquipmentList(), ScreenGoodsListMode.Use, {
        onConfirm: item => this.confirmEquipment(item),
        onCancel: this.options.onCancel,
      })
    );
  }

  openGoodsList(kind: 'throw' | 'use'): void {
    const list = this.getCombatGoodsList(kind);
    if (list.length === 0) {
      console.log(`[战斗菜单] ${kind === 'throw' ? '没有可投掷道具' : '没有可用道具'}`);
      return;
    }
    this.screenStack.push(
      new ScreenGoodsList(this.game, () => this.getCombatGoodsList(kind), ScreenGoodsListMode.Use, {
        onConfirm: (item, actions) => this.confirmCombatGoods(kind, item, actions),
        onCancel: this.options.onCancel,
      })
    );
  }

  private confirmEquipment(item: ScreenGoodsListItem): void {
    if (!(item.goods instanceof GoodsEquipment)) throw new Error('战斗装备列表选择了非装备物品');
    const goods = item.goods;
    const players = this.options.players.filter(player => goods.canPlayerUse(player.index));
    if (players.length === 0) return;
    if (players.length === 1) {
      this.openChangeEquipment(players[0]!, goods);
      return;
    }
    this.screenStack.push(
      new ScreenSelectActor(this.game, players, {
        onConfirm: player => {
          const selectScreen = this.screenStack.current;
          if (selectScreen instanceof ScreenSelectActor) this.screenStack.pop();
          this.openChangeEquipment(player, goods);
        },
        onCancel: () => {
          const selectScreen = this.screenStack.current;
          if (selectScreen instanceof ScreenSelectActor) this.screenStack.pop();
        },
      })
    );
  }

  private openChangeEquipment(player: Player, goods: GoodsEquipment): void {
    if (player.hasEquipment(goods.type, goods.index)) {
      this.options.setMessage('已装备');
      return;
    }
    this.screenStack.push(new ScreenChangeEquipment(this.game, player, goods));
  }

  private getEquipmentList(): ScreenGoodsListItem[] {
    return this.game.bag.equipList.filter((item): item is ScreenGoodsListItem => item.goods instanceof GoodsEquipment);
  }

  private getCombatGoodsList(kind: 'throw' | 'use'): ScreenGoodsListItem[] {
    if (kind === 'throw') {
      const hiddenWeapons = this.game.bag.goodsList.filter(item => item.goods instanceof GoodsHiddenWeapon);
      const weapons = this.game.state.allowTossArm
        ? this.game.bag.equipList.filter(item => item.goods instanceof GoodsWeapon)
        : [];
      return [...hiddenWeapons, ...weapons];
    }
    return this.game.bag.goodsList.filter(item => isCombatMedicineGoods(item.goods));
  }

  private confirmCombatGoods(kind: 'throw' | 'use', item: ScreenGoodsListItem, actions: ScreenGoodsListActions): void {
    if (kind === 'throw') {
      if (!isCombatThrowableGoods(item.goods)) throw new Error('战斗投掷列表选择了不可投掷物品');
      actions.close();
      this.options.onConfirmThrowGoods(item.goods);
      return;
    }
    if (!isCombatMedicineGoods(item.goods)) throw new Error('战斗使用列表选择了不可使用物品');
    actions.close();
    this.options.onConfirmUseGoods(item.goods);
  }

  private get game(): Game {
    return this.options.game;
  }

  private get screenStack(): ScreenStack {
    return this.options.screenStack;
  }
}
