import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { drawText, splitTextByWidth, wrapTextBlock } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import {
  drawTipPanel,
  TIP_FRAME_WIDTH,
  TIP_LINE_GAP,
  TIP_MAX_LINES,
  TIP_TEXT_PADDING_X,
  TIP_TEXT_TOP_PADDING,
  TIP_TEXT_WIDTH,
} from '../ui-utils';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/constants';

const DIALOG_LEFT = 18;
const DIALOG_WIDTH = 284;
const DIALOG_TOP = 110;
const DIALOG_HEIGHT = 72;
const DIALOG_HEAD_LEFT = 13;
const DIALOG_HEAD_TOP = 46 + Math.floor((SCREEN_HEIGHT - 96) / 2);
const DIALOG_TEXT_LEFT = 28;
const DIALOG_HEAD_TEXT_LEFT = 48;
const DIALOG_TEXT_RIGHT = 290;
const DIALOG_TEXT_TOPS = [116, 132, 152] as const;
const DIALOG_PAGE_LINES = 3;

interface DialogueLineLayout {
  left: number;
  top: number;
  width: number;
}

// 脚本类 screen 把“关闭 UI 后恢复脚本”收在自身生命周期里。
export class ScriptDialogueScreen extends BaseScreen {
  private readonly pages: string[][];
  private readonly headImage: ResImage | null;
  private readonly layout: DialogueLayout;
  private pageIndex = 0;
  private closed = false;

  constructor(
    game: Game,
    text: string,
    private readonly onClose: () => void,
    headImageIndex = 0
  ) {
    super(game);
    this.headImage = loadHeadImage(game, headImageIndex);
    this.layout = getDialogueLayout(this.headImage);
    this.pages = paginateDialogue(text, this.layout.lines);
  }

  get isEmpty(): boolean {
    return this.pages.length === 0;
  }

  override draw(surface: Surface): void {
    surface.fillRect(DIALOG_LEFT, this.layout.top, DIALOG_WIDTH, this.layout.height, COLOR_BLACK);
    surface.fillRect(DIALOG_LEFT + 1, this.layout.top + 1, DIALOG_WIDTH - 2, this.layout.height - 2, COLOR_WHITE);

    if (this.headImage) {
      this.headImage.draw(surface, 1, DIALOG_HEAD_LEFT, this.layout.headTop);
    }

    const page = this.pages[this.pageIndex] ?? [];
    for (let i = 0; i < page.length; i += 1) {
      const lineLayout = this.layout.lines[i];
      if (!lineLayout) continue;
      drawText(surface, page[i] ?? '', lineLayout.left, lineLayout.top);
    }
  }

  override onKey(): boolean | undefined {
    if (this.pageIndex + 1 < this.pages.length) {
      this.pageIndex += 1;
      return;
    }
    this.closeWithScriptResume();
    return;
  }

  private closeWithScriptResume(): void {
    if (this.closed) return;
    this.closed = true;
    this.close();
    this.onClose();
  }
}

export class ScriptTimedMessageScreen extends BaseScreen {
  private readonly lines: string[];
  private elapsed = 0;
  private closed = false;

  constructor(
    game: Game,
    text: string,
    private readonly delay: number,
    private readonly onClose: () => void
  ) {
    super(game);
    this.lines = wrapTextBlock(text, TIP_TEXT_WIDTH).slice(0, TIP_MAX_LINES);
  }

  override update(delta: number): void {
    if (this.delay <= 0) return;
    this.elapsed += delta;
    if (this.elapsed >= this.delay) {
      this.closeWithScriptResume();
    }
  }

  override draw(surface: Surface): void {
    const lineCount = Math.max(1, this.lines.length);
    const height = lineCount * TIP_LINE_GAP + 20;
    const left = Math.floor((SCREEN_WIDTH - TIP_FRAME_WIDTH) / 2);
    const top = Math.floor((SCREEN_HEIGHT - height) / 2);
    drawTipPanel(surface, left, top, height);
    for (let index = 0; index < lineCount; index += 1) {
      drawText(
        surface,
        this.lines[index] ?? '',
        left + TIP_TEXT_PADDING_X,
        top + TIP_TEXT_TOP_PADDING + index * TIP_LINE_GAP
      );
    }
  }

  override onKey(): boolean | undefined {
    this.closeWithScriptResume();
    return;
  }

  private closeWithScriptResume(): void {
    if (this.closed) return;
    this.closed = true;
    this.close();
    this.onClose();
  }
}

function paginateDialogue(text: string, lineLayouts: readonly DialogueLineLayout[]): string[][] {
  const normalized = text.replace(/\r/g, '').replace(/\0/g, '');
  if (normalized.length === 0) return [];

  const pages: string[][] = [];
  let page: string[] = [];

  function pushLine(line: string): void {
    if (page.length >= DIALOG_PAGE_LINES) {
      pages.push(page);
      page = [];
    }
    page.push(line);
  }

  for (const rawLine of normalized.split('\n')) {
    if (rawLine.length === 0) {
      pushLine('');
      continue;
    }

    let rest = rawLine;
    while (rest.length > 0) {
      if (page.length >= DIALOG_PAGE_LINES) {
        pages.push(page);
        page = [];
      }
      const lineLayout = lineLayouts[page.length];
      const split = splitTextByWidth(rest, lineLayout?.width ?? DIALOG_TEXT_RIGHT - DIALOG_TEXT_LEFT);
      pushLine(split.line);
      rest = split.rest;
    }
  }

  if (page.length > 0) pages.push(page);
  return pages;
}

function loadHeadImage(game: Game, index: number): ResImage | null {
  if (index <= 0) return null;
  return game.datLib.getImage(ResourceType.PIC, 1, index);
}

interface DialogueLayout {
  top: number;
  height: number;
  lines: DialogueLineLayout[];
  headTop: number;
}

function getDialogueLayout(headImage: ResImage | null): DialogueLayout {
  const lines = getDialogueLineLayouts(headImage);
  if (!headImage) {
    return {
      top: DIALOG_TOP,
      height: DIALOG_HEIGHT,
      lines,
      headTop: DIALOG_TOP,
    };
  }

  return {
    top: DIALOG_TOP,
    height: DIALOG_HEIGHT,
    lines,
    headTop: DIALOG_HEAD_TOP,
  };
}

function getDialogueLineLayouts(headImage: ResImage | null): DialogueLineLayout[] {
  const defaultWidth = DIALOG_TEXT_RIGHT - DIALOG_TEXT_LEFT;
  if (!headImage) {
    return createDialogueLineLayouts([
      { left: DIALOG_TEXT_LEFT, width: defaultWidth },
      { left: DIALOG_TEXT_LEFT, width: defaultWidth },
      { left: DIALOG_TEXT_LEFT, width: defaultWidth },
    ]);
  }

  return createDialogueLineLayouts([
    { left: DIALOG_HEAD_TEXT_LEFT, width: DIALOG_TEXT_RIGHT - DIALOG_HEAD_TEXT_LEFT },
    { left: DIALOG_HEAD_TEXT_LEFT, width: DIALOG_TEXT_RIGHT - DIALOG_HEAD_TEXT_LEFT },
    { left: DIALOG_TEXT_LEFT, width: defaultWidth },
  ]);
}

function createDialogueLineLayouts(lines: Array<{ left: number; width: number }>): DialogueLineLayout[] {
  return lines.map((line, index) => ({
    left: line.left,
    top: DIALOG_TEXT_TOPS[index] ?? DIALOG_TEXT_TOPS[DIALOG_TEXT_TOPS.length - 1],
    width: line.width,
  }));
}
