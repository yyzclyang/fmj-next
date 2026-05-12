import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import type { ResSrs } from '@/lib/res-srs';
import { ResourceType } from '@/lib/resource-utils';
import type { Surface } from '@/rendering/surface';
import { COLOR_WHITE } from '@/rendering/color';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from '../base-screen';
import { SaveLoadOperation, ScreenSaveLoadGame } from '../main-game/menu/screen-save-load-game';

// 主菜单直接复用原版菜单底图和光标动画。
export class ScreenStartMenu extends BaseScreen {
  private readonly backgroundImage: ResImage;
  private readonly selectorAnimations: ResSrs[];
  private readonly left: number;
  private readonly top: number;
  private selectedIndex = 0;

  constructor(game: Game) {
    super(game);
    // 菜单底图来自 PIC 2:14，对应原版启动菜单画面。
    const image = this.game.datLib.getImage(ResourceType.PIC, 2, 14);
    if (!image) {
      throw new Error('Missing menu background PIC 2:14');
    }

    this.backgroundImage = image;
    this.selectorAnimations = this.loadSelectorAnimations();
    this.left = Math.floor((SCREEN_WIDTH - this.backgroundImage.width) / 2);
    this.top = Math.floor((SCREEN_HEIGHT - this.backgroundImage.height) / 2);
    this.selectorAnimations[0]?.start();
  }

  override update(delta: number): void {
    const selector = this.selectorAnimations[this.selectedIndex];
    if (!selector) return;

    if (!selector.update(delta)) {
      selector.start();
    }
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.backgroundImage.draw(surface, 1, this.left, this.top);
    const selectorOffset = this.game.engineOptions.mainMenuSelectorOffset ?? { x: 0, y: 24 };
    this.selectorAnimations[this.selectedIndex]?.draw(
      surface,
      this.left + selectorOffset.x,
      Math.floor(this.top / 2) + selectorOffset.y
    );
  }

  override onKey(key: KeyCode): boolean | undefined {
    if (this.selectorAnimations.length === 0) return;

    if (key === KeyCode.Up) {
      this.moveSelection(-1);
      return;
    }

    if (key === KeyCode.Down) {
      this.moveSelection(1);
      return;
    }

    if (key === KeyCode.Cancel) {
      // this.game.requestExit();
      return;
    }

    if (key !== KeyCode.Enter) return;

    switch (this.selectedIndex) {
      case 0:
        this.game.startNewGame();
        return;
      case 1:
        // 开始菜单读档和游戏内系统菜单共用同一套存档页。
        this.screenStack.push(new ScreenSaveLoadGame(this.game, SaveLoadOperation.Load));
        return;
      default:
        return;
    }
  }

  private moveSelection(step: number): void {
    const count = this.selectorAnimations.length;
    if (count === 0) return;
    this.selectedIndex = (this.selectedIndex + step + count) % count;
    this.selectorAnimations[this.selectedIndex]?.start();
  }

  private loadSelectorAnimations(): ResSrs[] {
    const selectorAnimations: ResSrs[] = [];

    for (let index = 250 /* 光标动画起始资源。 */; index <= 255 /* 光标动画结束资源。 */; index += 1) {
      const res = this.game.datLib.getSrs(1, index);
      if (!res) continue;
      selectorAnimations.push(res);
    }

    return selectorAnimations;
  }
}
