import type { Player } from '@/characters';
import {
  type BaseGoods,
  GoodsDrama,
  GoodsEquipment,
  GoodsHiddenWeapon,
  GoodsMedicine,
  GoodsMedicinePermanent,
  GoodsMedicineLife,
  GoodsStimulant,
  GoodsTudun,
} from '@/goods';
import type { Game } from '@/game/game';
import { type BaseMagic, MagicRestore } from '@/magic';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';
import { drawVerticalMenu, moveSelectionWrap } from './menu-select';
import { ScreenActorState } from './screen-actor-state';
import { ScreenActorWearing } from './screen-actor-wearing';
import { ScreenChangeEquipment } from './screen-change-equipment';
import { ScreenDiscardGoods } from './screen-discard-goods';
import { ScreenGameSettings } from './screen-game-settings';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from './screen-goods-list';
import { ScreenMagic } from './screen-magic';
import { ScreenMenuGoods, type GoodsMenuItem } from './screen-menu-goods';
import { ScreenMenuProperties, type PropertyMenuItem } from './screen-menu-properties';
import { ScreenMenuSystem, type SystemMenuItem } from './screen-menu-system';
import { SaveLoadOperation, ScreenSaveLoadGame } from './screen-save-load-game';
import { getPartyPlayers, ScreenSelectActor } from './screen-select-actor';
import { ScreenSelectGoodsActor } from './screen-select-goods-actor';
import { ScreenTakeMedicine } from './screen-take-medicine';
import { ScreenUseMagic } from './screen-use-magic';

const IN_GAME_MENU_OPTIONS = ['属性', '魔法', '物品', '系统'] as const;
const MONEY_FRAME_LEFT = 9;
const MONEY_FRAME_TOP = 3;
const MONEY_FRAME_WIDTH = 93;
const MONEY_FRAME_HEIGHT = 22;
const MENU_LEFT = 9;
const MENU_TOP = 24;
const MENU_WIDTH = 38;
const MENU_HEIGHT = 70;
const MENU_TEXT_LEFT = 12;
const MENU_ITEM_TOP = 27;
const MENU_LINE_GAP = 16;

// 游戏内菜单是主场景的子 screen，后续二级菜单也从这里继续 push。
export class ScreenGameMainMenu extends BaseScreen {
  private currentSelection = 0;

  constructor(game: Game) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, MONEY_FRAME_LEFT, MONEY_FRAME_TOP, MONEY_FRAME_WIDTH, MONEY_FRAME_HEIGHT);
    TextRender.drawText(surface, `金钱:${this.game.state.money}`, MONEY_FRAME_LEFT + 3, MONEY_FRAME_TOP + 3);
    drawMenuFrame(surface, MENU_LEFT, MENU_TOP, MENU_WIDTH, MENU_HEIGHT);
    drawVerticalMenu(surface, {
      items: IN_GAME_MENU_OPTIONS,
      selectedIndex: this.currentSelection,
      left: MENU_TEXT_LEFT,
      top: MENU_ITEM_TOP,
      lineGap: MENU_LINE_GAP,
    });
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
    this.currentSelection = moveSelectionWrap(this.currentSelection, step, IN_GAME_MENU_OPTIONS.length);
  }

  private confirmSelection(): void {
    const option = IN_GAME_MENU_OPTIONS[this.currentSelection];
    switch (option) {
      case '属性':
        this.screenStack.push(
          new ScreenMenuProperties(this.game, {
            onConfirm: item => this.openPropertyScreen(item),
            onCancel: () => this.closeSubMenu(),
          })
        );
        return;
      case '魔法':
        this.confirmMagicSelection();
        return;
      case '物品':
        this.screenStack.push(
          new ScreenMenuGoods(this.game, {
            onConfirm: item => this.openGoodsList(item),
            onCancel: () => this.closeSubMenu(),
          })
        );
        return;
      case '系统':
        this.screenStack.push(
          new ScreenMenuSystem(this.game, {
            onConfirm: item => this.openSystemScreen(item),
            onCancel: () => this.closeSubMenu(),
          })
        );
        return;
    }
  }

  private confirmMagicSelection(): void {
    const players = getPartyPlayers(this.game);
    if (players.length > 1) {
      this.screenStack.push(
        new ScreenSelectActor(this.game, players, {
          onConfirm: player => this.openMagicScreenFromActorSelect(player),
          onCancel: () => this.closeSubMenu(),
        })
      );
      return;
    }
    const player = players[0];
    if (player) this.openMagicScreen(player);
  }

  private closeSubMenu(): void {
    this.screenStack.clear();
  }

  private openPropertyScreen(item: PropertyMenuItem): void {
    switch (item) {
      case '状态':
        this.openChildScreen(new ScreenActorState(this.game));
        return;
      case '穿戴':
        this.openChildScreen(new ScreenActorWearing(this.game));
        return;
    }
  }

  private openSystemScreen(item: SystemMenuItem): void {
    switch (item) {
      case '读入进度':
        this.openChildScreen(new ScreenSaveLoadGame(this.game, SaveLoadOperation.Load));
        return;
      case '存储进度': {
        const blockedMessage = this.game.getSaveBlockedMessage();
        if (blockedMessage) {
          this.showMenuMessage(blockedMessage);
          return;
        }
        this.openChildScreen(new ScreenSaveLoadGame(this.game, SaveLoadOperation.Save, () => this.close()));
        return;
      }
      case '游戏设置':
        this.openChildScreen(new ScreenGameSettings(this.game));
        return;
      case '结束游戏':
        this.finishMenuAction(`确认系统菜单:${item}`);
        return;
    }
  }

  private openMagicScreenFromActorSelect(player: Player): void {
    const current = this.screenStack.current;
    if (!(current instanceof ScreenSelectActor)) throw new Error('魔法角色选择页不是当前 Screen');
    this.screenStack.close(current);
    this.openMagicScreen(player);
  }

  private openMagicScreen(player: Player): void {
    const magics = player.getAllLearntMagics();
    if (magics.length === 0) return;
    this.screenStack.push(
      new ScreenMagic(this.game, magics, player.mp, {
        onConfirm: magic => this.confirmMagic(player, magic),
      })
    );
  }

  private confirmMagic(player: Player, magic: BaseMagic): void {
    if (magic instanceof MagicRestore) {
      this.screenStack.push(new ScreenUseMagic(this.game, magic, player));
      return;
    }
    this.showMenuMessage('此处无法使用!');
  }

  private openGoodsList(item: GoodsMenuItem): void {
    this.openChildScreen(
      new ScreenGoodsList(this.game, () => this.getGoodsMenuList(item), ScreenGoodsListMode.Use, {
        onConfirm: selected => this.confirmGoodsItem(item, selected),
      })
    );
  }

  private getGoodsMenuList(item: GoodsMenuItem): ScreenGoodsListItem[] {
    return item === '使用'
      ? this.game.bag.goodsList
      : item === '装备'
        ? this.game.bag.equipList
        : this.game.bag.allGoodsList;
  }

  private confirmGoodsItem(item: GoodsMenuItem, selected: ScreenGoodsListItem): void {
    switch (item) {
      case '使用':
        this.useGoods(selected.goods);
        return;
      case '装备':
        this.equipGoods(selected.goods);
        return;
      case '丢弃':
        this.screenStack.push(new ScreenDiscardGoods(this.game, selected.goods));
        return;
    }
  }

  private useGoods(goods: BaseGoods): void {
    if (goods instanceof GoodsHiddenWeapon || goods instanceof GoodsStimulant) {
      this.showMenuMessage('战斗中才能使用!');
      return;
    }
    if (goods instanceof GoodsTudun) {
      this.useTudunGoods();
      return;
    }
    if (goods instanceof GoodsDrama) {
      this.useDramaGoods(goods);
      return;
    }
    if (isMedicineGoods(goods)) {
      this.screenStack.push(new ScreenTakeMedicine(this.game, goods));
      return;
    }
    this.showMenuMessage('当前无法使用!');
  }

  private equipGoods(goods: BaseGoods): void {
    if (!(goods instanceof GoodsEquipment)) throw new Error('物品菜单选择了非装备物品');
    // Kotlin 版物品装备分支按可装备人数决定是否弹出角色选择。
    const players = getPartyPlayers(this.game).filter(player => goods.canPlayerUse(player.index));
    if (players.length === 0) {
      this.showMenuMessage('不能装备!');
      return;
    }
    if (players.length === 1) {
      this.openGoodsEquipmentScreen(players[0]!, goods);
      return;
    }
    this.screenStack.push(
      new ScreenSelectGoodsActor(this.game, players, {
        onConfirm: player => this.confirmGoodsEquipmentActor(player, goods),
      })
    );
  }

  private confirmGoodsEquipmentActor(player: Player, goods: GoodsEquipment): void {
    if (player.hasEquipment(goods.type, goods.index)) {
      this.showMenuMessage('已装备!');
      return;
    }
    const current = this.screenStack.current;
    if (!(current instanceof ScreenSelectGoodsActor)) throw new Error('装备角色选择页不是当前 Screen');
    this.screenStack.close(current);
    this.screenStack.push(new ScreenChangeEquipment(this.game, player, goods));
  }

  private openGoodsEquipmentScreen(player: Player, goods: GoodsEquipment): void {
    if (player.hasEquipment(goods.type, goods.index)) {
      this.showMenuMessage('已装备!');
      return;
    }
    this.screenStack.push(new ScreenChangeEquipment(this.game, player, goods));
  }

  private useDramaGoods(goods: GoodsDrama): void {
    const gut = this.game.datLib.getGut(255, goods.index);
    if (!gut) {
      this.showMenuMessage('当前无法使用!');
      return;
    }
    const runtime = this.game.mainSceneRuntime;
    if (!runtime) throw new Error('主场景运行时不存在，无法使用剧情物品');
    this.close();
    runtime.callChapter(255, goods.index);
  }

  private useTudunGoods(): void {
    const runtime = this.game.mainSceneRuntime;
    if (!runtime) throw new Error('主场景运行时不存在，无法使用土遁');
    if (!runtime.triggerEvent(255)) {
      this.showMenuMessage('当前无法使用!');
      return;
    }
    this.close();
  }

  private showMenuMessage(text: string): void {
    const mainScene = this.game.mainScene;
    if (!mainScene) throw new Error('主场景不存在，无法显示菜单消息');
    mainScene.showMessage(text, 1000);
  }

  private openChildScreen(screen: BaseScreen): void {
    this.screenStack.clear();
    this.screenStack.push(screen);
  }

  private finishMenuAction(message: string): void {
    console.log(message);
    this.close();
  }
}

function isMedicineGoods(goods: BaseGoods): goods is GoodsMedicine | GoodsMedicineLife | GoodsMedicinePermanent {
  return goods instanceof GoodsMedicine || goods instanceof GoodsMedicineLife || goods instanceof GoodsMedicinePermanent;
}
