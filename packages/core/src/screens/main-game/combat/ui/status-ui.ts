import {
  STATUS_SLOT_POISON,
  STATUS_SLOT_DEFENSE,
  STATUS_SLOT_SEAL,
  STATUS_SLOT_ATTACK,
  STATUS_SLOT_CONFUSE,
  STATUS_SLOT_SLEEP,
  STATUS_SLOT_AGILITY,
} from '@/characters/status';
import type { Player } from '@/characters';
import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { drawInsetPanel } from '@/rendering/panel';
import type { Surface } from '@/rendering/surface';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/constants';
import { drawSmallNum } from './render-utils';

export interface CombatStatusUiState {
  readonly statusPlayerIndex: number;
  readonly currentPlayer: Player | null;
  readonly players: readonly Player[];
}

const STATUS_MARKERS = [
  { slot: STATUS_SLOT_ATTACK, ox: 9, isBool: false },
  { slot: STATUS_SLOT_DEFENSE, ox: 25, isBool: false },
  { slot: STATUS_SLOT_AGILITY, ox: 41, isBool: false },
  { slot: STATUS_SLOT_POISON, ox: 57, isBool: true },
  { slot: STATUS_SLOT_CONFUSE, ox: 73, isBool: true },
  { slot: STATUS_SLOT_SEAL, ox: 88, isBool: true },
  { slot: STATUS_SLOT_SLEEP, ox: 104, isBool: true },
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
      drawInsetPanel(surface, x, y, width, height);
    }
    player.headImage?.draw(surface, 1, x + 7, y + 4);
    drawSmallNum(surface, this.smallNumImage, player.hp, x + 50, y + 9);
    drawSmallNum(surface, this.smallNumImage, player.totalAttack, x + 50, y + 21);
    drawSmallNum(surface, this.smallNumImage, player.totalLuck, x + 87, y + 9);
    drawSmallNum(surface, this.smallNumImage, player.totalAgility, x + 87, y + 21);
    for (const marker of STATUS_MARKERS) {
      const status = player.activeStatuses.slots[marker.slot];
      const frame = getStatusMarkerFrame(status?.value ?? 0, marker.isBool);
      this.statusMarker?.draw(surface, frame, x + marker.ox, y + 48);
      drawSmallNum(surface, this.smallNumImage, status?.round ?? 0, x + marker.ox + 1, y + 57);
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
