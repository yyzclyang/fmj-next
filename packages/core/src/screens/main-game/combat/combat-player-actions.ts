import type { FightingCharacter, Monster, Player } from '@/characters';
import { BUFF_MASK_ALL } from '@/combat/combat-constants';
import { isConfusing, isSleeping } from '@/combat/combat-effects';
import type {
  CombatAction,
  CombatMedicineGoods,
  CombatThrowableGoods,
  MonsterTargetMode,
  PlayerTargetMode,
} from '@/combat/combat-actions';
import type { Game } from '@/game/game';
import { GoodsWeapon } from '@/goods';
import { getFirstAliveMonster } from './combat-targeting';
import { createRepeatedCoopAction } from './combat-coop-actions';
import { createRepeatAction } from './combat-repeat-actions';

export interface QueuedPlayerAction {
  readonly action: CombatAction;
  readonly rememberIndexes: readonly number[];
}

export type MonsterTargetAction =
  | { readonly kind: 'coop' }
  | { readonly kind: 'action'; readonly action: CombatAction; readonly goodsToUse?: CombatThrowableGoods };

export interface PlayerTargetAction {
  readonly action: CombatAction;
  readonly goodsToUse?: CombatMedicineGoods;
}

export function createDisabledPlayerAction(player: Player | null): CombatAction | null {
  if (!player || (!isSleeping(player) && !isConfusing(player))) return null;
  return { kind: 'nop', actor: player };
}

export function hasAttackAll(actor: FightingCharacter, players: readonly Player[]): boolean {
  if (actor.atbuff.hasBuff(BUFF_MASK_ALL)) return true;
  if (!players.includes(actor as Player)) return false;
  const player = actor as Player;
  return player.equipment.some(item => item instanceof GoodsWeapon && item.attackAll());
}

export function createPlayerAttackAction(
  player: Player,
  monster: Monster,
  monsters: readonly Monster[],
  players: readonly Player[]
): CombatAction {
  return hasAttackAll(player, players)
    ? { kind: 'attackAll', actor: player, targets: monsters.filter(item => item.isAlive) }
    : { kind: 'attack', actor: player, target: monster };
}

export function createMonsterTargetAction(
  player: Player,
  monster: Monster,
  mode: MonsterTargetMode,
  players: readonly Player[],
  monsters: readonly Monster[]
): MonsterTargetAction {
  if (mode.kind === 'attack') {
    return { kind: 'action', action: createPlayerAttackAction(player, monster, monsters, players) };
  }
  if (mode.kind === 'coop') {
    return { kind: 'coop' };
  }
  if (mode.kind === 'magicAttack') {
    return { kind: 'action', action: { kind: 'magicAttack', actor: player, magic: mode.magic, targets: [monster], targetAll: false } };
  }
  if (mode.kind === 'specialMagic') {
    return { kind: 'action', action: { kind: 'specialMagic', actor: player, target: monster, magic: mode.magic } };
  }
  return {
    kind: 'action',
    action: { kind: 'throwItem', actor: player, goods: mode.goods, targets: [monster], targetAll: false },
    goodsToUse: mode.goods,
  };
}

export function createPlayerTargetAction(player: Player, target: Player, mode: PlayerTargetMode): PlayerTargetAction {
  if (mode.kind === 'magicHelp') {
    return {
      action: { kind: 'magicHelp', actor: player, magic: mode.magic, targets: [target], targetAll: false },
    };
  }
  return {
    action: { kind: 'useItem', actor: player, goods: mode.goods, targets: [target], targetAll: false },
    goodsToUse: mode.goods,
  };
}

export function createFleeActions(players: readonly Player[], startIndex: number, isRandomFight: boolean): CombatAction[] {
  const res: CombatAction[] = [];
  let hasSuccess = false;
  for (let i = startIndex; i < players.length; i += 1) {
    const player = players[i];
    if (!player?.isAlive) continue;
    const succeed = !hasSuccess && isRandomFight && Math.random() < 0.5;
    res.push({ kind: 'flee', actor: player, succeed });
    if (succeed) {
      hasSuccess = true;
      break;
    }
  }
  return res;
}

export function createAutoAttackActions(
  players: readonly Player[],
  monsters: readonly Monster[]
): CombatAction[] | null {
  const monster = getFirstAliveMonster(monsters);
  if (!monster) return null;
  return players
    .filter(player => player.isAlive)
    .map(player => createPlayerAttackAction(player, monster, monsters, players));
}

export function createRepeatedPlayerActions(options: {
  readonly players: readonly Player[];
  readonly monsters: readonly Monster[];
  readonly lastPlayerActions: ReadonlyMap<number, CombatAction>;
  readonly bag: Game['bag'];
}): QueuedPlayerAction[] {
  const monster = getFirstAliveMonster(options.monsters);
  const alivePlayers = options.players.filter(player => player.isAlive && !isSleeping(player) && !isConfusing(player));
  if (alivePlayers.length === 0) return [];
  if (monster) {
    const coop = createRepeatedCoopAction({ ...options, alivePlayers, monster });
    if (coop) return [coop];
  }

  const res: QueuedPlayerAction[] = [];
  for (const player of alivePlayers) {
    const index = options.players.indexOf(player);
    const action = createRepeatAction({
      player,
      lastAction: options.lastPlayerActions.get(player.index),
      monster,
      players: options.players,
      monsters: options.monsters,
      bag: options.bag,
    }) ?? createRepeatFallbackAction(player, monster, options.monsters, options.players);
    res.push({ action, rememberIndexes: [index] });
  }
  return res;
}

function createRepeatFallbackAction(
  player: Player,
  monster: Monster | null,
  monsters: readonly Monster[],
  players: readonly Player[]
): CombatAction {
  return monster ? createPlayerAttackAction(player, monster, monsters, players) : { kind: 'defend', actor: player };
}
