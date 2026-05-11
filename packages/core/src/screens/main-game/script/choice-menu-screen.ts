import type { Game } from '@/game/game';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { drawSelectedText, drawText, getTextWidth } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';

const FRAME_PADDING_X = 3;
const FRAME_PADDING_Y = 3;
const LINE_GAP = 16;

// CHOICE/MENU 都是脚本暂停后的弹层，确认后把选择结果交还给脚本继续。
export class ScriptChoiceScreen extends BaseScreen {
  private selectedIndex = 0;
  private readonly options: readonly string[];
  private readonly left: number;
  private readonly top: number;
  private readonly textLeft: number;
  private readonly textTop: number;

  constructor(
    game: Game,
    firstChoice: string,
    secondChoice: string,
    private readonly onSelect: (selectedIndex: number) => void
  ) {
    super(game);
    const textWidth = Math.max(getTextWidth(firstChoice), getTextWidth(secondChoice));
    const frameWidth = textWidth + FRAME_PADDING_X * 2;
    const frameHeight = LINE_GAP * 2 + FRAME_PADDING_Y * 2;

    this.options = [padTextToWidth(firstChoice, textWidth), padTextToWidth(secondChoice, textWidth)];
    this.left = Math.floor((SCREEN_WIDTH - frameWidth) / 2);
    this.top = Math.floor((SCREEN_HEIGHT - frameHeight) / 2);
    this.textLeft = this.left + FRAME_PADDING_X;
    this.textTop = this.top + FRAME_PADDING_Y;
  }

  override draw(surface: Surface): void {
    const width = Math.max(...this.options.map(getTextWidth)) + FRAME_PADDING_X * 2;
    drawInsetPanel(surface, this.left, this.top, width, LINE_GAP * this.options.length + FRAME_PADDING_Y * 2);
    this.drawOptions(surface);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
      case KeyCode.Down:
      case KeyCode.Left:
      case KeyCode.Right:
        this.selectedIndex = 1 - this.selectedIndex;
        return;
      case KeyCode.Enter:
        this.close();
        this.onSelect(this.selectedIndex);
        return;
    }
  }

  private drawOptions(surface: Surface): void {
    for (let i = 0; i < this.options.length; i += 1) {
      const draw = i === this.selectedIndex ? drawSelectedText : drawText;
      draw(surface, this.options[i] ?? '', this.textLeft, this.textTop + i * LINE_GAP);
    }
  }
}

export class ScriptMenuScreen extends BaseScreen {
  private selectedIndex = 0;
  private readonly items: readonly string[];
  private readonly left: number;
  private readonly top: number;
  private readonly textLeft: number;
  private readonly textTop: number;
  private readonly frameWidth: number;
  private readonly frameHeight: number;

  constructor(
    game: Game,
    items: readonly string[],
    private readonly onSelect: (value: number) => void
  ) {
    super(game);
    if (items.length === 0) throw new Error('脚本 MENU 没有菜单项');
    const textWidth = Math.max(...items.map(getTextWidth));
    const textHeight = LINE_GAP * items.length;

    this.items = items.map(item => padTextToWidth(item, textWidth));
    this.frameWidth = textWidth + FRAME_PADDING_X * 2;
    this.frameHeight = textHeight + FRAME_PADDING_Y * 2;
    this.left = Math.floor((SCREEN_WIDTH - textWidth) / 2) - FRAME_PADDING_X;
    this.top = Math.floor((SCREEN_HEIGHT - textHeight) / 2) - FRAME_PADDING_Y;
    this.textLeft = this.left + FRAME_PADDING_X;
    this.textTop = this.top + FRAME_PADDING_Y;
  }

  override draw(surface: Surface): void {
    drawInsetPanel(surface, this.left, this.top, this.frameWidth, this.frameHeight);
    for (let i = 0; i < this.items.length; i += 1) {
      const draw = i === this.selectedIndex ? drawSelectedText : drawText;
      draw(surface, this.items[i] ?? '', this.textLeft, this.textTop + i * LINE_GAP);
    }
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        if (this.selectedIndex > 0) this.selectedIndex -= 1;
        return;
      case KeyCode.Down:
        if (this.selectedIndex < this.items.length - 1) this.selectedIndex += 1;
        return;
      case KeyCode.Enter:
        this.close();
        this.onSelect(this.selectedIndex + 1);
        return;
      case KeyCode.Cancel:
        this.close();
        this.onSelect(0);
        return;
    }
  }
}

function padTextToWidth(text: string, width: number): string {
  let res = text;
  while (getTextWidth(res) < width) {
    res += ' ';
  }
  return res;
}
