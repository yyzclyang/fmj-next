import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import {
  drawTipFrame,
  TIP_FRAME_WIDTH,
  TIP_LINE_GAP,
  TIP_MAX_LINES,
  TIP_TEXT_PADDING_X,
  TIP_TEXT_TOP_PADDING,
  TIP_TEXT_WIDTH,
  wrapTextBlock,
} from '../ui-utils';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';

const DIALOG_LEFT = 18;
const DIALOG_WIDTH = 284;
const DIALOG_TOP = 110;
const DIALOG_HEIGHT = 72;
const DIALOG_WITH_HEAD_TOP = 100;
const DIALOG_WITH_HEAD_HEIGHT = 82;
const DIALOG_TEXT_LEFT = DIALOG_LEFT + 10;
const DIALOG_TEXT_TOP = DIALOG_TOP + 8;
const DIALOG_TEXT_WIDTH = DIALOG_WIDTH - 20;
const DIALOG_HEAD_LEFT = DIALOG_LEFT + 8;
const DIALOG_HEAD_TEXT_LEFT = DIALOG_LEFT + 30;
const DIALOG_HEAD_TEXT_WIDTH = DIALOG_WIDTH - 40;
const DIALOG_PAGE_LINES = 4;
const DIALOG_LINE_GAP = 16;

// 脚本类 screen 把“关闭 UI 后恢复脚本”收在自身生命周期里。
export class ScriptDialogueScreen extends BaseScreen {
  private readonly pages: string[];
  private readonly headImage: ResImage | null;
  private pageIndex = 0;

  constructor(
    game: Game,
    text: string,
    private readonly onClose: () => void,
    headImageIndex = 0
  ) {
    super(game);
    this.headImage = loadHeadImage(game, headImageIndex);
    this.pages = paginateDialogue(text, this.headImage ? DIALOG_HEAD_TEXT_WIDTH : DIALOG_TEXT_WIDTH);
  }

  get isEmpty(): boolean {
    return this.pages.length === 0;
  }

  override draw(surface: Surface): void {
    const layout = getDialogueLayout(this.headImage);
    surface.fillRect(DIALOG_LEFT, layout.top, DIALOG_WIDTH, layout.height, COLOR_BLACK);
    surface.fillRect(DIALOG_LEFT + 1, layout.top + 1, DIALOG_WIDTH - 2, layout.height - 2, COLOR_WHITE);

    if (this.headImage) {
      this.headImage.draw(surface, 1, DIALOG_HEAD_LEFT, layout.headTop);
    }

    const page = this.pages[this.pageIndex] ?? '';
    const lines = page.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      TextRender.drawText(surface, lines[i] ?? '', layout.textLeft, layout.textTop + i * DIALOG_LINE_GAP);
    }
  }

  override onKey(): boolean | undefined {
    if (this.pageIndex + 1 < this.pages.length) {
      this.pageIndex += 1;
      return;
    }
    this.close();
    this.onClose();
    return;
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
    drawTipFrame(surface, left, top, height);
    for (let index = 0; index < lineCount; index += 1) {
      TextRender.drawText(
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

function paginateDialogue(text: string, width: number): string[] {
  const normalized = text.replace(/\r/g, '').replace(/\0/g, '');
  if (normalized.length === 0) return [];

  const lines = wrapTextBlock(normalized, width);
  const pages: string[] = [];

  for (let i = 0; i < lines.length; i += DIALOG_PAGE_LINES) {
    pages.push(lines.slice(i, i + DIALOG_PAGE_LINES).join('\n'));
  }

  return pages;
}

function loadHeadImage(game: Game, index: number): ResImage | null {
  if (index <= 0) return null;
  const res = game.datLib.getRes(ResourceType.PIC, 1, index);
  return res instanceof ResImage ? res : null;
}

function getDialogueLayout(headImage: ResImage | null): {
  top: number;
  height: number;
  textLeft: number;
  textTop: number;
  headTop: number;
} {
  if (!headImage) {
    return {
      top: DIALOG_TOP,
      height: DIALOG_HEIGHT,
      textLeft: DIALOG_TEXT_LEFT,
      textTop: DIALOG_TEXT_TOP,
      headTop: DIALOG_TOP,
    };
  }

  return {
    top: DIALOG_WITH_HEAD_TOP,
    height: DIALOG_WITH_HEAD_HEIGHT,
    textLeft: DIALOG_HEAD_TEXT_LEFT,
    textTop: DIALOG_WITH_HEAD_TOP + 16,
    headTop: DIALOG_WITH_HEAD_TOP + Math.max(4, Math.floor((DIALOG_WITH_HEAD_HEIGHT - headImage.height) / 2)),
  };
}
