import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';
import { moveSelectionWrap } from './menu-select';

const SETTINGS_ITEMS = ['地图信息', '穿墙模式', '原版伤害'] as const;
const FRAME_LEFT = 72;
const FRAME_TOP = 43;
const FRAME_WIDTH = 176;
const FRAME_HEIGHT = 84;
const LINE_GAP = 16;

type SettingsMenuItem = (typeof SETTINGS_ITEMS)[number];

export class ScreenGameSettings extends BaseScreen {
  private selectedIndex = 0;

  constructor(game: Game) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, FRAME_LEFT, FRAME_TOP, FRAME_WIDTH, FRAME_HEIGHT);
    TextRender.drawText(surface, '游戏设置', FRAME_LEFT + 8, FRAME_TOP + 8);
    for (let i = 0; i < SETTINGS_ITEMS.length; i += 1) {
      const item = SETTINGS_ITEMS[i]!;
      const y = FRAME_TOP + 28 + i * LINE_GAP;
      const draw = i === this.selectedIndex ? TextRender.drawSelText : TextRender.drawText;
      draw(surface, item, FRAME_LEFT + 8, y);
      const status = this.getStatusText(item);
      if (status) TextRender.drawText(surface, status, FRAME_LEFT + 104, y);
    }
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
        this.confirmSelection();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private moveSelection(step: number): void {
    this.selectedIndex = moveSelectionWrap(this.selectedIndex, step, SETTINGS_ITEMS.length);
  }

  private confirmSelection(): void {
    const item: SettingsMenuItem = SETTINGS_ITEMS[this.selectedIndex]!;
    switch (item) {
      case '地图信息':
        this.game.state.showPosition = !this.game.state.showPosition;
        this.showMessage(this.game.state.showPosition ? '地图信息已开启' : '地图信息已关闭');
        return;
      case '穿墙模式':
        this.game.state.allowWallWalking = !this.game.state.allowWallWalking;
        this.showMessage(this.game.state.allowWallWalking ? '穿墙模式已开启' : '穿墙模式已关闭');
        return;
      case '原版伤害':
        this.game.state.useOriginalDamageFormula = !this.game.state.useOriginalDamageFormula;
        this.showMessage(this.game.state.useOriginalDamageFormula ? '原版伤害已开启' : '原版伤害已关闭');
        return;
    }
  }

  private showMessage(text: string): void {
    const mainScene = this.game.mainScene;
    if (!mainScene) throw new Error('主场景不存在，无法显示设置消息');
    mainScene.showMessage(text, 1000);
  }

  private getStatusText(item: SettingsMenuItem): string {
    switch (item) {
      case '地图信息':
        return this.game.state.showPosition ? '[开启]' : '[关闭]';
      case '穿墙模式':
        return this.game.state.allowWallWalking ? '[开启]' : '[关闭]';
      case '原版伤害':
        return this.game.state.useOriginalDamageFormula ? '[开启]' : '[关闭]';
    }
  }
}
