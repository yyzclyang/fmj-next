import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResSrs } from '@/lib/res-srs';
import { ResourceType } from '@/lib/resource-utils';
import { Surface } from '@/rendering/surface';
import { COLOR_WHITE } from '@/rendering/color';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from '../base-screen';
import { ScreenViewType } from '../screen-view-type';

// 菜单底图来自 PIC 2:14，对应原版启动菜单画面。
const MENU_PIC_TYPE = 2;
const MENU_PIC_INDEX = 14;

// 启动菜单的 6 个选项共用一组 SRS 光标动画资源。
const SELECTOR_START_INDEX = 250;
const SELECTOR_END_INDEX = 255;

// 光标动画相对菜单底图左上角的位置偏移。
const FMJ_SELECTOR_OFFSET_X = -22;
const FMJ_SELECTOR_OFFSET_Y = 12;

// 主菜单直接复用原版菜单底图和光标动画。
export class ScreenMenu extends BaseScreen {
  private readonly menuImage: ResImage;
  private readonly selectors: ResSrs[];
  private readonly left: number;
  private readonly top: number;
  private currentSelection = 0;

  constructor(game: Game) {
    super(game);
    const image = this.game.datLib.getRes(ResourceType.PIC, MENU_PIC_TYPE, MENU_PIC_INDEX);
    if (!(image instanceof ResImage)) {
      throw new Error(`Missing menu background PIC ${MENU_PIC_TYPE}:${MENU_PIC_INDEX}`);
    }

    this.menuImage = image;
    this.selectors = this.loadSelectors();
    this.left = Math.floor((SCREEN_WIDTH - this.menuImage.width) / 2);
    this.top = Math.floor((SCREEN_HEIGHT - this.menuImage.height) / 2);
    this.selectors[0]?.start();
  }

  override update(delta: number): void {
    const selector = this.selectors[this.currentSelection];
    if (!selector) return;

    if (!selector.update(delta)) {
      selector.start();
    }
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.menuImage.draw(surface, 1, this.left, this.top);
    this.selectors[this.currentSelection]?.draw(
      surface,
      this.left + FMJ_SELECTOR_OFFSET_X,
      Math.floor(this.top / 2) + FMJ_SELECTOR_OFFSET_Y
    );
  }

  override onKeyDown(key: KeyCode): void {
    if (this.selectors.length === 0) return;

    if (key === KeyCode.Up) {
      this.moveSelection(-1);
      return;
    }

    if (key === KeyCode.Down) {
      this.moveSelection(1);
    }
  }

  override onKeyUp(key: KeyCode): void {
    if (key !== KeyCode.Enter) return;

    switch (this.currentSelection) {
      case 0:
        this.game.startNewGame();
        return;
      case 1:
        this.game.changeScreen(ScreenViewType.SCREEN_LOAD_GAME);
        return;
    }
  }

  private moveSelection(step: number): void {
    const count = this.selectors.length;
    if (count === 0) return;
    this.currentSelection = (this.currentSelection + step + count) % count;
    this.selectors[this.currentSelection]?.start();
  }

  private loadSelectors(): ResSrs[] {
    const selectors: ResSrs[] = [];

    for (let index = SELECTOR_START_INDEX; index <= SELECTOR_END_INDEX; index += 1) {
      const res = this.game.datLib.getRes(ResourceType.SRS, 1, index);
      if (!(res instanceof ResSrs)) continue;
      selectors.push(res);
    }

    return selectors;
  }
}
