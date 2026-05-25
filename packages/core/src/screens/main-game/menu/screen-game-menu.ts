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
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { drawText } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/utils/key-code';
import { createLogger } from '@/utils/logger';
import { drawVerticalMenu, moveSelectionWrap } from './menu-select';
import { ScreenActorEquipment } from './properties/screen-actor-equipment';
import { ScreenActorState } from './properties/screen-actor-state';
import { ScreenChangeEquipment } from './goods/screen-change-equipment';
import { ScreenDiscardGoods } from './goods/screen-discard-goods';
import { ScreenGameSettings } from './system/screen-game-settings';
import { ScreenGoodsList, ScreenGoodsListMode, type ScreenGoodsListItem } from './goods/screen-goods-list';
import { ScreenMagicList } from './magic/screen-magic-list';
import { ScreenMenuGoods, type GoodsMenuItem } from './goods/screen-menu-goods';
import { ScreenMenuProperties, type PropertyMenuItem } from './properties/screen-menu-properties';
import { ScreenMenuSystem, type SystemMenuItem } from './system/screen-menu-system';
import { SaveLoadOperation, ScreenSaveLoadGame } from './system/screen-save-load-game';
import { getPartyPlayers } from './party-utils';
import { ScreenSelectActor } from './magic/screen-select-actor';
import { ScreenSelectGoodsActor } from './goods/screen-select-goods-actor';
import { ScreenTakeMedicine } from './goods/screen-take-medicine';
import { ScreenUseMagic } from './magic/screen-use-magic';

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
const logger = createLogger('菜单');

// 游戏内菜单是主场景的子 screen，后续二级菜单也从这里继续 push。
export class ScreenGameMenu extends BaseScreen {
  private selectedIndex = 0;

  constructor(game: Game) {
    super(game);
  }

  override draw(surface: Surface): void {
    drawInsetPanel(surface, MONEY_FRAME_LEFT, MONEY_FRAME_TOP, MONEY_FRAME_WIDTH, MONEY_FRAME_HEIGHT);
    drawText(surface, `金钱:${this.game.state.money}`, MONEY_FRAME_LEFT + 3, MONEY_FRAME_TOP + 3);
    drawInsetPanel(surface, MENU_LEFT, MENU_TOP, MENU_WIDTH, MENU_HEIGHT);
    drawVerticalMenu(surface, {
      items: IN_GAME_MENU_OPTIONS,
      selectedIndex: this.selectedIndex,
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
    this.selectedIndex = moveSelectionWrap(this.selectedIndex, step, IN_GAME_MENU_OPTIONS.length);
  }

  private confirmSelection(): void {
    const option = IN_GAME_MENU_OPTIONS[this.selectedIndex];
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
    if (player) {
      this.openMagicScreen(player);
      return;
    }
    logger.warn('魔法', '没有可用队伍角色');
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
        this.openChildScreen(new ScreenActorEquipment(this.game));
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
          logger.warn('系统', `存档被阻止: ${blockedMessage}`);
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
        this.game.returnToMenu();
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
    const magics = player.getAllLearnedMagics();
    if (magics.length === 0) {
      logger.log('魔法', `${player.name} 没有可用法术`);
      return;
    }
    this.screenStack.push(
      new ScreenMagicList(this.game, magics, player.mp, {
        onConfirm: magic => this.confirmMagic(player, magic),
      })
    );
  }

  private confirmMagic(player: Player, magic: BaseMagic): void {
    if (magic instanceof MagicRestore) {
      this.screenStack.push(new ScreenUseMagic(this.game, magic, player));
      return;
    }
    logger.log('魔法', `${player.name} ${magic.name} 此处无法使用`);
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
      logger.log('物品', `${goods.name} 只能在战斗中使用`);
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
    logger.log('物品', `${goods.name} 当前无法使用`);
    this.showMenuMessage('当前无法使用!');
  }

  private equipGoods(goods: BaseGoods): void {
    if (!(goods instanceof GoodsEquipment)) throw new Error('物品菜单选择了非装备物品');
    // Kotlin 版物品装备分支按可装备人数决定是否弹出角色选择。
    const players = getPartyPlayers(this.game).filter(player => goods.canPlayerUse(player.index));
    if (players.length === 0) {
      logger.log('装备', `${goods.name} 没有可装备角色`);
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
      logger.log('装备', `${player.name} 已装备 ${goods.name}`);
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
      logger.log('装备', `${player.name} 已装备 ${goods.name}`);
      this.showMenuMessage('已装备!');
      return;
    }
    this.screenStack.push(new ScreenChangeEquipment(this.game, player, goods));
  }

  private useDramaGoods(goods: GoodsDrama): void {
    const gut = this.game.datLib.getGut(255, goods.index);
    if (!gut) {
      logger.warn('物品', `剧情物品缺少 GUT 255:${goods.index}`);
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
      logger.log('物品', '土遁事件 255 未触发');
      this.showMenuMessage('当前无法使用!');
      return;
    }
    logger.log('物品', '土遁事件 255 已触发');
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
}

function isMedicineGoods(goods: BaseGoods): goods is GoodsMedicine | GoodsMedicineLife | GoodsMedicinePermanent {
  return (
    goods instanceof GoodsMedicine || goods instanceof GoodsMedicineLife || goods instanceof GoodsMedicinePermanent
  );
}
