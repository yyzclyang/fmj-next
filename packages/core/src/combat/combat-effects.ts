import { Monster, Player, type FightingCharacter } from '@/characters';
import { GoodsHiddenWeapon } from '@/goods';
import type { MagicDamageFormula } from '@/game/game-engine-options';
import { type BaseMagic, MagicAttack, MagicAuxiliary, MagicEnhance, MagicRestore } from '@/magic';
import {
  BUFF_INDEX_DU,
  BUFF_INDEX_FANG,
  BUFF_INDEX_GONG,
  BUFF_INDEX_MIAN,
  BUFF_INDEX_SU,
  BUFF_MASK_DU,
  BUFF_MASK_FENG,
  BUFF_MASK_LUAN,
  BUFF_MASK_MIAN,
} from './combat-constants';
import type { CombatHelpMagic, CombatThrowableGoods } from './combat-actions';

export function hasDebuff(actor: FightingCharacter, mask: number): boolean {
  return actor.debuff.hasBuff(mask);
}

export function isPoisoned(actor: FightingCharacter): boolean {
  return hasDebuff(actor, BUFF_MASK_DU);
}

export function isConfusing(actor: FightingCharacter): boolean {
  return hasDebuff(actor, BUFF_MASK_LUAN);
}

export function isSealed(actor: FightingCharacter): boolean {
  return hasDebuff(actor, BUFF_MASK_FENG);
}

export function isSleeping(actor: FightingCharacter): boolean {
  return hasDebuff(actor, BUFF_MASK_MIAN);
}

export function getComputedSpeed(actor: FightingCharacter): number {
  return actor.speed + Math.trunc((actor.speed * getBuffValue(actor, BUFF_INDEX_SU)) / 100);
}

export function getComputedAttack(actor: FightingCharacter): number {
  return actor.attack + Math.trunc((actor.attack * getBuffValue(actor, BUFF_INDEX_GONG)) / 100);
}

export function getComputedDefend(actor: FightingCharacter): number {
  return actor.defend + Math.trunc((actor.defend * getBuffValue(actor, BUFF_INDEX_FANG)) / 100);
}

export function decayFighterBuffs(actor: FightingCharacter): void {
  actor.buff.decay();
  actor.debuff.decay();
}

export function calcPhysicalDamage(attacker: FightingCharacter, target: FightingCharacter, targetIsPlayer: boolean): number {
  const attack = Math.max(0, getComputedAttack(attacker));
  const defense = Math.max(0, getComputedDefend(target));
  const defenseShift = targetIsPlayer ? 2 : 3;
  const randomShift = targetIsPlayer ? 4 : 2;
  const base = Math.trunc(attack / ((defense >> defenseShift) + 1));
  const random = Math.trunc(Math.random() * ((attack >> randomShift) + 1));
  return Math.max(1, base + random);
}

export function randomMiss(attacker: FightingCharacter, target: FightingCharacter, enabled: boolean, allowMiss = true): boolean {
  if (!enabled || !allowMiss) return false;
  let attackerSpeed = getComputedSpeed(attacker);
  let targetSpeed = getComputedSpeed(target);
  if (attacker instanceof Monster && target instanceof Player) {
    targetSpeed += 50;
  } else if (attacker instanceof Player && target instanceof Monster) {
    attackerSpeed += 50;
  }
  const diff = attackerSpeed > targetSpeed ? attackerSpeed - targetSpeed : 10;
  return Math.trunc(Math.random() * 200) >= diff;
}

export function applyAttackBuff(attacker: FightingCharacter, target: FightingCharacter): void {
  applyCombatBuff(target, attacker.atbuff, target.luck);
}

export function applyThrownGoods(goods: CombatThrowableGoods, target: Monster): void {
  target.hp -= goods.affectHp;
  target.mp -= goods.affectMp;
  if (goods instanceof GoodsHiddenWeapon) {
    applyCombatBuff(target, makeAttackBuff(goods.bitMask & 0x0f, goods.sumRound), 0);
  }
  if (target.hp < 0) target.hp = 0;
  if (target.mp < 0) target.mp = 0;
}

export function spendMagicMp(actor: FightingCharacter, magic: BaseMagic): boolean {
  if (actor.mp < magic.costMp) return false;
  actor.mp = Math.max(0, actor.mp - magic.costMp);
  return true;
}

export function applyMagicAttack(
  actor: FightingCharacter,
  magic: MagicAttack,
  target: FightingCharacter,
  formula: MagicDamageFormula = 'original'
): void {
  applyHpMagicEffect(actor, target, calcHpMagicEffect(actor, target, magic.affectHp, formula));
  applyMpMagicEffect(actor, target, calcMpMagicEffect(actor, target, magic.affectMp, formula));
  applyCombatBuff(target, makeAttackBuff(magic.buffMask & 0x0f, (magic.buffMask >> 4) & 0x0f), target.luck);
  applyAttributeMagicEffect(target, -magic.attackPercent, -magic.defendPercent, -magic.speedPercent, 0);
}

export function applyMagicHelp(magic: CombatHelpMagic, target: FightingCharacter): void {
  if (magic instanceof MagicRestore) {
    if (!target.isAlive) return;
    if (magic.hp > 0) target.hp = Math.min(target.maxHp, target.hp + magic.hp);
    target.debuff.clearBuff(magic.cureMask);
    return;
  }
  if (magic instanceof MagicAuxiliary) {
    const hp = Math.trunc((target.maxHp * magic.hpPercent) / 100);
    target.hp = target.isAlive ? Math.min(target.maxHp, target.hp + hp) : Math.min(target.maxHp, hp);
    if (target.hp <= 0) target.hp = 1;
    return;
  }
  if (magic instanceof MagicEnhance && target.isAlive) {
    applyAttributeMagicEffect(target, magic.attackPercent, magic.defendPercent, magic.speedPercent, magic.buffRound);
  }
}

export function applyPoisonPostEffect(actor: FightingCharacter): void {
  if (!actor.isAlive || !isPoisoned(actor)) return;
  actor.hp = actor.hp === 1 ? 0 : Math.trunc(actor.hp * 0.75);
}

function getBuffValue(actor: FightingCharacter, index: number): number {
  return actor.debuff.buffs[index]?.value ?? 0;
}

function calcHpMagicEffect(
  src: FightingCharacter,
  dst: FightingCharacter,
  base: number,
  formula: MagicDamageFormula
): number {
  if (base === 0 || dst.hp <= 0) return 0;
  if (base < 0) {
    const rate = dst.level <= 8 ? 1 : dst.level <= 16 ? 2 : 3;
    return -Math.min(dst.hp, Math.abs(base) * rate);
  }
  return formula === 'simplified'
    ? calcHpMagicEffectSimplified(src, dst, base)
    : calcHpMagicEffectOriginal(src, dst, base);
}

function calcHpMagicEffectOriginal(src: FightingCharacter, dst: FightingCharacter, base: number): number {
  let damage = base;
  damage += src.lingli * (damage >> 6);
  damage -= dst.lingli * (damage >> 6);
  if (damage > 0) damage += (Math.trunc(Math.random() * 1000) % damage) >> 4;
  if (damage > dst.hp) damage = dst.hp;
  // Kotlin 原版会保留被目标灵力修正成负数的结果，后续按吸收效果处理。
  return Math.max(damage, damage > 0 ? 1 : damage);
}

function calcHpMagicEffectSimplified(src: FightingCharacter, dst: FightingCharacter, base: number): number {
  const damage = Math.max(0, base + Math.trunc((base * (src.lingli - dst.lingli)) / 100));
  return Math.min(dst.hp, damage);
}

function calcMpMagicEffect(
  src: FightingCharacter,
  dst: FightingCharacter,
  base: number,
  formula: MagicDamageFormula
): number {
  if (base === 0 || dst.mp <= 0) return 0;
  if (base < 0) {
    const rate = dst.level <= 8 ? 1 : dst.level <= 16 ? 2 : 3;
    return -Math.min(dst.mp, Math.abs(base) * rate);
  }
  return formula === 'simplified'
    ? calcMpMagicEffectSimplified(src, dst, base)
    : calcMpMagicEffectOriginal(src, dst, base);
}

function calcMpMagicEffectOriginal(src: FightingCharacter, dst: FightingCharacter, base: number): number {
  let damage = base;
  damage -= src.lingli * (damage >> 6);
  damage += dst.lingli * (damage >> 6);
  if (damage > 0) damage += (Math.trunc(Math.random() * 1000) % damage) >> 4;
  return Math.min(dst.mp, Math.max(0, damage));
}

function calcMpMagicEffectSimplified(src: FightingCharacter, dst: FightingCharacter, base: number): number {
  const damage = Math.max(0, base + Math.trunc((base * (src.lingli - dst.lingli)) / 100));
  return Math.min(dst.mp, damage);
}

function applyHpMagicEffect(actor: FightingCharacter, target: FightingCharacter, effect: number): void {
  if (effect === 0) return;
  const damage = Math.min(target.hp, Math.abs(effect));
  target.hp = Math.max(0, target.hp - damage);
  if (effect < 0) actor.hp = Math.min(actor.maxHp, actor.hp + damage);
}

function applyMpMagicEffect(actor: FightingCharacter, target: FightingCharacter, effect: number): void {
  if (effect === 0) return;
  const damage = Math.min(target.mp, Math.abs(effect));
  target.mp = Math.max(0, target.mp - damage);
  if (effect < 0) actor.mp = Math.min(actor.maxMp, actor.mp + damage);
}

function applyAttributeMagicEffect(target: FightingCharacter, attack: number, defend: number, speed: number, round: number): void {
  setDebuffPercent(target, BUFF_INDEX_GONG, attack, round);
  setDebuffPercent(target, BUFF_INDEX_FANG, defend, round);
  setDebuffPercent(target, BUFF_INDEX_SU, speed, round);
}

function setDebuffPercent(target: FightingCharacter, index: number, value: number, round: number): void {
  if (value === 0) return;
  const buff = target.debuff.buffs[index];
  if (!buff) throw new Error(`魔法设置状态失败，非法状态索引: ${index}`);
  buff.value = value;
  buff.round = round;
}

function makeAttackBuff(mask: number, round: number) {
  return {
    buffs: Array.from({ length: 8 }, (_, i) => ({
      value: (mask & (1 << i)) !== 0 ? 1 : 0,
      round,
    })),
  };
}

function applyCombatBuff(target: FightingCharacter, src: { buffs: readonly { value: number; round: number }[] }, luck: number): void {
  const resist = Math.sqrt(Math.max(0, luck) / 100);
  for (let i = BUFF_INDEX_MIAN; i <= BUFF_INDEX_DU; i += 1) {
    if (Math.random() + 0.01 < resist) continue;
    const attackBuff = src.buffs[i];
    const immuneBuff = target.buff.buffs[i];
    if (!attackBuff || !immuneBuff || immuneBuff.value !== 0 || attackBuff.value <= 0) continue;
    const debuff = target.debuff.buffs[i];
    if (!debuff) continue;
    if (attackBuff.round === 0) {
      debuff.value += 1;
    } else {
      if (debuff.round === 0) debuff.value += 1;
      debuff.round = Math.max(debuff.round, attackBuff.round);
    }
  }
  for (let i = BUFF_INDEX_GONG; i <= BUFF_INDEX_SU; i += 1) {
    const attackBuff = src.buffs[i];
    const debuff = target.debuff.buffs[i];
    if (!attackBuff || !debuff || attackBuff.value === 0) continue;
    debuff.value = -attackBuff.value;
    debuff.round = attackBuff.round;
  }
}
