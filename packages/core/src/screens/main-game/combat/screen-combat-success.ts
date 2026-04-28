import type { CombatLevelUpAward, CombatWinSettlement } from '@/combat';
import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { getTextWidth } from '../ui-utils';

interface SuccessPage {
  draw(surface: Surface): void;
}

const PAGE_INTERVAL = 1000;
const MSG_HEIGHT = 24;
const MSG_TOP_DEFAULT = Math.floor((SCREEN_HEIGHT - MSG_HEIGHT) / 2);
const LEVEL_FRAME_WIDTH = 150;
const LEVEL_FRAME_HEIGHT = 120;
const LEVEL_TEXT_LEFT = Math.floor((SCREEN_WIDTH - LEVEL_FRAME_WIDTH) / 2) + 12;
const LEVEL_TEXT_TOP = Math.floor((SCREEN_HEIGHT - LEVEL_FRAME_HEIGHT) / 2) + 8;
const LEVEL_LINE_GAP = 16;

// Kotlin 版 CombatSuccess 会逐条显示经验、金钱、掉落和升级信息。
export class ScreenCombatSuccess {
  private readonly visiblePages: SuccessPage[] = [];
  private readonly pendingPages: SuccessPage[];
  private elapsed = 0;
  private skipRequested = false;

  constructor(
    private readonly game: Game,
    settlement: CombatWinSettlement
  ) {
    this.visiblePages.push(new MessagePage(`获得经验${formatRight(settlement.exp, 9)}`, 18));
    this.visiblePages.push(new MessagePage(`战斗获得${formatRight(settlement.money, 10)}钱`, 46));
    this.pendingPages = this.createPendingPages(settlement);
  }

  update(delta: number): boolean {
    this.elapsed += delta;
    if (this.elapsed <= PAGE_INTERVAL && !this.skipRequested) return false;
    this.elapsed = 0;
    this.skipRequested = false;
    const page = this.pendingPages.shift();
    if (!page) return true;
    this.visiblePages.push(page);
    return false;
  }

  draw(surface: Surface): void {
    for (const page of this.visiblePages) {
      page.draw(surface);
    }
  }

  skip(): void {
    this.skipRequested = true;
  }

  private createPendingPages(settlement: CombatWinSettlement): SuccessPage[] {
    const pages: SuccessPage[] = [];
    for (const item of settlement.goods) {
      pages.push(new MessagePage(`得到 ${item.goods.name} x${item.count}`));
    }
    for (const award of settlement.levelUps) {
      pages.push(new MessagePage(`${award.player.name}修行提升`));
      pages.push(new LevelUpPage(this.game, award));
      for (const magicName of getLearnedMagicNames(award)) {
        pages.push(new LearnMagicPage(this.game, award.player.name, magicName));
      }
    }
    return pages;
  }
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
    TextRender.drawText(surface, this.text, this.left + 4, this.top + 4);
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
    const chain = player.levelUpChain;
    if (!chain) return;

    if (info) {
      const infoLeft = Math.floor((SCREEN_WIDTH - info.width) / 2);
      const infoTop = Math.floor((SCREEN_HEIGHT - info.height) / 2);
      info.draw(surface, 1, infoLeft, infoTop);
      drawLevelInfoNumbers(surface, this.smallNumImage, this.award, infoLeft, infoTop);
      return;
    }

    drawPanel(surface, left, top, LEVEL_FRAME_WIDTH, LEVEL_FRAME_HEIGHT);
    TextRender.drawText(surface, player.name, LEVEL_TEXT_LEFT, LEVEL_TEXT_TOP);
    drawLevelLine(surface, this.smallNumImage, '生命', player.hp, chain.getMaxHp(this.award.previousLevel), player.maxHp, 1);
    drawLevelLine(surface, this.smallNumImage, '真气', player.mp, chain.getMaxMp(this.award.previousLevel), player.maxMp, 2);
    drawLevelLine(surface, this.smallNumImage, '攻击', 0, chain.getAttack(this.award.previousLevel), player.attack, 3);
    drawLevelLine(surface, this.smallNumImage, '防御', 0, chain.getDefend(this.award.previousLevel), player.defend, 4);
    drawLevelLine(surface, this.smallNumImage, '身法', 0, chain.getSpeed(this.award.previousLevel), player.speed, 5);
    drawLevelLine(surface, this.smallNumImage, '灵力', 0, chain.getLingli(this.award.previousLevel), player.lingli, 6);
    drawLevelLine(surface, this.smallNumImage, '幸运', 0, chain.getLuck(this.award.previousLevel), player.luck, 7);
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
    TextRender.drawText(surface, this.playerName, Math.floor((SCREEN_WIDTH - getTextWidth(this.playerName)) / 2), 64);
    TextRender.drawText(surface, this.magicName, Math.floor((SCREEN_WIDTH - getTextWidth(this.magicName)) / 2), 104);
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
  const top = LEVEL_TEXT_TOP + line * LEVEL_LINE_GAP;
  TextRender.drawText(surface, label, LEVEL_TEXT_LEFT, top);
  if (current > 0) {
    drawSmallNum(surface, smallNumImage, current, LEVEL_TEXT_LEFT + 40, top);
  }
  drawSmallNum(surface, smallNumImage, oldValue, LEVEL_TEXT_LEFT + 72, top);
  TextRender.drawText(surface, '>', LEVEL_TEXT_LEFT + 102, top);
  drawSmallNum(surface, smallNumImage, newValue, LEVEL_TEXT_LEFT + 120, top);
}

function drawLevelInfoNumbers(
  surface: Surface,
  smallNumImage: ResImage | null,
  award: CombatLevelUpAward,
  left: number,
  top: number
): void {
  const player = award.player;
  const chain = player.levelUpChain;
  if (!chain) return;
  drawSmallNum(surface, smallNumImage, player.hp, left + 37, top + 9);
  drawSmallNum(surface, smallNumImage, chain.getMaxHp(award.previousLevel), left + 56, top + 9);
  drawSmallNum(surface, smallNumImage, player.maxHp, left + 86, top + 9);
  drawSmallNum(surface, smallNumImage, player.maxHp, left + 105, top + 9);
  drawSmallNum(surface, smallNumImage, player.mp, left + 37, top + 21);
  drawSmallNum(surface, smallNumImage, chain.getMaxMp(award.previousLevel), left + 56, top + 21);
  drawSmallNum(surface, smallNumImage, player.maxMp, left + 86, top + 21);
  drawSmallNum(surface, smallNumImage, player.maxMp, left + 105, top + 21);
  drawSmallNum(surface, smallNumImage, chain.getAttack(award.previousLevel), left + 47, top + 33);
  drawSmallNum(surface, smallNumImage, player.attack, left + 96, top + 33);
  drawSmallNum(surface, smallNumImage, chain.getDefend(award.previousLevel), left + 47, top + 45);
  drawSmallNum(surface, smallNumImage, player.defend, left + 96, top + 45);
  drawSmallNum(surface, smallNumImage, chain.getSpeed(award.previousLevel), left + 47, top + 57);
  drawSmallNum(surface, smallNumImage, player.speed, left + 96, top + 57);
  drawSmallNum(surface, smallNumImage, chain.getLingli(award.previousLevel), left + 47, top + 69);
  drawSmallNum(surface, smallNumImage, player.lingli, left + 96, top + 69);
  drawSmallNum(surface, smallNumImage, chain.getLuck(award.previousLevel), left + 47, top + 81);
  drawSmallNum(surface, smallNumImage, player.luck, left + 96, top + 81);
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
  surface.fillRect(left, top, width, 1, COLOR_BLACK);
  surface.fillRect(left, top + height - 1, width, 1, COLOR_BLACK);
  surface.fillRect(left, top, 1, height, COLOR_BLACK);
  surface.fillRect(left + width - 1, top, 1, height, COLOR_BLACK);
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
    if (magic) res.push(magic.magicName);
  }
  return res;
}
