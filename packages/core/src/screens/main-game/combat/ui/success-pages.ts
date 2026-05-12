import type { CombatLevelUpAward, CombatWinSettlement } from '@/combat/combat-runtime';
import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { drawText, getTextWidth, TEXT_LINE_HEIGHT } from '@/rendering/text-render';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/constants';
import { drawSmallNum } from './render-utils';

export interface SuccessPage {
  draw(surface: Surface): void;
}

const MSG_HEIGHT = 24;
const MSG_TOP_DEFAULT = Math.floor((SCREEN_HEIGHT - MSG_HEIGHT) / 2);
const LEVEL_FRAME_WIDTH = 150;
const LEVEL_FRAME_HEIGHT = 120;
const LEVEL_TEXT_LEFT = Math.floor((SCREEN_WIDTH - LEVEL_FRAME_WIDTH) / 2) + 12;
const LEVEL_TEXT_TOP = Math.floor((SCREEN_HEIGHT - LEVEL_FRAME_HEIGHT) / 2) + 8;

// 结算页绘制拆到这里，CombatSuccessSequence 只负责逐页播放。
export function createCombatSuccessVisiblePages(settlement: CombatWinSettlement): SuccessPage[] {
  return [
    new MessagePage(`获得经验${formatRight(settlement.exp, 9)}`, 18),
    new MessagePage(`战斗获得${formatRight(settlement.money, 10)}钱`, 46),
  ];
}

export function createCombatSuccessPendingPages(game: Game, settlement: CombatWinSettlement): SuccessPage[] {
  const pages: SuccessPage[] = [];
  for (const item of settlement.goods) {
    pages.push(new MessagePage(`得到 ${item.goods.name} x${item.count}`));
  }
  for (const award of settlement.levelUps) {
    pages.push(new MessagePage(`${award.player.name}修行提升`));
    pages.push(new LevelUpPage(game, award));
    for (const magicName of getLearnedMagicNames(award)) {
      pages.push(new LearnMagicPage(game, award.player.name, magicName));
    }
  }
  return pages;
}

class MessagePage implements SuccessPage {
  private readonly left: number;
  private readonly top: number;
  private readonly width: number;

  constructor(
    private readonly text: string,
    top = MSG_TOP_DEFAULT
  ) {
    this.width = getTextWidth(text) + 8;
    this.left = Math.floor((SCREEN_WIDTH - this.width) / 2);
    this.top = top;
  }

  draw(surface: Surface): void {
    drawMessageFrame(surface, this.left, this.top, this.width);
    drawText(surface, this.text, this.left + 4, this.top + 4);
  }
}

class LevelUpPage implements SuccessPage {
  private readonly smallNumImage: ResImage | null;
  private readonly infoImage: ResImage | null;

  constructor(
    game: Game,
    private readonly award: CombatLevelUpAward
  ) {
    this.smallNumImage = game.datLib.getImage(ResourceType.PIC, 2, 5);
    this.infoImage = game.datLib.getImage(ResourceType.PIC, 2, 9);
  }

  draw(surface: Surface): void {
    const left = Math.floor((SCREEN_WIDTH - LEVEL_FRAME_WIDTH) / 2);
    const top = Math.floor((SCREEN_HEIGHT - LEVEL_FRAME_HEIGHT) / 2);
    const info = this.infoImage;
    const player = this.award.player;
    const oldStats = this.award.previousStats;
    const newStats = this.award.currentStats;

    if (info) {
      const infoLeft = Math.floor((SCREEN_WIDTH - info.width) / 2);
      const infoTop = Math.floor((SCREEN_HEIGHT - info.height) / 2);
      info.draw(surface, 1, infoLeft, infoTop);
      drawLevelInfoNumbers(surface, this.smallNumImage, this.award, infoLeft, infoTop);
      return;
    }

    drawPanel(surface, left, top, LEVEL_FRAME_WIDTH, LEVEL_FRAME_HEIGHT);
    drawText(surface, player.name, LEVEL_TEXT_LEFT, LEVEL_TEXT_TOP);
    drawLevelLine(surface, this.smallNumImage, '生命', newStats.hp, oldStats.hpMax, newStats.hpMax, 1);
    drawLevelLine(surface, this.smallNumImage, '真气', newStats.mp, oldStats.mpMax, newStats.mpMax, 2);
    drawLevelLine(surface, this.smallNumImage, '攻击', 0, oldStats.attack, newStats.attack, 3);
    drawLevelLine(surface, this.smallNumImage, '防御', 0, oldStats.defense, newStats.defense, 4);
    drawLevelLine(surface, this.smallNumImage, '身法', 0, oldStats.agility, newStats.agility, 5);
    drawLevelLine(surface, this.smallNumImage, '灵力', 0, oldStats.spirit, newStats.spirit, 6);
    drawLevelLine(surface, this.smallNumImage, '幸运', 0, oldStats.luck, newStats.luck, 7);
  }
}

class LearnMagicPage implements SuccessPage {
  private readonly infoImage: ResImage | null;

  constructor(
    game: Game,
    private readonly playerName: string,
    private readonly magicName: string
  ) {
    this.infoImage = game.datLib.getImage(ResourceType.PIC, 2, 10);
  }

  draw(surface: Surface): void {
    const info = this.infoImage;
    if (info) {
      info.draw(surface, 1, Math.floor((SCREEN_WIDTH - info.width) / 2), Math.floor((SCREEN_HEIGHT - info.height) / 2));
    } else {
      drawPanel(surface, 82, 56, 156, 80);
    }
    drawText(surface, this.playerName, Math.floor((SCREEN_WIDTH - getTextWidth(this.playerName)) / 2), 64);
    drawText(surface, this.magicName, Math.floor((SCREEN_WIDTH - getTextWidth(this.magicName)) / 2), 104);
  }
}

function drawLevelLine(
  surface: Surface,
  smallNumImage: ResImage | null,
  label: string,
  current: number,
  oldValue: number,
  newValue: number,
  line: number
): void {
  const top = LEVEL_TEXT_TOP + line * TEXT_LINE_HEIGHT;
  drawText(surface, label, LEVEL_TEXT_LEFT, top);
  if (current > 0) {
    drawSmallNum(surface, smallNumImage, current, LEVEL_TEXT_LEFT + 40, top);
  }
  drawSmallNum(surface, smallNumImage, oldValue, LEVEL_TEXT_LEFT + 72, top);
  drawText(surface, '>', LEVEL_TEXT_LEFT + 102, top);
  drawSmallNum(surface, smallNumImage, newValue, LEVEL_TEXT_LEFT + 120, top);
}

function drawLevelInfoNumbers(
  surface: Surface,
  smallNumImage: ResImage | null,
  award: CombatLevelUpAward,
  left: number,
  top: number
): void {
  const oldStats = award.previousStats;
  const newStats = award.currentStats;
  drawSmallNum(surface, smallNumImage, newStats.hp, left + 37, top + 9);
  drawSmallNum(surface, smallNumImage, oldStats.hpMax, left + 56, top + 9);
  drawSmallNum(surface, smallNumImage, newStats.hpMax, left + 86, top + 9);
  drawSmallNum(surface, smallNumImage, newStats.hpMax, left + 105, top + 9);
  drawSmallNum(surface, smallNumImage, newStats.mp, left + 37, top + 21);
  drawSmallNum(surface, smallNumImage, oldStats.mpMax, left + 56, top + 21);
  drawSmallNum(surface, smallNumImage, newStats.mpMax, left + 86, top + 21);
  drawSmallNum(surface, smallNumImage, newStats.mpMax, left + 105, top + 21);
  drawSmallNum(surface, smallNumImage, oldStats.attack, left + 47, top + 33);
  drawSmallNum(surface, smallNumImage, newStats.attack, left + 96, top + 33);
  drawSmallNum(surface, smallNumImage, oldStats.defense, left + 47, top + 45);
  drawSmallNum(surface, smallNumImage, newStats.defense, left + 96, top + 45);
  drawSmallNum(surface, smallNumImage, oldStats.agility, left + 47, top + 57);
  drawSmallNum(surface, smallNumImage, newStats.agility, left + 96, top + 57);
  drawSmallNum(surface, smallNumImage, oldStats.spirit, left + 47, top + 69);
  drawSmallNum(surface, smallNumImage, newStats.spirit, left + 96, top + 69);
  drawSmallNum(surface, smallNumImage, oldStats.luck, left + 47, top + 81);
  drawSmallNum(surface, smallNumImage, newStats.luck, left + 96, top + 81);
}

function drawMessageFrame(surface: Surface, left: number, top: number, width: number): void {
  surface.fillRect(left, top, width, MSG_HEIGHT, COLOR_WHITE);
  surface.fillRect(left, top + 1, width, 1, COLOR_BLACK);
  surface.fillRect(left, top + MSG_HEIGHT - 2, width, 1, COLOR_BLACK);
  surface.fillRect(left, top, 1, MSG_HEIGHT, COLOR_BLACK);
  surface.fillRect(left + width - 1, top, 1, MSG_HEIGHT, COLOR_BLACK);
}

function drawPanel(surface: Surface, left: number, top: number, width: number, height: number): void {
  surface.fillRect(left, top, width, height, COLOR_WHITE);
  surface.strokeRect(left, top, width, height, COLOR_BLACK);
}

function formatRight(value: number, width: number): string {
  const text = `${value}`;
  return `${' '.repeat(Math.max(0, width - text.length))}${text}`;
}

function getLearnedMagicNames(award: CombatLevelUpAward): string[] {
  const chain = award.player.magicChain;
  if (!chain) return [];
  const maxCount = Math.min(award.newMagicCount, chain.getMagicCount());
  const res: string[] = [];
  for (let i = award.oldMagicCount; i < maxCount; i += 1) {
    const magic = chain.getMagic(i);
    if (magic) res.push(magic.name);
  }
  return res;
}
