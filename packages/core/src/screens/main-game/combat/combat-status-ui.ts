import type { Player } from '@/characters';
import {
  BUFF_INDEX_DU,
  BUFF_INDEX_FANG,
  BUFF_INDEX_FENG,
  BUFF_INDEX_GONG,
  BUFF_INDEX_LUAN,
  BUFF_INDEX_MIAN,
  BUFF_INDEX_SU,
} from '@/combat/combat-constants';
import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import type { Surface } from '@/rendering/surface';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { drawMenuFrame } from '../ui-utils';
import { drawSmallNum } from './combat-render-utils';

export interface CombatStatusUiState {
  readonly statusPlayerIndex: number;
  readonly currentPlayer: Player | null;
  readonly players: readonly Player[];
}

const STATUS_MARKERS = [
  { index: BUFF_INDEX_GONG, ox: 9, isBool: false },
  { index: BUFF_INDEX_FANG, ox: 25, isBool: false },
  { index: BUFF_INDEX_SU, ox: 41, isBool: false },
  { index: BUFF_INDEX_DU, ox: 57, isBool: true },
  { index: BUFF_INDEX_LUAN, ox: 73, isBool: true },
  { index: BUFF_INDEX_FENG, ox: 88, isBool: true },
  { index: BUFF_INDEX_MIAN, ox: 104, isBool: true },
] as const;

// 状态面板使用独立资源和坐标，和主战斗菜单分开维护。
export class CombatStatusUi {
  private readonly smallNumImage: ResImage | null;
  private readonly statusBg: ResImage | null;
  private readonly statusMarker: ResImage | null;

  constructor(game: Game) {
    this.smallNumImage = game.datLib.getImage(ResourceType.PIC, 2, 5);
    this.statusBg = game.datLib.getImage(ResourceType.PIC, 2, 11);
    this.statusMarker = game.datLib.getImage(ResourceType.PIC, 2, 12);
  }

  draw(surface: Surface, state: CombatStatusUiState): void {
    const player = state.players[state.statusPlayerIndex] ?? state.currentPlayer;
    if (!player) return;
    const bg = this.statusBg;
    const width = bg?.width && bg.width > 0 ? bg.width : 128;
    const height = bg?.height && bg.height > 0 ? bg.height : 80;
    const x = Math.trunc((SCREEN_WIDTH - width) / 2);
    const y = Math.trunc((SCREEN_HEIGHT - height) / 2);
    if (bg) {
      bg.draw(surface, 1, x, y);
    } else {
      drawMenuFrame(surface, x, y, width, height);
    }
    player.headImage?.draw(surface, 1, x + 7, y + 4);
    drawSmallNum(surface, this.smallNumImage, player.hp, x + 50, y + 9);
    drawSmallNum(surface, this.smallNumImage, player.attack, x + 50, y + 21);
    drawSmallNum(surface, this.smallNumImage, player.luck, x + 87, y + 9);
    drawSmallNum(surface, this.smallNumImage, player.agility, x + 87, y + 21);
    for (const marker of STATUS_MARKERS) {
      const buff = player.debuff.buffs[marker.index];
      const frame = getStatusMarkerFrame(buff?.value ?? 0, marker.isBool);
      this.statusMarker?.draw(surface, frame, x + marker.ox, y + 48);
      drawSmallNum(surface, this.smallNumImage, buff?.round ?? 0, x + marker.ox + 1, y + 57);
    }
  }
}

function getStatusMarkerFrame(value: number, isBool: boolean): number {
  if (!isBool && value > 0) return 1;
  if (!isBool && value < 0) return 2;
  if (isBool && value === 0) return 3;
  if (isBool && value !== 0) return 4;
  return 5;
}
