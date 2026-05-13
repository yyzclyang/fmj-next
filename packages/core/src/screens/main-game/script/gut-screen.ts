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

// 脚本类 screen
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
    while (this.gut.elapsed >= 50 /* gut 滚动间隔 */) {
      this.gut.elapsed -= 50 /* gut 滚动间隔 */;
      this.gut.scrollY -= 1 /* gui 自动滚动步进 */;
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

    drawScaledGutImage(surface, this.gut.topImage, this.layout.topImageLeft, 0, 2);
    drawScaledGutImage(surface, this.gut.bottomImage, this.layout.bottomImageLeft, this.layout.bottomImageTop, 2);
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (key === KeyCode.Cancel) {
      this.closeWithScriptResume();
      return;
    }
    this.gut.scrollY -= 8 /* gut 滚动步进 */;
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
  const topImageWidth = getScaledImageWidth(topImage, 2);
  const topImageHeight = getScaledImageHeight(topImage, 2);
  const bottomImageWidth = getScaledImageWidth(bottomImage, 2);
  const bottomImageHeight = getScaledImageHeight(bottomImage, 2);
  const topImageLeft = topImage ? Math.max(0, Math.floor((SCREEN_WIDTH - topImageWidth) / 2)) : 0;
  const bottomImageTop = bottomImage ? SCREEN_HEIGHT - bottomImageHeight : SCREEN_HEIGHT;
  const bottomImageLeft = bottomImage ? Math.max(0, Math.floor((SCREEN_WIDTH - bottomImageWidth) / 2)) : 0;
  const textTop = 6 /* gut 文字模块间隔 */ + topImageHeight;
  const rawTextBottom = bottomImageTop - (bottomImage ? 6 /* gut 文字模块间隔 */ : 0);
  const textBottom = Math.max(textTop, rawTextBottom);

  return {
    topImageLeft,
    bottomImageLeft,
    bottomImageTop,
    textLeft: 16 /* gut text side padding */,
    textTop,
    textWidth: Math.max(TEXT_LINE_HEIGHT, SCREEN_WIDTH - 16 /* gut text side padding */ * 2),
    textBottom,
  };
}

function getScaledImageWidth(image: ResImage | null, scale: number): number {
  return (image?.width ?? 0) * scale;
}

function getScaledImageHeight(image: ResImage | null, scale: number): number {
  return (image?.height ?? 0) * scale;
}

function drawScaledGutImage(surface: Surface, image: ResImage | null, left: number, top: number, scale: number): void {
  const bitmap = image?.getBitmap(0) ?? null;
  if (!bitmap) return;
  surface.drawScaledBitmap(bitmap, left, top, scale);
}
