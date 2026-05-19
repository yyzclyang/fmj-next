import { STATUS_FLAG_ATTACK_ALL } from '@/characters/status';
import { isCombatHelpMagic, type CombatAction } from '@/combat/combat-actions';
import { isSealed } from '@/combat/combat-effects';
import type { Monster, Player } from '@/characters';
import { type BaseMagic, MagicAttack } from '@/magic';
import { randomInt } from '@/utils/integer';
import { clamp } from '@/utils/math';

export function createMonsterAction(
  monster: Monster,
  players: readonly Player[],
  monsters: readonly Monster[]
): CombatAction | null {
  const roll = randomInt(100);
  const playerTarget = selectPlayerTarget(players, roll);
  if (!isSealed(monster) && shouldMonsterCastMagic(monster, roll)) {
    const magic = selectMonsterMagic(monster, roll);
    if (magic instanceof MagicAttack) {
      if (!magic.targetAll && !playerTarget) return null;
      return {
        kind: 'magicAttack',
        actor: monster,
        magic,
        targets: magic.targetAll ? players : [playerTarget!],
        targetAll: magic.targetAll,
      };
    }
    if (magic && isCombatHelpMagic(magic)) {
      const targets = magic.targetAll ? monsters : [selectMonsterTarget(monsters, roll) ?? monster];
      return { kind: 'magicHelp', actor: monster, magic, targets, targetAll: magic.targetAll };
    }
  }
  return createMonsterPhysicalAction(monster, playerTarget, players);
}

function createMonsterPhysicalAction(
  monster: Monster,
  target: Player | null,
  players: readonly Player[]
): CombatAction | null {
  if (monster.onHitStatuses.hasAnyFlag(STATUS_FLAG_ATTACK_ALL)) {
    return { kind: 'attackAll', actor: monster, targets: players.filter(player => player.isAlive) };
  }
  return target ? { kind: 'attack', actor: monster, target } : null;
}

function shouldMonsterCastMagic(monster: Monster, roll: number): boolean {
  return roll < clamp(100 - monster.iq, 0, 100);
}

function selectMonsterMagic(monster: Monster, roll: number): BaseMagic | null {
  const magics = monster.magicChain?.getAllLearnedMagics(true) ?? [];
  if (magics.length === 0) return null;
  const magic = magics[roll % magics.length] ?? null;
  return magic && monster.mp >= magic.costMp ? magic : null;
}

function selectMonsterTarget(monsters: readonly Monster[], roll: number): Monster | null {
  const start = roll % 3;
  for (let i = 0; i < 3; i += 1) {
    const monster = monsters[(start + i) % 3];
    if (monster?.isAlive) return monster;
  }
  return null;
}

function selectPlayerTarget(players: readonly Player[], roll: number): Player | null {
  const start = roll % 3;
  for (let i = 0; i < 3; i += 1) {
    const player = players[(start + i) % 3];
    if (player?.isAlive) return player;
  }
  return null;
}
