import { PLAYER_EQUIPMENT_SLOT_GOODS_TYPES, PlayerEquipmentSlot, type Player } from '@/characters';
import { GoodsEquipment } from '@/goods';
import type { Game } from '@/game/game';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { drawText, wrapTextBlock } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { getPartyPlayers } from './party-utils';
import { ScreenChangeEquipment } from './screen-change-equipment';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from './screen-goods-list';

const WEARING_SLOTS = [
  {
    slot: PlayerEquipmentSlot.Decoration1,
    name: '装饰',
    x: 80,
    y: 20,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Decoration1],
  },
  {
    slot: PlayerEquipmentSlot.Decoration2,
    name: '装饰',
    x: 60,
    y: 60,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Decoration2],
  },
  {
    slot: PlayerEquipmentSlot.Wrist,
    name: '护腕',
    x: 110,
    y: 100,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Wrist],
  },
  {
    slot: PlayerEquipmentSlot.Foot,
    name: '脚蹬',
    x: 150,
    y: 120,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Foot],
  },
  {
    slot: PlayerEquipmentSlot.Hand,
    name: '手持',
    x: 200,
    y: 100,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Hand],
  },
  {
    slot: PlayerEquipmentSlot.Body,
    name: '身穿',
    x: 240,
    y: 60,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Body],
  },
  {
    slot: PlayerEquipmentSlot.Shoulder,
    name: '肩披',
    x: 220,
    y: 25,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Shoulder],
  },
  {
    slot: PlayerEquipmentSlot.Head,
    name: '头戴',
    x: 140,
    y: 10,
    goodsType: PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[PlayerEquipmentSlot.Head],
  },
] as const;
const SLOT_SIZE = 32;
const INFO_LEFT = 20;
const INFO_WIDTH = SCREEN_WIDTH - 40;
const INFO_HEIGHT = 80;
const INFO_TOP = SCREEN_HEIGHT - INFO_HEIGHT - 10;
const WEARING_LABEL_WIDTH = 22;
const WEARING_LABEL_HEIGHT = 39;
const WEARING_LABEL_LEFT = SCREEN_WIDTH - WEARING_LABEL_WIDTH - 10;
const WEARING_LABEL_TOP = SCREEN_HEIGHT - WEARING_LABEL_HEIGHT - 10;
const WEARING_LABEL_BITMAP = [
  '.........###..........',
  '...##..#############..',
  '..#####........#####..',
  '..##...###..###...##..',
  '...#..#...........##..',
  '...#..###########.....',
  '.......#....##........',
  '......################',
  '......##...####.######',
  '.........######...###.',
  '......####..###.......',
  '########....###.......',
  '.####.......##........',
  '........######........',
  '.........####.........',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......#....##...#.....',
  '...#######.##..##.....',
  '..##..#....##.#.......',
  '..################....',
  '#################.....',
  '...#######.##.##......',
  '...##.####.##.##......',
  '...#.##..#..#.##......',
  '...#######..####......',
  '...#######..###.......',
  '....#####....###......',
  '#####....##########...',
  '...###..##.##..#######',
  '..##......#.....#####.',
  '..................##..',
] as const;

// 穿戴页展示装备槽位，确认后从同类型物品列表进入换装页。
export class ScreenActorEquipment extends BaseScreen {
  private readonly players: Player[];
  private selectedPlayerIndex = 0;
  private selectedSlotIndex = 0;
  private showingDescription = false;

  constructor(game: Game) {
    super(game);
    this.players = getPartyPlayers(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const player = this.players[this.selectedPlayerIndex];
    if (!player) return;
    drawWearingLabel(surface);
    this.drawSlots(surface, player);
    this.drawActor(surface, player);
    if (this.showingDescription) {
      const slot = WEARING_SLOTS[this.selectedSlotIndex];
      this.drawDescription(surface, slot ? (player.equipment[slot.slot] ?? null) : null);
    }
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.moveItem(-1);
        return;
      case KeyCode.Down:
        this.moveItem(1);
        return;
      case KeyCode.Left:
        this.moveActor(-1);
        return;
      case KeyCode.Right:
        this.moveActor(1);
        return;
      case KeyCode.Enter:
        this.handleEnter();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private moveItem(step: number): void {
    const next = this.selectedSlotIndex + step;
    if (next < 0 || next >= WEARING_SLOTS.length) return;
    this.selectedSlotIndex = next;
    this.showingDescription = false;
  }

  private moveActor(step: number): void {
    const next = this.selectedPlayerIndex + step;
    if (next < 0 || next >= this.players.length) return;
    this.selectedPlayerIndex = next;
    this.showingDescription = false;
  }

  private handleEnter(): void {
    const slot = WEARING_SLOTS[this.selectedSlotIndex];
    const equipment = slot ? (this.players[this.selectedPlayerIndex]?.equipment[slot.slot] ?? null) : null;
    if (!this.showingDescription && equipment) {
      this.showingDescription = true;
      return;
    }
    this.showingDescription = false;
    this.openEquipmentList();
  }

  private drawSlots(surface: Surface, player: Player): void {
    for (const slot of WEARING_SLOTS) {
      const equipment = player.equipment[slot.slot] ?? null;
      equipment?.image?.draw(surface, 1, slot.x + 1, slot.y + 1);
    }
    const slot = WEARING_SLOTS[this.selectedSlotIndex];
    if (slot) drawSelectedSlot(surface, slot.x, slot.y);
  }

  private drawActor(surface: Surface, player: Player): void {
    if (player.headImage) {
      player.headImage.draw(surface, 1, 140, 40);
    } else {
      drawInsetPanel(surface, 140, 40, 24, 24);
    }
    drawText(surface, player.name, 140, 80);
    drawText(surface, WEARING_SLOTS[this.selectedSlotIndex]?.name ?? '', 200, 60);
  }

  private drawDescription(surface: Surface, equipment: GoodsEquipment | null): void {
    drawInsetPanel(surface, INFO_LEFT, INFO_TOP, INFO_WIDTH, INFO_HEIGHT);
    if (!equipment) {
      drawText(surface, '未装备', INFO_LEFT + 5, INFO_TOP + 5);
      return;
    }

    drawText(surface, `装备:${equipment.name}`, INFO_LEFT + 5, INFO_TOP + 5);
    const lines = wrapTextBlock(equipment.description, INFO_WIDTH - 10).slice(0, 3);
    for (let i = 0; i < lines.length; i += 1) {
      drawText(surface, lines[i] ?? '', INFO_LEFT + 5, INFO_TOP + 22 + i * 16);
    }
  }

  private openEquipmentList(): void {
    const player = this.players[this.selectedPlayerIndex];
    if (!player) return;
    const items = this.getEquipmentList(player);
    if (items.length === 0) return;
    this.screenStack.push(
      new ScreenGoodsList(this.game, () => this.getEquipmentList(player), ScreenGoodsListMode.Use, {
        onConfirm: item => this.openChangeEquipmentScreen(player, item.goods),
      })
    );
  }

  private getEquipmentList(player: Player): ScreenGoodsListItem[] {
    const slot = WEARING_SLOTS[this.selectedSlotIndex];
    if (!slot) return [];
    return this.game.bag.equipList.filter(
      (item): item is ScreenGoodsListItem =>
        item.goods instanceof GoodsEquipment &&
        item.goods.type === slot.goodsType &&
        item.goods.canPlayerUse(player.index)
    );
  }

  private openChangeEquipmentScreen(player: Player, goods: ScreenGoodsListItem['goods']): void {
    if (!(goods instanceof GoodsEquipment)) throw new Error('穿戴页选择了非装备物品');
    const slot = WEARING_SLOTS[this.selectedSlotIndex];
    if (!slot) throw new Error('穿戴页当前槽位不存在');
    this.screenStack.clear();
    this.screenStack.push(new ScreenChangeEquipment(this.game, player, goods, slot.slot));
  }
}

function drawSelectedSlot(surface: Surface, left: number, top: number): void {
  surface.fillRect(left, top, SLOT_SIZE, 1, COLOR_BLACK);
  surface.fillRect(left, top + SLOT_SIZE, SLOT_SIZE + 1, 1, COLOR_BLACK);
  surface.fillRect(left, top, 1, SLOT_SIZE + 1, COLOR_BLACK);
  surface.fillRect(left + SLOT_SIZE, top, 1, SLOT_SIZE + 1, COLOR_BLACK);
}

function drawWearingLabel(surface: Surface): void {
  for (let y = 0; y < WEARING_LABEL_BITMAP.length; y += 1) {
    const row = WEARING_LABEL_BITMAP[y] ?? '';
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') {
        surface.fillRect(WEARING_LABEL_LEFT + x, WEARING_LABEL_TOP + y, 1, 1, COLOR_BLACK);
      }
    }
  }
}
