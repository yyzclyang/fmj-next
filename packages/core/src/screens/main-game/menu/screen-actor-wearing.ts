import { PLAYER_EQUIPMENT_TYPES, type Player } from '@/characters';
import { GoodsEquipment } from '@/goods';
import type { Game } from '@/game/game';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame, wrapTextBlock } from '../ui-utils';
import { ScreenChangeEquipment } from './screen-change-equipment';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from './screen-goods-list';
import { getPartyPlayers } from './screen-select-actor';

const SLOT_NAMES = ['装饰', '装饰', '护腕', '脚蹬', '手持', '身穿', '肩披', '头戴'] as const;
const SLOT_POSITIONS = [
  { x: 80, y: 20 },
  { x: 60, y: 60 },
  { x: 110, y: 100 },
  { x: 150, y: 120 },
  { x: 200, y: 100 },
  { x: 240, y: 60 },
  { x: 220, y: 25 },
  { x: 140, y: 10 },
] as const;
const SLOT_SIZE = 32;
const INFO_LEFT = 20;
const INFO_WIDTH = SCREEN_WIDTH - 40;
const INFO_HEIGHT = 80;
const INFO_TOP = SCREEN_HEIGHT - INFO_HEIGHT - 10;
const CHUANDAI_WIDTH = 22;
const CHUANDAI_HEIGHT = 39;
const CHUANDAI_LEFT = SCREEN_WIDTH - CHUANDAI_WIDTH - 10;
const CHUANDAI_TOP = SCREEN_HEIGHT - CHUANDAI_HEIGHT - 10;
const CHUANDAI_BITMAP = [
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
export class ScreenActorWearing extends BaseScreen {
  private readonly players: Player[];
  private actorIndex = 0;
  private currentItem = 0;
  private showingDescription = false;

  constructor(game: Game) {
    super(game);
    this.players = getPartyPlayers(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const player = this.players[this.actorIndex];
    if (!player) return;
    drawChuandai(surface);
    this.drawSlots(surface, player);
    this.drawActor(surface, player);
    if (this.showingDescription) {
      this.drawDescription(surface, player.equipment[this.currentItem] ?? null);
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
    const next = this.currentItem + step;
    if (next < 0 || next >= SLOT_NAMES.length) return;
    this.currentItem = next;
    this.showingDescription = false;
  }

  private moveActor(step: number): void {
    const next = this.actorIndex + step;
    if (next < 0 || next >= this.players.length) return;
    this.actorIndex = next;
    this.showingDescription = false;
  }

  private handleEnter(): void {
    const equipment = this.players[this.actorIndex]?.equipment[this.currentItem] ?? null;
    if (!this.showingDescription && equipment) {
      this.showingDescription = true;
      return;
    }
    this.showingDescription = false;
    this.openEquipmentList();
  }

  private drawSlots(surface: Surface, player: Player): void {
    for (let i = 0; i < SLOT_POSITIONS.length; i += 1) {
      const pos = SLOT_POSITIONS[i];
      const equipment = player.equipment[i] ?? null;
      equipment?.image?.draw(surface, 1, pos.x + 1, pos.y + 1);
    }
    const pos = SLOT_POSITIONS[this.currentItem];
    if (pos) drawSelectedSlot(surface, pos.x, pos.y);
  }

  private drawActor(surface: Surface, player: Player): void {
    if (player.headImage) {
      player.headImage.draw(surface, 1, 140, 40);
    } else {
      drawMenuFrame(surface, 140, 40, 24, 24);
    }
    TextRender.drawText(surface, player.name, 140, 80);
    TextRender.drawText(surface, SLOT_NAMES[this.currentItem] ?? '', 200, 60);
  }

  private drawDescription(surface: Surface, equipment: GoodsEquipment | null): void {
    drawMenuFrame(surface, INFO_LEFT, INFO_TOP, INFO_WIDTH, INFO_HEIGHT);
    if (!equipment) {
      TextRender.drawText(surface, '未装备', INFO_LEFT + 5, INFO_TOP + 5);
      return;
    }

    TextRender.drawText(surface, `装备:${equipment.name}`, INFO_LEFT + 5, INFO_TOP + 5);
    const lines = wrapTextBlock(equipment.description, INFO_WIDTH - 10).slice(0, 3);
    for (let i = 0; i < lines.length; i += 1) {
      TextRender.drawText(surface, lines[i] ?? '', INFO_LEFT + 5, INFO_TOP + 22 + i * 16);
    }
  }

  private openEquipmentList(): void {
    const player = this.players[this.actorIndex];
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
    const goodsType = PLAYER_EQUIPMENT_TYPES[this.currentItem];
    return this.game.bag.equipList.filter(
      (item): item is ScreenGoodsListItem =>
        item.goods instanceof GoodsEquipment && item.goods.type === goodsType && item.goods.canPlayerUse(player.index)
    );
  }

  private openChangeEquipmentScreen(player: Player, goods: ScreenGoodsListItem['goods']): void {
    if (!(goods instanceof GoodsEquipment)) throw new Error('穿戴页选择了非装备物品');
    this.screenStack.clear();
    this.screenStack.push(new ScreenChangeEquipment(this.game, player, goods, this.currentItem));
  }
}

function drawSelectedSlot(surface: Surface, left: number, top: number): void {
  surface.fillRect(left, top, SLOT_SIZE, 1, COLOR_BLACK);
  surface.fillRect(left, top + SLOT_SIZE, SLOT_SIZE + 1, 1, COLOR_BLACK);
  surface.fillRect(left, top, 1, SLOT_SIZE + 1, COLOR_BLACK);
  surface.fillRect(left + SLOT_SIZE, top, 1, SLOT_SIZE + 1, COLOR_BLACK);
}

function drawChuandai(surface: Surface): void {
  for (let y = 0; y < CHUANDAI_BITMAP.length; y += 1) {
    const row = CHUANDAI_BITMAP[y] ?? '';
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') {
        surface.fillRect(CHUANDAI_LEFT + x, CHUANDAI_TOP + y, 1, 1, COLOR_BLACK);
      }
    }
  }
}
