import type { Player } from '@/characters';
import { GoodsMedicine, GoodsMedicinePermanent, GoodsMedicineLife } from '@/goods';
import type { Game } from '@/game/game';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { drawText } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/utils/key-code';
import { createLogger } from '@/utils/logger';
import { getPartyPlayers } from '../party-utils';
import { drawPlayerState } from '../properties/screen-actor-state';

export type MedicineGoods = GoodsMedicine | GoodsMedicineLife | GoodsMedicinePermanent;

const GOODS_LEFT = 5;
const GOODS_TOP = 10;
const COUNT_LEFT = 13;
const COUNT_TOP = 35;
const HEAD_LEFT = 5;
const HEAD_TOP = 60;
const logger = createLogger('菜单');

// 药物使用页保留在物品列表之上，方便连续给角色使用同一种物品。
export class ScreenTakeMedicine extends BaseScreen {
  private readonly players: Player[];
  private selectedPlayerIndex = 0;

  constructor(
    game: Game,
    private readonly medicine: MedicineGoods
  ) {
    super(game);
    this.players = getPartyPlayers(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    const player = this.players[this.selectedPlayerIndex];
    if (!player) return;
    drawPlayerState(surface, player, this.game.datLib.getImage(ResourceType.PIC, 2, 5));
    player.headImage?.draw(surface, 1, HEAD_LEFT, HEAD_TOP);
    const count = this.game.getGoodsCount(this.medicine.type, this.medicine.index);
    if (count > 0) {
      this.medicine.image?.draw(surface, 1, GOODS_LEFT, GOODS_TOP);
      drawText(surface, `${count}`, COUNT_LEFT, COUNT_TOP);
    }
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
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
    const next = this.selectedPlayerIndex + step;
    if (next < 0 || next >= this.players.length) return;
    this.selectedPlayerIndex = next;
  }

  private useMedicine(): void {
    if (this.game.getGoodsCount(this.medicine.type, this.medicine.index) <= 0) {
      logger.log('物品', `用药关闭: ${this.medicine.name} 数量不足`);
      this.close();
      return;
    }
    const target = this.players[this.selectedPlayerIndex];
    if (!target) throw new Error('药物使用页没有可用角色');
    const before = this.describeTargets(this.getTargetsPreview(target));
    const used =
      this.medicine instanceof GoodsMedicine && this.medicine.affectsAllTargets()
        ? this.useMedicineForAll(target)
        : this.medicine.eat(target);
    logger.log(
      '物品',
      `使用 ${this.medicine.name} 目标=${target.name} 生效=${used} 前=${before} 后=${this.describeTargets(this.getTargetsPreview(target))}`
    );
    if (used && !this.game.bag.consumeGoods(this.medicine.type, this.medicine.index, 1)) {
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

  private getTargetsPreview(selectedPlayer: Player): Player[] {
    return this.medicine instanceof GoodsMedicine && this.medicine.affectsAllTargets()
      ? this.players.filter(player => player.isAlive)
      : [selectedPlayer];
  }

  private describeTargets(players: readonly Player[]): string {
    return players
      .map(player => `${player.name}:${player.hp}/${player.totalHpMax},${player.mp}/${player.totalMpMax}`)
      .join('|');
  }
}
