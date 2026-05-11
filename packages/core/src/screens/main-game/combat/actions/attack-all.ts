import type { FightingCharacter, Player } from '@/characters';
import { STATUS_FLAG_ATTACK_ALL } from '@/characters/status';
import { GoodsWeapon } from '@/goods';

export function canAttackAllTargets(actor: FightingCharacter, players: readonly Player[]): boolean {
  if (actor.onHitStatuses.hasAnyFlag(STATUS_FLAG_ATTACK_ALL)) return true;
  if (!players.includes(actor as Player)) return false;
  const player = actor as Player;
  return player.equipment.some(item => item instanceof GoodsWeapon && item.attackAll());
}
