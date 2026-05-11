import { isSealed } from '@/combat/combat-effects';
import type { CombatAction, CombatHelpMagic, ThrowItemAction, UseItemAction } from '@/combat/combat-actions';
import type { Monster, Player } from '@/characters';
import type { GoodsBag } from '@/goods/goods-bag';
import { GoodsMedicineLife } from '@/goods';
import { MagicAuxiliary } from '@/magic';
import { getLowestHpPlayer } from './targeting';
import { canAttackAllTargets } from './attack-all';

export interface CreateRepeatActionOptions {
  readonly player: Player;
  readonly lastAction: CombatAction | undefined;
  readonly monster: Monster | null;
  readonly players: readonly Player[];
  readonly monsters: readonly Monster[];
  readonly bag: GoodsBag;
}

export function createRepeatAction(options: CreateRepeatActionOptions): CombatAction | null {
  const { player, lastAction, monster } = options;
  if (!lastAction)
    return monster ? { kind: 'attack', actor: player, target: monster } : { kind: 'defend', actor: player };
  if (lastAction.kind === 'attackAll') {
    return monster && canAttackAllTargets(player, options.players)
      ? { kind: 'attackAll', actor: player, targets: options.monsters }
      : null;
  }
  if (lastAction.kind === 'attack') return monster ? { kind: 'attack', actor: player, target: monster } : null;
  if (lastAction.kind === 'magicAttack') {
    if (!monster || player.mp < lastAction.magic.costMp || isSealed(player)) return null;
    return {
      kind: 'magicAttack',
      actor: player,
      magic: lastAction.magic,
      targets: lastAction.magic.targetAll ? options.monsters : [monster],
      targetAll: lastAction.magic.targetAll,
    };
  }
  if (lastAction.kind === 'specialMagic') {
    if (!monster || player.mp < lastAction.magic.costMp || isSealed(player)) return null;
    return { kind: 'specialMagic', actor: player, target: monster, magic: lastAction.magic };
  }
  if (lastAction.kind === 'magicHelp') {
    return createRepeatMagicHelpAction(options, lastAction);
  }
  if (lastAction.kind === 'useItem') return createRepeatUseItemAction(options, lastAction);
  if (lastAction.kind === 'throwItem') return createRepeatThrowItemAction(options, lastAction);
  if (lastAction.kind === 'defend') return { kind: 'defend', actor: player };
  return monster ? { kind: 'attack', actor: player, target: monster } : null;
}

function createRepeatMagicHelpAction(
  options: CreateRepeatActionOptions,
  lastAction: CombatAction & { kind: 'magicHelp' }
): CombatAction | null {
  const { player } = options;
  if (player.mp < lastAction.magic.costMp || isSealed(player)) return null;
  if (lastAction.targetAll) {
    return { kind: 'magicHelp', actor: player, magic: lastAction.magic, targets: options.players, targetAll: true };
  }
  const target = selectRepeatHelpTarget(lastAction.magic, options.players);
  return target
    ? { kind: 'magicHelp', actor: player, magic: lastAction.magic, targets: [target], targetAll: false }
    : null;
}

function selectRepeatHelpTarget(magic: CombatHelpMagic, players: readonly Player[]): Player | null {
  if (magic instanceof MagicAuxiliary) {
    return players.find(player => !player.isAlive) ?? getLowestHpPlayer(players, true);
  }
  return getLowestHpPlayer(players, false);
}

function createRepeatUseItemAction(options: CreateRepeatActionOptions, lastAction: UseItemAction): CombatAction | null {
  const { player, players, bag } = options;
  if (lastAction.targetAll) {
    if (!bag.consumeGoods(lastAction.goods.type, lastAction.goods.index, 1)) return null;
    return { kind: 'useItem', actor: player, goods: lastAction.goods, targets: players, targetAll: true };
  }
  const target =
    lastAction.goods instanceof GoodsMedicineLife
      ? (players.find(item => !item.isAlive) ?? getLowestHpPlayer(players, true))
      : getLowestHpPlayer(players, false);
  if (!target || !bag.consumeGoods(lastAction.goods.type, lastAction.goods.index, 1)) return null;
  return { kind: 'useItem', actor: player, goods: lastAction.goods, targets: [target], targetAll: false };
}

function createRepeatThrowItemAction(
  options: CreateRepeatActionOptions,
  lastAction: ThrowItemAction
): CombatAction | null {
  const { player, monster, monsters, bag } = options;
  if (!monster || !bag.consumeGoods(lastAction.goods.type, lastAction.goods.index, 1)) return null;
  return {
    kind: 'throwItem',
    actor: player,
    goods: lastAction.goods,
    targets: lastAction.targetAll ? monsters.filter(item => item.isAlive) : [monster],
    targetAll: lastAction.targetAll,
  };
}
