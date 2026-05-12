import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { drawText, TEXT_LINE_HEIGHT, wrapTextBlock } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/constants';
import { KeyCode } from '@/utils/key-code';

interface GutState {
  topImage: ResImage | null;
  bottomImage: ResImage | null;
  lines: string[];
  scrollY: number;
  elapsed: number;
}

interface GutLayout {
  topImageLeft: number;
  bottomImageLeft: number;
  bottomImageTop: number;
  textLeft: number;
  textTop: number;
  textWidth: number;
  textBottom: number;
}

const GUT_AUTO_SCROLL_STEP = 1;
const GUT_AUTO_SCROLL_INTERVAL = 50;
const GUT_KEY_SCROLL_STEP = 8;
const GUT_TEXT_SIDE_PADDING = 16;
const GUT_SECTION_GAP = 6;

// 脚本类 screen 把“关闭 UI 后恢复脚本”收在自身生命周期里。
export class ScriptGutScreen extends BaseScreen {
  private readonly gut: GutState;
  private readonly layout: GutLayout;
  private closed = false;

  constructor(
    game: Game,
    topImageIndex: number,
    bottomImageIndex: number,
    text: string,
    private readonly onClose: () => void
  ) {
    super(game);
    const topImage = loadGutImage(game, topImageIndex);
    const bottomImage = loadGutImage(game, bottomImageIndex);
    this.layout = getGutLayout(topImage, bottomImage);

    this.gut = {
      topImage,
      bottomImage,
      lines: wrapTextBlock(text, this.layout.textWidth),
      scrollY: this.layout.textBottom,
      elapsed: 0,
    };
  }

  override update(delta: number): void {
    this.gut.elapsed += delta;
    while (this.gut.elapsed >= GUT_AUTO_SCROLL_INTERVAL) {
      this.gut.elapsed -= GUT_AUTO_SCROLL_INTERVAL;
      this.gut.scrollY -= GUT_AUTO_SCROLL_STEP;
    }

    const textBottom = this.gut.scrollY + this.gut.lines.length * TEXT_LINE_HEIGHT;
    if (textBottom < this.layout.textTop) {
      this.closeWithScriptResume();
    }
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    for (let i = 0; i < this.gut.lines.length; i += 1) {
      const top = this.gut.scrollY + i * TEXT_LINE_HEIGHT;
      if (top + TEXT_LINE_HEIGHT <= this.layout.textTop || top >= this.layout.textBottom) continue;
      drawText(surface, this.gut.lines[i] ?? '', this.layout.textLeft, top);
    }

    if (this.layout.textTop > 0) {
      surface.fillRect(0, 0, SCREEN_WIDTH, this.layout.textTop, COLOR_WHITE);
    }
    if (this.layout.textBottom < SCREEN_HEIGHT) {
      surface.fillRect(0, this.layout.textBottom, SCREEN_WIDTH, SCREEN_HEIGHT - this.layout.textBottom, COLOR_WHITE);
    }

    this.gut.topImage?.draw(surface, 1, this.layout.topImageLeft, 0);
    this.gut.bottomImage?.draw(surface, 1, this.layout.bottomImageLeft, this.layout.bottomImageTop);
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (key === KeyCode.Cancel) {
      this.closeWithScriptResume();
      return;
    }
    this.gut.scrollY -= GUT_KEY_SCROLL_STEP;
    this.gut.elapsed = 0;
  }

  private closeWithScriptResume(): void {
    if (this.closed) return;
    this.closed = true;
    this.close();
    this.onClose();
  }
}

function loadGutImage(game: Game, index: number): ResImage | null {
  if (index <= 0) return null;
  return game.datLib.getImage(ResourceType.PIC, 5, index);
}

function getGutLayout(topImage: ResImage | null, bottomImage: ResImage | null): GutLayout {
  const topImageLeft = topImage ? Math.max(0, Math.floor((SCREEN_WIDTH - topImage.width) / 2)) : 0;
  const bottomImageTop = bottomImage ? SCREEN_HEIGHT - bottomImage.height : SCREEN_HEIGHT;
  const bottomImageLeft = bottomImage ? Math.max(0, Math.floor((SCREEN_WIDTH - bottomImage.width) / 2)) : 0;
  const textTop = (topImage?.height ?? 0) + GUT_SECTION_GAP;
  const rawTextBottom = bottomImageTop - (bottomImage ? GUT_SECTION_GAP : 0);
  const textBottom = Math.max(textTop, rawTextBottom);

  return {
    topImageLeft,
    bottomImageLeft,
    bottomImageTop,
    textLeft: GUT_TEXT_SIDE_PADDING,
    textTop,
    textWidth: Math.max(TEXT_LINE_HEIGHT, SCREEN_WIDTH - GUT_TEXT_SIDE_PADDING * 2),
    textBottom,
  };
}
