import { BUFF_MASK_ALL } from '@/combat/combat-constants';
import type { CombatAction } from '@/combat/combat-actions';
import { isSealed } from '@/combat/combat-effects';
import type { Monster, Player } from '@/characters';
import { MagicAttack, MagicRestore } from '@/magic';

export function createMonsterAction(
  monster: Monster,
  target: Player,
  players: readonly Player[],
  monsters: readonly Monster[]
): CombatAction {
  if (!isSealed(monster)) {
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
      const targets = magic.isForAll ? monsters : [monster];
      return { kind: 'magicHelp', actor: monster, magic, targets, targetAll: magic.isForAll };
    }
  }
  return monster.atbuff.hasBuff(BUFF_MASK_ALL)
    ? { kind: 'attackAll', actor: monster, targets: players.filter(player => player.isAlive) }
    : { kind: 'attack', actor: monster, target };
}

// 怪物施法按 Kotlin simplified 分支：濒死恢复优先，其次尝试第一个攻击魔法。
function selectMonsterMagic(monster: Monster): MagicAttack | MagicRestore | null {
  const iq = monster.iq / 100;
  const magics = monster.magicChain?.getAllLearntMagics(true).filter(magic => magic.costMp <= monster.mp) ?? [];
  if (magics.length === 0) return null;
  const restoreMagic = magics.find((magic): magic is MagicRestore => magic instanceof MagicRestore);
  if (restoreMagic && monster.hp > 0 && monster.maxHp / monster.hp > 3 && Math.random() < Math.sqrt(iq)) {
    return restoreMagic;
  }
  const attackMagic = magics.find((magic): magic is MagicAttack => magic instanceof MagicAttack) ?? null;
  return attackMagic && Math.random() < iq ? attackMagic : null;
}
