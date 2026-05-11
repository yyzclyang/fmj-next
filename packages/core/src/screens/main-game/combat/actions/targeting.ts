import type { FightingCharacter, Monster, Player } from '@/characters';
import { isConfusing, isSleeping } from '@/combat/combat-effects';

export function selectAliveMonsterIndex(monsters: readonly Monster[], currentIndex: number, step: 1 | -1): number {
  if (monsters.length === 0) throw new Error('战斗中没有怪物');
  let index = currentIndex;
  for (let i = 0; i < monsters.length; i += 1) {
    index = (index + step + monsters.length) % monsters.length;
    if (monsters[index]?.isAlive) return index;
  }
  return currentIndex;
}

export function selectTargetPlayerIndex(
  players: readonly Player[],
  currentIndex: number,
  allowDead: boolean,
  step: 1 | -1
): number {
  let index = currentIndex;
  for (let i = 0; i < players.length; i += 1) {
    index = (index + step + players.length) % players.length;
    const player = players[index];
    if (player && (allowDead || player.isAlive)) return index;
  }
  return currentIndex;
}

export function getFirstAlivePlayerIndex(players: readonly Player[]): number {
  return players.findIndex(player => player.isAlive);
}

export function getFirstTargetPlayerIndex(players: readonly Player[], allowDead: boolean): number {
  return players.findIndex(player => allowDead || player.isAlive);
}

export function getNextAlivePlayerIndex(players: readonly Player[], index: number): number {
  for (let i = index + 1; i < players.length; i += 1) {
    if (players[i]?.isAlive) return i;
  }
  return -1;
}

export function getPreviousAlivePlayerIndex(players: readonly Player[], index: number): number {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (players[i]?.isAlive) return i;
  }
  return -1;
}

export function getFirstAliveMonsterIndex(monsters: readonly Monster[]): number {
  return monsters.findIndex(monster => monster.isAlive);
}

export function getFirstAliveMonster(monsters: readonly Monster[]): Monster | null {
  return monsters.find(monster => monster.isAlive) ?? null;
}

export function getRandomAlivePlayer(players: readonly Player[]): Player | null {
  const alivePlayers = players.filter(player => player.isAlive);
  if (alivePlayers.length === 0) return null;
  return alivePlayers[Math.trunc(Math.random() * alivePlayers.length)] ?? null;
}

export function getAliveReplacementTarget(
  target: FightingCharacter,
  monsters: readonly Monster[],
  players: readonly Player[]
): FightingCharacter | null {
  return isMonster(target, monsters) ? getFirstAliveMonster(monsters) : getRandomAlivePlayer(players);
}

export function getAvailableCoopPlayers(players: readonly Player[], first: Player | null): Player[] {
  if (!first?.isAlive || isSleeping(first) || isConfusing(first)) return [];
  return [first, ...players.filter(player => player !== first && player.isAlive && !isSleeping(player))];
}

export function getLowestHpPlayer(players: readonly Player[], allowDead: boolean): Player | null {
  const targets = players.filter(player => allowDead || player.isAlive);
  if (targets.length === 0) return null;
  return targets.reduce((best, player) => (player.hp < best.hp ? player : best), targets[0]!);
}

export function getMonsterHealTarget(monsters: readonly Monster[]): Monster | null {
  const targets = monsters.filter(monster => monster.isAlive);
  if (targets.length === 0) return null;
  return targets.reduce((best, monster) => (monster.hp < best.hp ? monster : best), targets[0]!);
}

export function hasAlivePlayers(players: readonly Player[]): boolean {
  return players.some(player => player.isAlive);
}

export function isAllMonsterDead(monsters: readonly Monster[]): boolean {
  return monsters.every(monster => !monster.isAlive);
}

export function isMonster(actor: FightingCharacter, monsters: readonly Monster[]): actor is Monster {
  return monsters.includes(actor as Monster);
}
