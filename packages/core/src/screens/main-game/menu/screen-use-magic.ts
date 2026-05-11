import type { Player } from '@/characters';
import { applyRestoreMagic } from '@/combat/combat-effects';
import type { Game } from '@/game/game';
import { MagicRestore } from '@/magic';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_WHITE } from '@/rendering/color';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { BaseScreen } from '@/screens/base-screen';
import { KeyCode } from '@/shared/key-code';
import { wrapTextBlock } from '../ui-utils';
import { drawPlayerState } from './screen-actor-state';
import { getPartyPlayers } from './screen-select-actor';

const NAME_LEFT = 4;
const NAME_TOP = 4;
const NAME_WIDTH = 33;
const HEAD_LEFT = 5;
const HEAD_TOP = 60;

// 场景菜单只允许恢复型魔法，目标选择页沿用角色状态页显示。
export class ScreenUseMagic extends BaseScreen {
  private readonly players: Player[];
  private page = 0;
  private actorIndex = 0;

  constructor(
    game: Game,
    private readonly magic: MagicRestore,
    private readonly caster: Player
  ) {
    super(game);
    this.players = getPartyPlayers(game);
  }

  override draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.drawMagicName(surface);
    const actor = this.players[this.actorIndex];
    if (!actor) return;
    drawPlayerState(surface, actor, this.page, this.game.datLib.getImage(ResourceType.PIC, 2, 5));
    actor.headImage?.draw(surface, 1, HEAD_LEFT, HEAD_TOP);
  }

  override onKey(key: KeyCode): boolean | undefined {
    switch (key) {
      case KeyCode.Left:
        this.moveActor(-1);
        return;
      case KeyCode.Right:
        this.moveActor(1);
        return;
      case KeyCode.PageUp:
      case KeyCode.PageDown:
        this.page = 1 - this.page;
        return;
      case KeyCode.Enter:
        this.useMagic();
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

  private drawMagicName(surface: Surface): void {
    const lines = wrapTextBlock(this.magic.name, NAME_WIDTH);
    for (let i = 0; i < lines.length; i += 1) {
      TextRender.drawText(surface, lines[i] ?? '', NAME_LEFT, NAME_TOP + i * 16);
    }
  }

  private useMagic(): void {
    const targets = this.getTargets();
    if (targets.length === 0) {
      this.close();
      return;
    }
    if (this.caster.mp < this.magic.costMp) {
      this.showMessage('真气不足');
      return;
    }
    this.caster.mp = Math.max(0, this.caster.mp - this.magic.costMp);
    for (const target of targets) applyRestoreMagic(this.magic, target);
    this.close();
  }

  private getTargets(): Player[] {
    if (this.magic.targetAll) return this.players.filter(player => player.isAlive);
    const target = this.players[this.actorIndex];
    if (!target) throw new Error('魔法使用页没有可用角色');
    return [target];
  }

  private showMessage(text: string): void {
    const mainScene = this.game.mainScene;
    if (!mainScene) throw new Error('主场景不存在，无法显示魔法消息');
    mainScene.showMessage(text, 1000);
  }
}
