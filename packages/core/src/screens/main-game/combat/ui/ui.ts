import type { ActionIconIndex, CombatPhase } from '@/combat/combat-actions';
import type { Player, Monster } from '@/characters';
import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { drawVerticalMenu } from '@/screens/main-game/menu/menu-select';
import { drawMenuFrame, getTextWidth } from '@/screens/main-game/ui-utils';
import { COMBAT_GOODS_ITEMS, MISC_ITEMS } from './menu-items';
import { drawSmallNum } from './render-utils';
import { CombatStatusUi } from './status-ui';

const MENU_ICON_LEFT = 20;
const MENU_ICON_BOTTOM = 20;
const PLAYER_INFO_LEFT = 129;
const PLAYER_INFO_TOP = 99;
const PLAYER_HEAD_LEFT = 130;
const PLAYER_HEAD_TOP = 96;
const MISC_LEFT = 9;
const MISC_TOP = 4;
const MISC_WIDTH = 38;
const MISC_PADDING = 3;
const GOODS_MENU_LEFT = 29;
const GOODS_MENU_TOP = 14;
const GOODS_MENU_WIDTH = 38;
const GOODS_MENU_PADDING = 3;
const LINE_GAP = 16;

export interface CombatUiState {
  readonly phase: CombatPhase;
  readonly actionIconIndex: ActionIconIndex;
  readonly miscIndex: number;
  readonly combatGoodsIndex: number;
  readonly statusPlayerIndex: number;
  readonly currentPlayer: Player | null;
  readonly currentMonster: Monster | null;
  readonly currentTargetPlayer: Player | null;
  readonly players: readonly Player[];
}

// CombatUi 只负责按当前状态绘制，不持有或改变战斗流程状态。
export class CombatUi {
  private readonly menuIcon: ResImage | null;
  private readonly playerInfoBg: ResImage | null;
  private readonly playerIndicator: ResImage | null;
  private readonly monsterIndicator: ResImage | null;
  private readonly smallNumImage: ResImage | null;
  private readonly statusUi: CombatStatusUi;

  constructor(game: Game) {
    this.menuIcon = game.datLib.getImage(ResourceType.PIC, 2, 1);
    this.playerInfoBg = game.datLib.getImage(ResourceType.PIC, 2, 2);
    this.playerIndicator = game.datLib.getImage(ResourceType.PIC, 2, 4);
    this.monsterIndicator = game.datLib.getImage(ResourceType.PIC, 2, 3);
    this.smallNumImage = game.datLib.getImage(ResourceType.PIC, 2, 5);
    this.statusUi = new CombatStatusUi(game);
  }

  draw(surface: Surface, state: CombatUiState): void {
    this.drawActionIcon(surface, state);
    this.drawPlayerInfo(surface, state);
    this.drawPlayerIndicator(surface, state);
    if (state.phase === 'selectTarget') {
      this.drawTargetIndicator(surface, state);
    } else if (state.phase === 'selectPlayerTarget') {
      this.drawPlayerTargetIndicator(surface, state);
    } else if (state.phase === 'miscMenu') {
      this.drawMiscMenu(surface, state);
    } else if (state.phase === 'goodsMenu') {
      this.drawMiscMenu(surface, state);
      this.drawCombatGoodsMenu(surface, state);
    } else if (state.phase === 'statusMenu') {
      this.statusUi.draw(surface, state);
    }
  }

  drawMessage(surface: Surface, message: string): void {
    const width = getTextWidth(message) + 8;
    const left = Math.trunc((SCREEN_WIDTH - width) / 2);
    drawMenuFrame(surface, left, 18, width, 24);
    TextRender.drawText(surface, message, left + 4, 22);
  }

  private drawActionIcon(surface: Surface, state: CombatUiState): void {
    const icon = this.menuIcon;
    if (icon && icon.width > 0 && icon.height > 0) {
      icon.draw(surface, state.actionIconIndex, MENU_ICON_LEFT, SCREEN_HEIGHT - icon.height - MENU_ICON_BOTTOM);
      return;
    }
    drawMenuFrame(surface, 18, SCREEN_HEIGHT - 48, 36, 28);
    TextRender.drawText(surface, ['攻', '法', '杂', '合'][state.actionIconIndex - 1]!, 28, SCREEN_HEIGHT - 42);
  }

  private drawPlayerInfo(surface: Surface, state: CombatUiState): void {
    const player = state.currentPlayer;
    if (!player) return;
    if (this.playerInfoBg) {
      this.playerInfoBg.draw(surface, 1, PLAYER_INFO_LEFT, PLAYER_INFO_TOP);
    } else {
      drawMenuFrame(surface, PLAYER_INFO_LEFT, PLAYER_INFO_TOP, 72, 36);
    }
    player.headImage?.draw(surface, 1, PLAYER_HEAD_LEFT, PLAYER_HEAD_TOP);
    drawSmallNum(surface, this.smallNumImage, player.hp, PLAYER_INFO_LEFT + 30, PLAYER_INFO_TOP + 6);
    drawSmallNum(surface, this.smallNumImage, player.maxHp, PLAYER_INFO_LEFT + 59, PLAYER_INFO_TOP + 6);
    drawSmallNum(surface, this.smallNumImage, player.mp, PLAYER_INFO_LEFT + 30, PLAYER_INFO_TOP + 17);
    drawSmallNum(surface, this.smallNumImage, player.maxMp, PLAYER_INFO_LEFT + 59, PLAYER_INFO_TOP + 17);
  }

  private drawPlayerIndicator(surface: Surface, state: CombatUiState): void {
    const sprite = state.currentPlayer?.fightingSprite;
    if (!sprite) return;
    this.drawIndicator(surface, this.playerIndicator, sprite.combatX, sprite.combatY - 22);
  }

  private drawTargetIndicator(surface: Surface, state: CombatUiState): void {
    const sprite = state.currentMonster?.fightingSprite;
    if (!sprite) return;
    this.drawIndicator(surface, this.monsterIndicator, sprite.combatX, sprite.combatY - Math.trunc(sprite.height / 2) - 8);
  }

  private drawPlayerTargetIndicator(surface: Surface, state: CombatUiState): void {
    const sprite = state.currentTargetPlayer?.fightingSprite;
    if (!sprite) return;
    this.drawIndicator(surface, this.playerIndicator, sprite.combatX, sprite.combatY - 22, 3);
  }

  private drawIndicator(surface: Surface, image: ResImage | null, centerX: number, centerY: number, frame = 1): void {
    if (image && image.width > 0 && image.height > 0) {
      image.draw(surface, frame, Math.trunc(centerX - image.width / 2), Math.trunc(centerY - image.height / 2));
      return;
    }
    surface.fillRect(centerX - 4, centerY - 4, 8, 8, COLOR_WHITE);
    surface.fillRect(centerX - 3, centerY - 3, 6, 6, COLOR_BLACK);
  }

  private drawMiscMenu(surface: Surface, state: CombatUiState): void {
    drawMenuFrame(surface, MISC_LEFT, MISC_TOP, MISC_WIDTH, MISC_ITEMS.length * LINE_GAP + MISC_PADDING * 2);
    for (let i = 0; i < MISC_ITEMS.length; i += 1) {
      const draw = i === state.miscIndex ? TextRender.drawSelText : TextRender.drawText;
      draw(surface, MISC_ITEMS[i]!, MISC_LEFT + MISC_PADDING, MISC_TOP + MISC_PADDING + i * LINE_GAP);
    }
  }

  private drawCombatGoodsMenu(surface: Surface, state: CombatUiState): void {
    drawMenuFrame(
      surface,
      GOODS_MENU_LEFT,
      GOODS_MENU_TOP,
      GOODS_MENU_WIDTH,
      COMBAT_GOODS_ITEMS.length * LINE_GAP + GOODS_MENU_PADDING * 2
    );
    drawVerticalMenu(surface, {
      items: COMBAT_GOODS_ITEMS,
      selectedIndex: state.combatGoodsIndex,
      left: GOODS_MENU_LEFT + GOODS_MENU_PADDING,
      top: GOODS_MENU_TOP + GOODS_MENU_PADDING,
      lineGap: LINE_GAP,
    });
  }
}
