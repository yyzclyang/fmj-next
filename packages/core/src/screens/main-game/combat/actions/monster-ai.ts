import { STATUS_FLAG_ATTACK_ALL } from '@/characters/status';
import type { CombatAction } from '@/combat/combat-actions';
import { isSealed } from '@/combat/combat-effects';
import type { Monster, Player } from '@/characters';
import { type BaseMagic, MagicAttack, MagicRestore } from '@/magic';

export function createMonsterAction(
  monster: Monster,
  target: Player,
  players: readonly Player[],
  monsters: readonly Monster[]
): CombatAction {
  if (!isSealed(monster) && shouldMonsterCastMagic(monster)) {
    const magic = selectMonsterMagic(monster);
    if (magic instanceof MagicAttack) {
      return {
        kind: 'magicAttack',
        actor: monster,
        magic,
        targets: magic.isForAll ? players : [target],
        targetAll: magic.isForAll,
      };
    }
    if (magic instanceof MagicRestore) {
      const targets = magic.isForAll ? monsters : [selectMonsterRestoreTarget(monsters) ?? monster];
      return { kind: 'magicHelp', actor: monster, magic, targets, targetAll: magic.isForAll };
    }
  }
  return createMonsterPhysicalAction(monster, target, players);
}

function createMonsterPhysicalAction(monster: Monster, target: Player, players: readonly Player[]): CombatAction {
  return monster.onHitStatuses.hasAnyFlag(STATUS_FLAG_ATTACK_ALL)
    ? { kind: 'attackAll', actor: monster, targets: players.filter(player => player.isAlive) }
    : { kind: 'attack', actor: monster, target };
}

function shouldMonsterCastMagic(monster: Monster): boolean {
  return Math.trunc(Math.random() * 100) < getMonsterMagicChance(monster.iq);
}

function getMonsterMagicChance(iq: number): number {
  return iq < 80 ? iq : 80 + Math.trunc((iq - 80) / 10);
}

function selectMonsterMagic(monster: Monster): BaseMagic | null {
  const magics = monster.magicChain?.getAllLearntMagics(true).filter(magic => magic.costMp <= monster.mp) ?? [];
  if (magics.length === 0) return null;
  return magics[Math.trunc(Math.random() * magics.length)] ?? null;
}

function selectMonsterRestoreTarget(monsters: readonly Monster[]): Monster | null {
  let res: Monster | null = null;
  for (const monster of monsters) {
    if (!monster.isAlive) continue;
    if (!res || monster.hp < res.hp) res = monster;
  }
  return res;
}
