import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { wrapTextBlock } from '../ui-utils';

interface GutState {
  topImage: ResImage | null;
  bottomImage: ResImage | null;
  lines: string[];
  scrollY: number;
  step: number;
  interval: number;
  elapsed: number;
}

const GUT_DEFAULT_STEP = 1;
const GUT_FAST_STEP = 3;
const GUT_DEFAULT_INTERVAL = 50;
const GUT_FAST_INTERVAL = 20;
const GUT_TEXT_SIDE_PADDING = 16;
const GUT_SECTION_GAP = 6;

// 脚本类 screen 把“关闭 UI 后恢复脚本”收在自身生命周期里。
export class ScriptGutScreen extends BaseScreen {
  private readonly gut: GutState;

  constructor(
    game: Game,
    topImageIndex: number,
    bottomImageIndex: number,
    text: string,
    private readonly onClose: () => void
  ) {
    super(game);
    const topImage = loadPicture(game, topImageIndex);
    const bottomImage = loadPicture(game, bottomImageIndex);
    const layout = getGutLayout({
      topImage,
      bottomImage,
      lines: [],
      scrollY: 0,
      step: 0,
      interval: 0,
      elapsed: 0,
    });

    this.gut = {
      topImage,
      bottomImage,
      lines: wrapTextBlock(text, layout.textWidth),
      scrollY: layout.textBottom,
      step: GUT_DEFAULT_STEP,
      interval: GUT_DEFAULT_INTERVAL,
      elapsed: 0,
    };
  }

  override update(delta: number): void {
    const layout = getGutLayout(this.gut);
    this.gut.elapsed += delta;
    while (this.gut.elapsed >= this.gut.interval) {
      this.gut.elapsed -= this.gut.interval;
      this.gut.scrollY -= this.gut.step;
    }

    const textBottom = this.gut.scrollY + this.gut.lines.length * 16;
    if (textBottom < layout.textTop) {
      this.closeWithScriptResume();
    }
  }

  override draw(surface: Surface): void {
    const layout = getGutLayout(this.gut);

    surface.drawColor(COLOR_WHITE);
    for (let i = 0; i < this.gut.lines.length; i += 1) {
      const top = this.gut.scrollY + i * 16;
      if (top + 16 <= layout.textTop || top >= layout.textBottom) continue;
      TextRender.drawText(surface, this.gut.lines[i] ?? '', layout.textLeft, top);
    }

    if (layout.textTop > 0) {
      surface.fillRect(0, 0, SCREEN_WIDTH, layout.textTop, COLOR_WHITE);
    }
    if (layout.textBottom < SCREEN_HEIGHT) {
      surface.fillRect(0, layout.textBottom, SCREEN_WIDTH, SCREEN_HEIGHT - layout.textBottom, COLOR_WHITE);
    }

    this.gut.topImage?.draw(surface, 1, layout.topImageLeft, 0);
    this.gut.bottomImage?.draw(surface, 1, layout.bottomImageLeft, layout.bottomImageTop);
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (key === KeyCode.Cancel) {
      this.closeWithScriptResume();
      return;
    }
    this.gut.step = GUT_FAST_STEP;
    this.gut.interval = GUT_FAST_INTERVAL;
  }

  private closeWithScriptResume(): void {
    this.close();
    this.onClose();
  }
}

function loadPicture(game: Game, index: number): ResImage | null {
  if (index <= 0) return null;
  const picRes = game.datLib.getRes(ResourceType.PIC, 5, index);
  return picRes instanceof ResImage ? picRes : null;
}

function getGutLayout(gut: GutState): {
  topImageLeft: number;
  bottomImageLeft: number;
  bottomImageTop: number;
  textLeft: number;
  textTop: number;
  textWidth: number;
  textBottom: number;
} {
  const topImageLeft = gut.topImage ? Math.max(0, Math.floor((SCREEN_WIDTH - gut.topImage.width) / 2)) : 0;
  const bottomImageTop = gut.bottomImage ? SCREEN_HEIGHT - gut.bottomImage.height : SCREEN_HEIGHT;
  const bottomImageLeft = gut.bottomImage ? Math.max(0, Math.floor((SCREEN_WIDTH - gut.bottomImage.width) / 2)) : 0;
  const textTop = (gut.topImage?.height ?? 0) + GUT_SECTION_GAP;
  const rawTextBottom = bottomImageTop - (gut.bottomImage ? GUT_SECTION_GAP : 0);
  const textBottom = Math.max(textTop, rawTextBottom);

  return {
    topImageLeft,
    bottomImageLeft,
    bottomImageTop,
    textLeft: GUT_TEXT_SIDE_PADDING,
    textTop,
    textWidth: Math.max(16, SCREEN_WIDTH - GUT_TEXT_SIDE_PADDING * 2),
    textBottom,
  };
}
