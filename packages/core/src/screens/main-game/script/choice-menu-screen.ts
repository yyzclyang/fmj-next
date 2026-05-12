import type { Game } from '@/game/game';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { drawSelectedText, drawText, getTextWidth, TEXT_LINE_HEIGHT } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/constants';
import { KeyCode } from '@/utils/key-code';

const FRAME_PADDING_X = 3;
const FRAME_PADDING_Y = 3;

interface ScriptMenuLayout {
  readonly items: readonly string[];
  readonly left: number;
  readonly top: number;
  readonly textLeft: number;
  readonly textTop: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

// CHOICE/MENU 都是脚本暂停后的弹层，确认后把选择结果交还给脚本继续。
export class ScriptChoiceScreen extends BaseScreen {
  private selectedIndex = 0;
  private readonly layout: ScriptMenuLayout;

  constructor(
    game: Game,
    firstChoice: string,
    secondChoice: string,
    private readonly onSelectChoiceIndex: (choiceIndex: number) => void
  ) {
    super(game);
    this.layout = createCenteredScriptMenuLayout([firstChoice, secondChoice]);
  }

  override draw(surface: Surface): void {
    drawScriptMenu(surface, this.layout, this.selectedIndex);
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
        this.onSelectChoiceIndex(this.selectedIndex);
        return;
    }
  }
}

export class ScriptMenuScreen extends BaseScreen {
  private selectedIndex = 0;
  private readonly layout: ScriptMenuLayout;

  constructor(
    game: Game,
    items: readonly string[],
    private readonly onSelectMenuValue: (menuValue: number) => void
  ) {
    super(game);
    if (items.length === 0) throw new Error('脚本 MENU 没有菜单项');
    this.layout = createCenteredScriptMenuLayout(items);
  }

  override draw(surface: Surface): void {
    drawScriptMenu(surface, this.layout, this.selectedIndex);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        if (this.selectedIndex > 0) this.selectedIndex -= 1;
        return;
      case KeyCode.Down:
        if (this.selectedIndex < this.layout.items.length - 1) this.selectedIndex += 1;
        return;
      case KeyCode.Enter:
        this.close();
        this.onSelectMenuValue(this.selectedIndex + 1);
        return;
      case KeyCode.Cancel:
        this.close();
        this.onSelectMenuValue(0);
        return;
    }
  }
}

function createCenteredScriptMenuLayout(items: readonly string[]): ScriptMenuLayout {
  const textWidth = Math.max(...items.map(getTextWidth));
  const textHeight = TEXT_LINE_HEIGHT * items.length;
  const frameWidth = textWidth + FRAME_PADDING_X * 2;
  const frameHeight = textHeight + FRAME_PADDING_Y * 2;
  const left = Math.floor((SCREEN_WIDTH - frameWidth) / 2);
  const top = Math.floor((SCREEN_HEIGHT - frameHeight) / 2);

  return {
    items: items.map(item => padTextToWidth(item, textWidth)),
    left,
    top,
    textLeft: left + FRAME_PADDING_X,
    textTop: top + FRAME_PADDING_Y,
    frameWidth,
    frameHeight,
  };
}

function drawScriptMenu(surface: Surface, layout: ScriptMenuLayout, selectedIndex: number): void {
  drawInsetPanel(surface, layout.left, layout.top, layout.frameWidth, layout.frameHeight);
  for (let i = 0; i < layout.items.length; i += 1) {
    const draw = i === selectedIndex ? drawSelectedText : drawText;
    draw(surface, layout.items[i] ?? '', layout.textLeft, layout.textTop + i * TEXT_LINE_HEIGHT);
  }
}

function padTextToWidth(text: string, width: number): string {
  let res = text;
  while (getTextWidth(res) < width) {
    res += ' ';
  }
  return res;
}
