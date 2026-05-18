import { Monster, Player, type FightingCharacter } from '@/characters';
import {
  STATUS_FLAG_CONFUSE,
  STATUS_FLAG_POISON,
  STATUS_FLAG_SEAL,
  STATUS_FLAG_SLEEP,
  STATUS_SLOT_AGILITY,
  STATUS_SLOT_ATTACK,
  STATUS_SLOT_DEFENSE,
  STATUS_SLOT_POISON,
  STATUS_SLOT_SLEEP,
} from '@/characters/status';
import { GoodsHiddenWeapon } from '@/goods';
import type { DamageFormula } from '@/game/game-engine-options';
import { type BaseMagic, MagicAttack, MagicAuxiliary, MagicEnhance, MagicRestore } from '@/magic';
import { randomInt } from '@/utils/integer';
import type { CombatHelpMagic, CombatThrowableGoods } from './combat-actions';

export function hasActiveStatus(actor: FightingCharacter, flags: number): boolean {
  return actor.activeStatuses.hasAnyFlag(flags);
}

export function isConfusing(actor: FightingCharacter): boolean {
  return hasActiveStatus(actor, STATUS_FLAG_CONFUSE);
}

export function isPoisoned(actor: FightingCharacter): boolean {
  return hasActiveStatus(actor, STATUS_FLAG_POISON);
}

export function isSealed(actor: FightingCharacter): boolean {
  return hasActiveStatus(actor, STATUS_FLAG_SEAL);
}

export function isSleeping(actor: FightingCharacter): boolean {
  return hasActiveStatus(actor, STATUS_FLAG_SLEEP);
}

export function getComputedAgility(actor: FightingCharacter): number {
  return actor.agility + Math.trunc((actor.agility * getStatusValue(actor, STATUS_SLOT_AGILITY)) / 100);
}

export function getComputedAttack(actor: FightingCharacter): number {
  return actor.attack + Math.trunc((actor.attack * getStatusValue(actor, STATUS_SLOT_ATTACK)) / 100);
}

export function getComputedDefense(actor: FightingCharacter): number {
  return actor.defense + Math.trunc((actor.defense * getStatusValue(actor, STATUS_SLOT_DEFENSE)) / 100);
}

export function decayFighterStatuses(actor: FightingCharacter): void {
  actor.immuneStatuses.decay();
  actor.activeStatuses.decay();
}

export function calcPhysicalDamage(
  attacker: FightingCharacter,
  target: FightingCharacter,
  targetIsPlayer: boolean,
  formula: DamageFormula = 'original',
  targetIsDefending = false,
  randomRoll = rollCombatRandom()
): number {
  const attack = Math.max(0, getComputedAttack(attacker));
  const defense = Math.max(0, getComputedDefense(target));
  return formula === 'simplified'
    ? calcPhysicalDamageSimplified(attack, defense, target, targetIsDefending)
    : calcPhysicalDamageOriginal(attack, defense, target, targetIsPlayer, targetIsDefending, randomRoll);
}

export function calcConfusionSelfDamage(actor: FightingCharacter, randomRoll = rollCombatRandom()): number {
  const attack = Math.max(0, getComputedAttack(actor));
  const defense = Math.max(0, getComputedDefense(actor));
  const defenseShift = actor instanceof Player ? 2 : 3;
  const randomShift = actor instanceof Player ? 4 : 2;
  const damage = Math.trunc(attack / ((defense >> defenseShift) + 1)) + (randomRoll % ((attack >> randomShift) + 1));
  return Math.min(actor.hp, Math.max(0, damage));
}

function calcPhysicalDamageOriginal(
  attack: number,
  defense: number,
  target: FightingCharacter,
  targetIsPlayer: boolean,
  targetIsDefending: boolean,
  randomRoll: number
): number {
  if (targetIsPlayer) {
    let damage = Math.trunc(attack / ((defense >> 3) + 1));
    damage += randomRoll % ((attack >> 4) + 1);
    if (hasSpecialDamageReduction(target, targetIsDefending)) damage >>= 1;
    return Math.max(0, damage);
  }
  let defenseDivisor = defense >> 3;
  if (defenseDivisor === 0) defenseDivisor = 1;
  let randomDivisor = attack >> 2;
  if (randomDivisor === 0) randomDivisor = 10;
  return Math.max(0, Math.trunc(attack / defenseDivisor) + (randomRoll % randomDivisor));
}

function calcPhysicalDamageSimplified(
  attack: number,
  defense: number,
  target: FightingCharacter,
  targetIsDefending: boolean
): number {
  let damage = Math.max(attack - defense, 1) + randomInt(10);
  if (hasSpecialDamageReduction(target, targetIsDefending)) damage >>= 1;
  return damage;
}

export function randomPhysicalMiss(
  attacker: FightingCharacter,
  target: FightingCharacter,
  enabled: boolean,
  allowMiss = true,
  randomRoll = rollCombatRandom()
): boolean {
  if (!enabled || !allowMiss) return false;
  const attackAgility = getComputedAgility(attacker);
  const defenderAgility = getComputedAgility(target) + 50;
  const diff = defenderAgility > attackAgility ? defenderAgility - attackAgility : 10;
  return randomRoll % 200 < diff;
}

export function randomMagicMiss(
  attacker: FightingCharacter,
  target: FightingCharacter,
  enabled: boolean,
  allowMiss = true,
  randomRoll = rollCombatRandom()
): boolean {
  if (!enabled || !allowMiss) return false;
  const attackerAgility = getComputedAgility(attacker);
  const targetAgility = getComputedAgility(target) + 20;
  const diff = targetAgility > attackerAgility ? targetAgility - attackerAgility : 0;
  return randomRoll % 100 < diff;
}

export function rollRandomPlayerGuard(player: Player, alreadyDefending: boolean): boolean {
  if (alreadyDefending || !player.isAlive || isSleeping(player) || isConfusing(player)) return false;
  return randomInt(100) > 0x5a;
}

export function applyOnHitStatuses(attacker: FightingCharacter, target: FightingCharacter): void {
  applyCombatStatuses(target, attacker.onHitStatuses, target.luck);
}

export function applyThrownGoods(goods: CombatThrowableGoods, target: Monster): void {
  target.hp -= goods.hpDamage;
  target.mp -= goods.mpDamage;
  if (goods instanceof GoodsHiddenWeapon) {
    applyCombatStatuses(target, createStatusSlots(goods.effectFlags & 0x0f, goods.effectRounds), 0);
  }
  if (target.hp < 0) target.hp = 0;
  if (target.mp < 0) target.mp = 0;
}

export function spendMagicMp(actor: FightingCharacter, magic: BaseMagic): boolean {
  if (actor.mp < magic.costMp) return false;
  actor.mp = Math.max(0, actor.mp - magic.costMp);
  return true;
}

export function rollCombatRandom(): number {
  return randomInt(0x10000);
}

export function applyMagicAttack(
  actor: FightingCharacter,
  magic: MagicAttack,
  target: FightingCharacter,
  formula: DamageFormula = 'original',
  targetIsDefending = false,
  randomRoll = rollCombatRandom(),
  magicMissed = false
): void {
  // C 引擎 miss 后仍会结算属性和异常；这里按战斗语义主动改成 miss 后不附加效果。
  if (magicMissed) return;

  applyHpMagicEffect(
    actor,
    target,
    calcHpMagicEffect(actor, target, magic.hpEffect, formula, targetIsDefending, randomRoll)
  );
  applyMpMagicEffect(actor, target, calcMpMagicEffect(actor, target, magic.mpEffect, formula, randomRoll));
  applyAttributeMagicEffect(
    target,
    -magic.attackPercent,
    -magic.defensePercent,
    -magic.agilityPercent,
    magic.statusEffectRounds,
    target.luck
  );
  applyCombatStatuses(target, createStatusSlots(magic.statusEffectFlags, magic.statusEffectRounds), target.luck);
}

export function applyMagicHelp(magic: CombatHelpMagic, target: FightingCharacter): void {
  if (magic instanceof MagicRestore) {
    applyRestoreMagic(magic, target);
    return;
  }
  if (magic instanceof MagicAuxiliary) {
    const hp = Math.trunc((target.hpMax * magic.hpPercent) / 100);
    target.hp = target.isAlive ? Math.min(target.hpMax, target.hp + hp) : Math.min(target.hpMax, hp);
    if (target.hp <= 0) target.hp = 1;
    return;
  }
  if (magic instanceof MagicEnhance && target.isAlive) {
    applyAttributeMagicEffect(
      target,
      magic.attackPercent,
      magic.defensePercent,
      magic.agilityPercent,
      magic.statusEffectRounds
    );
  }
}

export function applyRestoreMagic(magic: MagicRestore, target: FightingCharacter): void {
  if (!target.isAlive) return;
  if (magic.hp > 0) target.hp = Math.min(target.hpMax, target.hp + magic.hp);
  target.activeStatuses.clearFlags(magic.cureFlags);
}

export function applyPoisonPostEffect(actor: FightingCharacter): number {
  if (!actor.isAlive || !isPoisoned(actor)) return 0;
  const damage = actor.hp >> 2;
  actor.hp = Math.max(0, actor.hp - damage);
  return damage;
}

function getStatusValue(actor: FightingCharacter, index: number): number {
  return actor.activeStatuses.slots[index]?.value ?? 0;
}

function calcHpMagicEffect(
  src: FightingCharacter,
  dst: FightingCharacter,
  base: number,
  formula: DamageFormula,
  targetIsDefending: boolean,
  randomRoll: number
): number {
  if (base === 0 || dst.hp <= 0) return 0;
  if (base < 0) {
    const rate = dst.level <= 8 ? 1 : dst.level <= 16 ? 2 : 3;
    return -Math.min(dst.hp, Math.abs(base) * rate);
  }
  return formula === 'simplified'
    ? calcHpMagicEffectSimplified(src, dst, base, targetIsDefending)
    : calcHpMagicEffectOriginal(src, dst, base, targetIsDefending, randomRoll);
}

function calcHpMagicEffectOriginal(
  src: FightingCharacter,
  dst: FightingCharacter,
  base: number,
  targetIsDefending: boolean,
  randomRoll: number
): number {
  let damage = base;
  damage += src.spirit * (damage >> 6);
  damage -= dst.spirit * (damage >> 6);
  if (damage <= 0) return 0;
  damage += (randomRoll % damage) >> 4;
  if (damage > 0 && hasSpecialDamageReduction(dst, targetIsDefending)) damage -= damage >> 2;
  if (damage > dst.hp) damage = dst.hp;
  return Math.max(0, damage);
}

function hasSpecialDamageReduction(target: FightingCharacter, targetIsDefending: boolean): boolean {
  return target instanceof Player && targetIsDefending;
}

function calcHpMagicEffectSimplified(
  src: FightingCharacter,
  dst: FightingCharacter,
  base: number,
  targetIsDefending: boolean
): number {
  let damage = Math.max(0, base + Math.trunc((base * (src.spirit - dst.spirit)) / 100));
  if (damage > 0 && hasSpecialDamageReduction(dst, targetIsDefending)) damage -= damage >> 2;
  return Math.min(dst.hp, damage);
}

function calcMpMagicEffect(
  src: FightingCharacter,
  dst: FightingCharacter,
  base: number,
  formula: DamageFormula,
  randomRoll: number
): number {
  if (base === 0 || dst.mp <= 0) return 0;
  if (base < 0) {
    const rate = dst.level <= 8 ? 1 : dst.level <= 16 ? 2 : 3;
    return -Math.min(dst.mp, Math.abs(base) * rate);
  }
  return formula === 'simplified'
    ? calcMpMagicEffectSimplified(src, dst, base)
    : calcMpMagicEffectOriginal(src, dst, base, randomRoll);
}

function calcMpMagicEffectOriginal(
  src: FightingCharacter,
  dst: FightingCharacter,
  base: number,
  randomRoll: number
): number {
  let damage = base;
  if (src instanceof Player && dst instanceof Monster) {
    damage += (src.spirit * damage) >> 6;
    damage -= (dst.spirit * damage) >> 6;
  } else {
    damage -= src.spirit * (damage >> 6);
    damage += dst.spirit * (damage >> 6);
  }
  if (damage > 0) damage += (randomRoll % damage) >> 4;
  return Math.min(dst.mp, Math.max(0, damage));
}

function calcMpMagicEffectSimplified(src: FightingCharacter, dst: FightingCharacter, base: number): number {
  const damage = Math.max(0, base + Math.trunc((base * (src.spirit - dst.spirit)) / 100));
  return Math.min(dst.mp, damage);
}

function applyHpMagicEffect(actor: FightingCharacter, target: FightingCharacter, effect: number): void {
  if (effect === 0) return;
  const damage = calcBoundedEffect(target.hp, effect);
  if (damage === 0) return;
  target.hp = Math.max(0, target.hp - damage);
  if (effect < 0) actor.hp = clampFighterValue(actor.hp + damage, 0, actor.hpMax);
}

function applyMpMagicEffect(actor: FightingCharacter, target: FightingCharacter, effect: number): void {
  if (effect === 0) return;
  const damage = calcBoundedEffect(target.mp, effect);
  if (damage === 0) return;
  target.mp = Math.max(0, target.mp - damage);
  if (effect < 0) actor.mp = clampFighterValue(actor.mp + damage, 0, actor.mpMax);
}

function calcBoundedEffect(current: number, effect: number): number {
  return Math.min(Math.max(0, current), Math.abs(effect));
}

function clampFighterValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyAttributeMagicEffect(
  target: FightingCharacter,
  attack: number,
  defense: number,
  agility: number,
  round: number,
  luck?: number
): void {
  if (luck !== undefined && (attack !== 0 || defense !== 0 || agility !== 0) && !randomStatusSucceeds(luck)) return;
  setAttributeStatusPercent(target, STATUS_SLOT_ATTACK, attack, round);
  setAttributeStatusPercent(target, STATUS_SLOT_DEFENSE, defense, round);
  setAttributeStatusPercent(target, STATUS_SLOT_AGILITY, agility, round);
}

function setAttributeStatusPercent(target: FightingCharacter, slotIndex: number, value: number, round: number): void {
  if (value === 0) return;
  const status = target.activeStatuses.slots[slotIndex];
  if (!status) throw new Error(`魔法设置状态失败，非法状态槽位: ${slotIndex}`);
  status.value = value;
  status.round = round;
}

function createStatusSlots(flags: number, round: number) {
  return {
    slots: Array.from({ length: 8 }, (_, i) => ({
      value: (flags & (1 << i)) !== 0 ? 1 : 0,
      round,
    })),
  };
}

function applyCombatStatuses(
  target: FightingCharacter,
  src: { slots: readonly { value: number; round: number }[] },
  luck: number
): void {
  const hasAilment = src.slots
    .slice(STATUS_SLOT_SLEEP, STATUS_SLOT_POISON + 1)
    .some(sourceStatus => (sourceStatus?.value ?? 0) > 0);
  if (!hasAilment || randomStatusSucceeds(luck)) {
    for (let i = STATUS_SLOT_SLEEP; i <= STATUS_SLOT_POISON; i += 1) {
      const sourceStatus = src.slots[i];
      const immuneStatus = target.immuneStatuses.slots[i];
      if (!sourceStatus || !immuneStatus || immuneStatus.value !== 0 || sourceStatus.value <= 0) continue;
      const activeStatus = target.activeStatuses.slots[i];
      if (!activeStatus) continue;
      if (sourceStatus.round === 0) {
        activeStatus.value += 1;
      } else {
        if (activeStatus.round === 0) activeStatus.value += 1;
        activeStatus.round = Math.max(activeStatus.round, sourceStatus.round);
      }
    }
  }
  for (let i = STATUS_SLOT_ATTACK; i <= STATUS_SLOT_AGILITY; i += 1) {
    const sourceStatus = src.slots[i];
    const activeStatus = target.activeStatuses.slots[i];
    if (!sourceStatus || !activeStatus || sourceStatus.value === 0) continue;
    activeStatus.value = -sourceStatus.value;
    activeStatus.round = sourceStatus.round;
  }
}

function randomStatusSucceeds(luck: number): boolean {
  const roll = rollCombatRandom() % 0x5a;
  return Math.max(0, luck) < roll || roll > 0x3c;
}
