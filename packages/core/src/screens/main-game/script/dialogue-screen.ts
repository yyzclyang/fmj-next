import type { Game } from '@/game/game';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { wrapTextBlock } from '../ui-utils';

const DIALOG_LEFT = 18;
const DIALOG_TOP = 110;
const DIALOG_WIDTH = 284;
const DIALOG_HEIGHT = 72;
const DIALOG_TEXT_LEFT = DIALOG_LEFT + 10;
const DIALOG_TEXT_TOP = DIALOG_TOP + 8;
const DIALOG_TEXT_WIDTH = DIALOG_WIDTH - 20;
const DIALOG_PAGE_LINES = 4;
const DIALOG_LINE_GAP = 16;

// 脚本类 screen 把“关闭 UI 后恢复脚本”收在自身生命周期里。
export class ScriptDialogueScreen extends BaseScreen {
  private readonly pages: string[];
  private pageIndex = 0;

  constructor(
    game: Game,
    text: string,
    private readonly onClose: () => void
  ) {
    super(game);
    this.pages = paginateDialogue(text);
  }

  get isEmpty(): boolean {
    return this.pages.length === 0;
  }

  override draw(surface: Surface): void {
    surface.fillRect(DIALOG_LEFT, DIALOG_TOP, DIALOG_WIDTH, DIALOG_HEIGHT, COLOR_BLACK);
    surface.fillRect(DIALOG_LEFT + 1, DIALOG_TOP + 1, DIALOG_WIDTH - 2, DIALOG_HEIGHT - 2, COLOR_WHITE);

    const page = this.pages[this.pageIndex] ?? '';
    const lines = page.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      TextRender.drawText(surface, lines[i] ?? '', DIALOG_TEXT_LEFT, DIALOG_TEXT_TOP + i * DIALOG_LINE_GAP);
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

function paginateDialogue(text: string): string[] {
  const normalized = text.replace(/\r/g, '').replace(/\0/g, '');
  if (normalized.length === 0) return [];

  const lines = wrapTextBlock(normalized, DIALOG_TEXT_WIDTH);
  const pages: string[] = [];

  for (let i = 0; i < lines.length; i += DIALOG_PAGE_LINES) {
    pages.push(lines.slice(i, i + DIALOG_PAGE_LINES).join('\n'));
  }

  return pages;
}
