import type { Player } from '@/characters';
import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { getTextWidth } from '../ui-utils';
import { getPartyPlayers } from './screen-select-actor';

const HEAD_LEFT = 10;
const HEAD_TOP = 2;
const HEAD_GAP = 32;
const STATE_TEXT_LEFT = 41;
const STATE_START_Y = 4;
const STATE_LINE_HEIGHT = 19;

// 状态页挂在主菜单子栈里，退出后会回到一级主菜单。
export class ScreenActorState extends BaseScreen {
  private readonly players: Player[];
  private currentPlayer = 0;
  private page = 0;

  constructor(game: Game) {
    super(game);
    this.players = getPartyPlayers(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.drawPlayerList(surface);
    const player = this.players[this.currentPlayer];
    if (!player) return;
    this.drawDetails(surface, player);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.movePlayer(-1);
        return;
      case KeyCode.Down:
        this.movePlayer(1);
        return;
      case KeyCode.PageUp:
      case KeyCode.PageDown:
        this.page = 1 - this.page;
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private movePlayer(step: number): void {
    if (this.players.length === 0) return;
    this.currentPlayer = (this.currentPlayer + step + this.players.length) % this.players.length;
  }

  private drawPlayerList(surface: Surface): void {
    for (let i = 0; i < this.players.length; i += 1) {
      const top = HEAD_TOP + i * HEAD_GAP;
      drawHead(surface, this.players[i], HEAD_LEFT, top);
    }
    if (this.players.length > 0) {
      drawTriangleCursor(surface, 3, 10 + HEAD_GAP * this.currentPlayer);
    }
  }

  private drawDetails(surface: Surface, player: Player): void {
    drawPlayerState(surface, player, this.page, this.game.datLib.getImage(ResourceType.PIC, 2, 5));
  }
}

export function drawPlayerState(surface: Surface, player: Player, page: number, smallNumImage: ResImage | null): void {
  void page;
  let y = STATE_START_Y;
  surface.fillRect(37, y - 4, 1, STATE_LINE_HEIGHT * 10, COLOR_BLACK);
  TextRender.drawText(surface, `等级   ${player.level}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;
  TextRender.drawText(surface, `生命   ${player.hp}/${player.hpMax}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;
  TextRender.drawText(surface, `真气   ${player.mp}/${player.mpMax}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;
  TextRender.drawText(surface, `攻击力 ${player.attack}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;
  TextRender.drawText(surface, `防御力 ${player.defense}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;
  TextRender.drawText(surface, `身法   ${player.agility}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;
  TextRender.drawText(surface, `灵力   ${player.spirit}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;
  TextRender.drawText(surface, `幸运   ${player.luck}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;

  TextRender.drawText(surface, '经验值', STATE_TEXT_LEFT, y);
  const width = drawSmallNum(surface, smallNumImage, player.exp, 97, y);
  TextRender.drawText(surface, '/', 97 + width + 2, y);
  drawSmallNum(surface, smallNumImage, player.levelUpChain?.getNextLevelExp(player.level) ?? 0, 97 + width + 9, y + 6);
  y += STATE_LINE_HEIGHT;

  TextRender.drawText(surface, `免疫   ${getImmunityText(player)}`, STATE_TEXT_LEFT, y);
  y += STATE_LINE_HEIGHT;

  TextRender.drawText(surface, '已学魔法:', STATE_TEXT_LEFT, y);
  const magics = player.getAllLearnedMagics();
  const maxDisplay = Math.min(4, magics.length);
  for (let i = 0; i < maxDisplay; i += 1) {
    TextRender.drawText(surface, `${i + 1}. ${magics[i]?.name ?? '未知'}`, STATE_TEXT_LEFT, y + STATE_LINE_HEIGHT * (i + 1));
  }
  if (magics.length > 4) {
    TextRender.drawText(surface, `... 还有${magics.length - 4}个`, STATE_TEXT_LEFT, y + STATE_LINE_HEIGHT * (maxDisplay + 1));
  }
}

function drawSmallNum(surface: Surface, image: ResImage | null, num: number, left: number, top: number): number {
  const text = `${Math.abs(num)}`;
  if (!image) {
    TextRender.drawText(surface, text, left, top);
    return getTextWidth(text);
  }

  let x = left;
  for (const char of text) {
    image.draw(surface, Number(char) + 1, x, top);
    x += image.width + 1;
  }
  return text.length * image.width;
}

function getImmunityText(player: Player): string {
  let text = '';
  if ((player.immuneStatuses.slots[3]?.value ?? 0) > 0) text += '毒';
  if ((player.immuneStatuses.slots[2]?.value ?? 0) > 0) text += '乱';
  if ((player.immuneStatuses.slots[1]?.value ?? 0) > 0) text += '封';
  if ((player.immuneStatuses.slots[0]?.value ?? 0) > 0) text += '眠';
  return text || '无';
}

function drawHead(surface: Surface, player: Player | undefined, left: number, top: number): void {
  if (player?.headImage) {
    player.headImage.draw(surface, 1, left, top);
  }
}

function drawTriangleCursor(surface: Surface, left: number, top: number): void {
  for (let i = 0; i < 7; i += 1) {
    surface.fillRect(left + i, top + i, 1, 13 - i * 2, COLOR_BLACK);
  }
}
