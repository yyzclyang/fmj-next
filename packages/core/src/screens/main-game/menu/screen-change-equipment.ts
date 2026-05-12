import type { Player } from '@/characters';
import type { GoodsEquipment } from '@/goods';
import type { Game } from '@/game/game';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/utils/key-code';
import { drawTriangleCursor } from './menu-select';
import { drawPlayerState } from './screen-actor-state';

const GOODS_LEFT = 8;
const GOODS_TOP = 2;
const GOODS_GAP = 32;
const CURSOR_LEFT = 1;
const CURSOR_TOP = 10;
const HEAD_LEFT = 5;
const HEAD_TOP = 60;

// 换装页临时切换新旧装备，让属性面板实时反映确认前的选择。
export class ScreenChangeEquipment extends BaseScreen {
  private readonly goodsList: readonly GoodsEquipment[];
  private selectedIndex = 0;
  private equippedSlotIndex: number | null = null;
  private finished = false;

  constructor(
    game: Game,
    private readonly player: Player,
    goods: GoodsEquipment,
    private readonly itemIndex?: number
  ) {
    super(game);
    const current = itemIndex == null ? player.getCurrentEquipment(goods.type) : player.getEquipmentByIndex(itemIndex);
    if (!current || (itemIndex == null && player.hasEquipmentSpace(goods.type))) {
      this.goodsList = [goods];
    } else {
      this.goodsList = [current, goods];
      this.selectedIndex = 1;
      this.takeOffEquipment(goods.type, itemIndex);
    }
    this.putOnCurrentEquipment();
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    drawPlayerState(surface, this.player, this.game.datLib.getImage(ResourceType.PIC, 2, 5));
    this.player.headImage?.draw(surface, 1, HEAD_LEFT, HEAD_TOP);
    for (let i = 0; i < this.goodsList.length; i += 1) {
      this.goodsList[i]?.image?.draw(surface, 1, GOODS_LEFT, GOODS_TOP + GOODS_GAP * i);
    }
    drawTriangleCursor(surface, CURSOR_LEFT, CURSOR_TOP + GOODS_GAP * this.selectedIndex);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.previewEquipment(-1);
        return;
      case KeyCode.Down:
        this.previewEquipment(1);
        return;
      case KeyCode.Enter:
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.cancel();
        return;
    }
  }

  override onExit(): void {
    if (!this.finished) this.restoreOriginalEquipment();
  }

  private previewEquipment(step: number): void {
    const next = this.selectedIndex + step;
    if (next < 0 || next >= this.goodsList.length) return;
    this.takeOffCurrentEquipment();
    this.selectedIndex = next;
    this.putOnCurrentEquipment();
  }

  private confirm(): void {
    if (this.selectedIndex === this.goodsList.length - 1) {
      const goods = this.goodsList[this.goodsList.length - 1];
      if (!goods || !this.game.bag.consumeGoods(goods.type, goods.index, 1)) {
        throw new Error('确认换装时背包中缺少新装备');
      }
      const old = this.goodsList[0];
      if (this.goodsList.length > 1 && old && !this.game.bag.addGoods(old.type, old.index)) {
        throw new Error('确认换装时旧装备无法放回背包');
      }
    }
    this.finished = true;
    this.close();
  }

  private cancel(): void {
    this.restoreOriginalEquipment();
    this.finished = true;
    this.close();
  }

  private restoreOriginalEquipment(): void {
    this.takeOffCurrentEquipment();
    if (this.goodsList.length > 1) {
      this.selectedIndex = 0;
      this.putOnCurrentEquipment();
    }
  }

  private putOnCurrentEquipment(): void {
    const goods = this.goodsList[this.selectedIndex];
    if (!goods) throw new Error('换装页当前装备不存在');
    const slotIndex = this.player.putOnEquipment(goods, this.itemIndex);
    if (slotIndex == null) throw new Error('换装页无法穿上当前装备');
    this.equippedSlotIndex = slotIndex;
    this.setEquipmentEvent(goods, true);
  }

  private takeOffCurrentEquipment(): GoodsEquipment {
    if (this.equippedSlotIndex == null) throw new Error('换装页没有可脱下的当前装备');
    const goods = this.takeOffEquipment(this.goodsList[this.selectedIndex]?.type ?? 0, this.equippedSlotIndex);
    this.equippedSlotIndex = null;
    return goods;
  }

  private takeOffEquipment(type: number, index?: number): GoodsEquipment {
    const goods = this.player.takeOffEquipment(type, index);
    if (!goods) throw new Error('换装页无法脱下装备');
    this.setEquipmentEvent(goods, false);
    return goods;
  }

  private setEquipmentEvent(goods: GoodsEquipment, enabled: boolean): void {
    if (goods.eventId === 0) return;
    if (enabled) this.game.setEvent(goods.eventId);
    else this.game.clearEvent(goods.eventId);
  }
}
