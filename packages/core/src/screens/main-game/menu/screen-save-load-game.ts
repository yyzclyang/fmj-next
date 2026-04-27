import type { Game } from '@/game/game';
import { SAVE_SLOT_COUNT, type SaveSlotSummary } from '@/game/save-game';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame, getTextWidth } from '../ui-utils';
import { moveSelectionWrap } from './menu-select';

export const SaveLoadOperation = {
  Save: 'save',
  Load: 'load',
} as const;

export type SaveLoadOperation = (typeof SaveLoadOperation)[keyof typeof SaveLoadOperation];

const TITLE_LEFT = 20;
const TITLE_TOP = 10;
const TITLE_HEIGHT = 25;
const SLOT_LEFT = 20;
const SLOT_TOP = 40;
const SLOT_HEIGHT = 25;
const SLOT_WIDTH = SCREEN_WIDTH - 40;
const SLOT_NUMBER_LEFT = 25;
const HEAD_LEFT = 50;
const HEAD_GAP = 20;
const SLOT_TEXT_GAP = 10;
const SLOT_TEXT_TOP_OFFSET = 8;
const HEAD_TOP_OFFSET = 4;
const EMPTY_SAVE_TEXT = '空档案    ';
const MESSAGE_BOX_LEFT = 27;
const MESSAGE_BOX_TOP = 15;
const MESSAGE_BOX_WIDTH = 111;
const MESSAGE_BOX_HEIGHT = 67;
const MESSAGE_TEXT_LEFT = 33;
const MESSAGE_TEXT_TOP = 23;
const YES_BOX_LEFT = 43;
const NO_BOX_LEFT = 91;
const OPTION_BOX_TOP = 51;
const OPTION_BOX_WIDTH = 28;
const OPTION_BOX_HEIGHT = 20;
const YES_TEXT_LEFT = 45;
const NO_TEXT_LEFT = 93;
const OPTION_TEXT_TOP = 53;

// 存读档页先接轻量 GameState 存档，完整脚本/NPC 状态后续补齐。
export class ScreenSaveLoadGame extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly operation: SaveLoadOperation,
    private readonly onComplete?: () => void
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.drawTitle(surface);
    this.drawSlots(surface);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Up:
        this.moveSelection(-1);
        return;
      case KeyCode.Down:
        this.moveSelection(1);
        return;
      case KeyCode.Enter:
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private moveSelection(step: number): void {
    this.selectedIndex = moveSelectionWrap(this.selectedIndex, step, SAVE_SLOT_COUNT);
  }

  private drawTitle(surface: Surface): void {
    drawMenuFrame(surface, TITLE_LEFT, TITLE_TOP, SLOT_WIDTH, TITLE_HEIGHT);
    TextRender.drawText(surface, this.titleText, TITLE_LEFT + 5, TITLE_TOP + 8);
  }

  private drawSlots(surface: Surface): void {
    for (let i = 0; i < SAVE_SLOT_COUNT; i += 1) {
      const top = SLOT_TOP + i * SLOT_HEIGHT;
      const summary = this.game.getSaveSlotSummary(i);
      drawMenuFrame(surface, SLOT_LEFT, top, SLOT_WIDTH, SLOT_HEIGHT);
      TextRender.drawText(surface, `${i + 1}.`, SLOT_NUMBER_LEFT, top + SLOT_TEXT_TOP_OFFSET);
      const draw = i === this.selectedIndex ? TextRender.drawSelText : TextRender.drawText;
      this.drawHeads(surface, summary, top);
      draw(surface, this.getSlotText(summary), this.getSlotTextLeft(summary), top + SLOT_TEXT_TOP_OFFSET);
    }
  }

  private confirm(): void {
    if (this.operation === SaveLoadOperation.Load) {
      if (!this.game.loadSlot(this.selectedIndex)) return;
      console.log(`读取进度:${this.selectedIndex + 1}`);
      return;
    }
    if (this.game.getSaveSlotSummary(this.selectedIndex)) {
      this.screenStack.push(new ScreenOverwriteSaveConfirm(this.game, () => this.saveSelectedSlot()));
      return;
    }
    this.saveSelectedSlot();
  }

  private saveSelectedSlot(): void {
    this.game.saveSlot(this.selectedIndex);
    this.onComplete?.();
    this.showMessage('已存档');
    console.log(`保存进度:${this.selectedIndex + 1}`);
  }

  private get titleText(): string {
    return this.operation === SaveLoadOperation.Load ? '读取进度' : '保存进度';
  }

  private getSlotText(summary: SaveSlotSummary | null): string {
    if (!summary) return EMPTY_SAVE_TEXT;
    const sceneName = summary.sceneName || '未命名';
    return fitText(sceneName, SCREEN_WIDTH - this.getSlotTextLeft(summary) - 25);
  }

  private getSlotTextLeft(summary: SaveSlotSummary | null): number {
    return summary ? HEAD_LEFT + summary.partyActorIds.length * HEAD_GAP + SLOT_TEXT_GAP : HEAD_LEFT;
  }

  private drawHeads(surface: Surface, summary: SaveSlotSummary | null, top: number): void {
    if (!summary) return;
    for (let i = 0; i < summary.partyActorIds.length; i += 1) {
      const image = this.game.datLib.getImage(ResourceType.PIC, 1, summary.partyActorIds[i] ?? 0);
      image?.draw(surface, 7, HEAD_LEFT + HEAD_GAP * i, top + HEAD_TOP_OFFSET);
    }
  }

  private showMessage(text: string): void {
    const mainScene = this.game.mainScene;
    if (!mainScene) throw new Error('主场景不存在，无法显示存档消息');
    mainScene.showMessage(text, 1000);
  }
}

class ScreenOverwriteSaveConfirm extends BaseScreen {
  private selectedIndex = 0;

  constructor(
    game: Game,
    private readonly onConfirm: () => void
  ) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, MESSAGE_BOX_LEFT, MESSAGE_BOX_TOP, MESSAGE_BOX_WIDTH, MESSAGE_BOX_HEIGHT);
    TextRender.drawText(surface, '覆盖原进度?', MESSAGE_TEXT_LEFT, MESSAGE_TEXT_TOP);
    drawMenuFrame(surface, YES_BOX_LEFT, OPTION_BOX_TOP, OPTION_BOX_WIDTH, OPTION_BOX_HEIGHT);
    drawMenuFrame(surface, NO_BOX_LEFT, OPTION_BOX_TOP, OPTION_BOX_WIDTH, OPTION_BOX_HEIGHT);
    const drawYes = this.selectedIndex === 0 ? TextRender.drawSelText : TextRender.drawText;
    const drawNo = this.selectedIndex === 1 ? TextRender.drawSelText : TextRender.drawText;
    drawYes(surface, '是 ', YES_TEXT_LEFT, OPTION_TEXT_TOP);
    drawNo(surface, '否 ', NO_TEXT_LEFT, OPTION_TEXT_TOP);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Left:
      case KeyCode.Right:
        this.selectedIndex = 1 - this.selectedIndex;
        return;
      case KeyCode.Enter:
        this.close();
        if (this.selectedIndex === 0) this.onConfirm();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }
}

function fitText(text: string, maxWidth: number): string {
  if (getTextWidth(text) <= maxWidth) return text;
  let res = '';
  for (const char of text) {
    if (getTextWidth(`${res}${char}...`) > maxWidth) return `${res}...`;
    res += char;
  }
  return res;
}
