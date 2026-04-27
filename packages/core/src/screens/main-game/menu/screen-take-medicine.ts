import type { Player } from '@/characters';
import { GoodsMedicine, GoodsMedicineChg4Ever, GoodsMedicineLife } from '@/goods';
import type { Game } from '@/game/game';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { drawPlayerState } from './screen-actor-state';
import { getPartyPlayers } from './screen-select-actor';

export type MedicineGoods = GoodsMedicine | GoodsMedicineLife | GoodsMedicineChg4Ever;

const GOODS_LEFT = 5;
const GOODS_TOP = 10;
const COUNT_LEFT = 13;
const COUNT_TOP = 35;
const HEAD_LEFT = 5;
const HEAD_TOP = 60;

// 药物使用页保留在物品列表之上，方便连续给角色使用同一种物品。
export class ScreenTakeMedicine extends BaseScreen {
  private readonly players: Player[];
  private page = 0;
  private actorIndex = 0;

  constructor(
    game: Game,
    private readonly medicine: MedicineGoods
  ) {
    super(game);
    this.players = getPartyPlayers(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const player = this.players[this.actorIndex];
    if (!player) return;
    drawPlayerState(surface, player, this.page, this.game.datLib.getImage(ResourceType.PIC, 2, 5));
    player.headImage?.draw(surface, 1, HEAD_LEFT, HEAD_TOP);
    const count = this.game.getGoodsNum(this.medicine.type, this.medicine.index);
    if (count > 0) {
      this.medicine.image?.draw(surface, 1, GOODS_LEFT, GOODS_TOP);
      TextRender.drawText(surface, `${count}`, COUNT_LEFT, COUNT_TOP);
    }
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.PageDown:
        this.page = 1;
        return;
      case KeyCode.PageUp:
        this.page = 0;
        return;
      case KeyCode.Left:
        this.moveActor(-1);
        return;
      case KeyCode.Right:
        this.moveActor(1);
        return;
      case KeyCode.Enter:
        this.useMedicine();
        return;
      case KeyCode.Cancel:
        this.close();
        return;
    }
  }

  private moveActor(step: number): void {
    const next = this.actorIndex + step;
    if (next < 0 || next >= this.players.length) return;
    this.actorIndex = next;
  }

  private useMedicine(): void {
    if (this.game.getGoodsNum(this.medicine.type, this.medicine.index) <= 0) {
      this.close();
      return;
    }
    const target = this.players[this.actorIndex];
    if (!target) throw new Error('药物使用页没有可用角色');
    const used = this.medicine instanceof GoodsMedicine && this.medicine.effectAll()
      ? this.useMedicineForAll(target)
      : this.medicine.eat(target);
    if (used && !this.game.bag.useGoodsNum(this.medicine.type, this.medicine.index, 1)) {
      throw new Error('药物使用时背包数量不足');
    }
  }

  private useMedicineForAll(selectedPlayer: Player): boolean {
    if (!selectedPlayer.isAlive) return false;
    for (let i = this.players.length - 1; i >= 0; i -= 1) {
      const player = this.players[i];
      if (player) this.medicine.eat(player);
    }
    return true;
  }
}
