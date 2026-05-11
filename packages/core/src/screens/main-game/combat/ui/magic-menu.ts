import type { Monster, Player } from '@/characters';
import {
  isCombatHelpMagic,
  type CombatAction,
  type CombatHelpMagic,
  type MonsterTargetMode,
  type PlayerTargetMode,
} from '@/combat/combat-actions';
import type { Game } from '@/game/game';
import { type BaseMagic, MagicAttack, MagicAuxiliary, MagicSpecial } from '@/magic';
import type { ScreenStack } from '@/screens/screen-stack';
import { ScreenMagic } from '@/screens/main-game/menu/screen-magic';
import { getFirstTargetPlayerIndex } from '../actions/targeting';

interface CombatMagicMenuOptions {
  readonly game: Game;
  readonly screenStack: ScreenStack;
  readonly players: readonly Player[];
  readonly monsters: readonly Monster[];
  readonly getCurrentPlayer: () => Player | null;
  readonly ensureSelectedMonster: () => boolean;
  readonly setMessage: (message: string) => void;
  readonly setPhase: (phase: 'selectTarget' | 'selectPlayerTarget') => void;
  readonly setMonsterTargetMode: (mode: MonsterTargetMode) => void;
  readonly setPlayerTargetMode: (mode: PlayerTargetMode) => void;
  readonly setPlayerTargetIndex: (index: number) => void;
  readonly confirmPlayerAction: (action: CombatAction) => void;
  readonly startSuccess: () => void;
}

// 魔法菜单负责把魔法选择转换成战斗目标模式，真正入队仍由 ScreenCombat 处理。
export class CombatMagicMenu {
  constructor(private readonly options: CombatMagicMenuOptions) {}

  open(): void {
    const player = this.options.getCurrentPlayer();
    if (!player) throw new Error('打开战斗魔法菜单时缺少当前角色');
    const magics = player.getAllLearnedMagics();
    if (magics.length === 0) return;
    this.options.screenStack.push(
      new ScreenMagic(this.options.game, magics, player.mp, {
        onConfirm: magic => this.confirm(magic),
      })
    );
  }

  private confirm(magic: BaseMagic): void {
    const player = this.options.getCurrentPlayer();
    if (!player) throw new Error('确认战斗魔法时缺少当前角色');
    if (!(this.options.screenStack.current instanceof ScreenMagic))
      throw new Error('确认战斗魔法时当前 Screen 不是魔法列表');
    this.options.screenStack.pop();
    if (player.mp < magic.costMp) {
      this.options.setMessage('真气不足');
      return;
    }
    if (magic instanceof MagicAttack) {
      this.confirmAttackMagic(player, magic);
      return;
    }
    if (isCombatHelpMagic(magic)) {
      this.confirmHelpMagic(player, magic);
      return;
    }
    if (magic instanceof MagicSpecial) {
      if (!this.options.ensureSelectedMonster()) return;
      this.options.setMonsterTargetMode({ kind: 'specialMagic', magic });
      this.options.setPhase('selectTarget');
      return;
    }
    this.options.setMessage('此魔法暂未接入');
  }

  private confirmAttackMagic(player: Player, magic: MagicAttack): void {
    if (magic.targetAll) {
      const targets = this.options.monsters.filter(monster => monster.isAlive);
      if (targets.length === 0) {
        this.options.startSuccess();
        return;
      }
      this.options.confirmPlayerAction({ kind: 'magicAttack', actor: player, magic, targets, targetAll: true });
      return;
    }
    if (!this.options.ensureSelectedMonster()) return;
    this.options.setMonsterTargetMode({ kind: 'magicAttack', magic });
    this.options.setPhase('selectTarget');
  }

  private confirmHelpMagic(player: Player, magic: CombatHelpMagic): void {
    if (magic.targetAll) {
      this.options.confirmPlayerAction({
        kind: 'magicHelp',
        actor: player,
        magic,
        targets: this.options.players,
        targetAll: true,
      });
      return;
    }
    const allowDead = magic instanceof MagicAuxiliary;
    const index = getFirstTargetPlayerIndex(this.options.players, allowDead);
    if (index < 0) return;
    this.options.setPlayerTargetIndex(index);
    this.options.setPlayerTargetMode({ kind: 'magicHelp', magic, allowDead });
    this.options.setPhase('selectPlayerTarget');
  }
}
