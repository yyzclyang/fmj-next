import type { Player } from '@/characters';
import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawMenuFrame } from '../ui-utils';
import { drawVerticalMenu, moveSelectionWrap } from './menu-select';

const LINE_GAP = 16;
const TEXT_PADDING = 3;

// 多角色使用魔法前先选角色；单角色场景由主菜单直接确认。
export class ScreenSelectActor extends BaseScreen {
  private readonly players: Player[];
  private selectedIndex = 0;

  constructor(game: Game) {
    super(game);
    this.players = getPartyPlayers(game);
  }

  override draw(surface: Surface): void {
    drawMenuFrame(surface, 39, 29, 86, this.players.length * LINE_GAP + TEXT_PADDING * 2);
    drawVerticalMenu(surface, {
      items: this.players.map(player => player.name),
      selectedIndex: this.selectedIndex,
      left: 42,
      top: 32,
      lineGap: LINE_GAP,
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
        this.confirm();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private moveSelection(step: number): void {
    this.selectedIndex = moveSelectionWrap(this.selectedIndex, step, this.players.length);
  }

  private confirm(): void {
    const player = this.players[this.selectedIndex];
    this.close();
    console.log(`确认魔法角色:${player?.name ?? '无角色'}`);
  }
}

export function getPartyPlayers(game: Game): Player[] {
  return game.state.partyActorIds.map(id => game.getPlayer(id)).filter((player): player is Player => player != null);
}
