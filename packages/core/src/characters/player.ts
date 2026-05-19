import { FightingCharacter, type FightingAttributeValues, type FightingCharacterData } from './fighting-character';
import { EquipmentGoodsType, GoodsDecoration, type GoodsEquipment, GoodsWeapon } from '@/goods';
import type { ResImage } from '@/lib/res-image';
import type { BaseMagic } from '@/magic';
import { toUint8 } from '@/utils/integer';
import type { ResLevelUpChain } from './res-level-up-chain';

const PlayerReadableScriptAttribute = {
  Level: 0,
  Attack: 1,
  Defense: 2,
  Agility: 3,
  Hp: 4,
  Mp: 5,
  Exp: 6,
  Spirit: 7,
  Luck: 8,
  OnHitEffectRounds: 9,
  ImmuneStatusFlags: 10,
  OnHitEffectFlags: 11,
  CoopMagicIndex: 12,
  HpPerRound: 13,
  MpPerRound: 14,
  HeadEquipmentIndex: 15,
  BodyEquipmentIndex: 16,
  ShoulderEquipmentIndex: 17,
  WristEquipmentIndex: 18,
  HandEquipmentIndex: 19,
  FootEquipmentIndex: 20,
  Decoration1EquipmentIndex: 21,
  Decoration2EquipmentIndex: 22,
  HpMax: 23,
  MpMax: 24,
} as const;

const PlayerWritableScriptAttribute = {
  Level: 0,
  Attack: 1,
  Defense: 2,
  Agility: 3,
  Hp: 4,
  Mp: 5,
  Exp: 6,
  Spirit: 7,
  Luck: 8,
  OnHitEffectRounds: 9,
  ImmuneStatusFlags: 10,
  OnHitEffectFlags: 11,
  CoopMagicIndex: 12,
  HpPerRound: 13,
  MpPerRound: 14,
  HpMax: 15,
  MpMax: 16,
} as const;

const PlayerAdditiveScriptAttribute = {
  Level: 0,
  Attack: 1,
  Defense: 2,
  Agility: 3,
  Hp: 4,
  Mp: 5,
  Exp: 6,
  Spirit: 7,
  Luck: 8,
  OnHitEffectRounds: 9,
  HpMax: 10,
  MpMax: 11,
} as const;

type PlayerEquipmentAttribute = keyof FightingAttributeValues;

export const PlayerEquipmentSlot = {
  Decoration1: 0,
  Decoration2: 1,
  Wrist: 2,
  Foot: 3,
  Hand: 4,
  Body: 5,
  Shoulder: 6,
  Head: 7,
} as const;

export const PLAYER_EQUIPMENT_SLOT_GOODS_TYPES = [
  EquipmentGoodsType.Decoration,
  EquipmentGoodsType.Decoration,
  EquipmentGoodsType.Wrist,
  EquipmentGoodsType.Foot,
  EquipmentGoodsType.Hand,
  EquipmentGoodsType.Body,
  EquipmentGoodsType.Shoulder,
  EquipmentGoodsType.Head,
] as const;

export interface PlayerMagicRef {
  readonly type: number;
  readonly index: number;
}

export interface PlayerOnHitEffectConfig {
  readonly flags: number;
  readonly rounds: number;
}

export interface PlayerData extends FightingCharacterData {
  readonly headImage: ResImage | null;
  readonly levelUpChain: ResLevelUpChain | null;
  readonly exp: number;
  readonly equipment: Array<GoodsEquipment | null>;
  readonly onHitEffectRounds: number;
  readonly onHitEffectFlags: number;
  readonly coopMagicIndex: number;
  readonly hpPerRound: number;
  readonly mpPerRound: number;
}

export class Player extends FightingCharacter {
  headImage: ResImage | null;
  levelUpChain: ResLevelUpChain | null;
  exp: number;
  readonly equipment: Array<GoodsEquipment | null>;
  coopMagicIndex: number;
  hpPerRound: number;
  mpPerRound: number;
  private onHitEffectRoundsValue: number;
  private onHitEffectFlagsValue: number;
  private readonly privateLearnedMagics: BaseMagic[] = [];

  constructor(data: PlayerData) {
    super(data);
    this.headImage = data.headImage;
    this.levelUpChain = data.levelUpChain;
    this.exp = data.exp;
    this.equipment = data.equipment;
    this.onHitEffectRoundsValue = data.onHitEffectRounds;
    this.onHitEffectFlagsValue = data.onHitEffectFlags;
    this.coopMagicIndex = data.coopMagicIndex;
    this.hpPerRound = data.hpPerRound;
    this.mpPerRound = data.mpPerRound;
    this.syncOnHitStatuses();
  }

  getAllLearnedMagics(): BaseMagic[] {
    const chainMagics = this.magicChain?.getAllLearnedMagics() ?? [];
    return [...this.privateLearnedMagics, ...chainMagics];
  }

  learnMagic(magic: BaseMagic): void {
    this.privateLearnedMagics.push(magic);
  }

  getPrivateLearnedMagicRefs(): PlayerMagicRef[] {
    return this.privateLearnedMagics.map(magic => ({ type: magic.type, index: magic.index }));
  }

  restorePrivateLearnedMagics(magics: readonly BaseMagic[]): void {
    this.privateLearnedMagics.length = 0;
    this.privateLearnedMagics.push(...magics);
  }

  override get totalHpMax(): number {
    return clampPlayerFightingAttribute(this.hpMax + this.getEquipmentAttributeBonus('hpMax'));
  }

  override get totalMpMax(): number {
    return clampPlayerFightingAttribute(this.mpMax + this.getEquipmentAttributeBonus('mpMax'));
  }

  override get totalAttack(): number {
    return clampPlayerFightingAttribute(this.attack + this.getEquipmentAttributeBonus('attack'));
  }

  override get totalDefense(): number {
    return clampPlayerFightingAttribute(this.defense + this.getEquipmentAttributeBonus('defense'));
  }

  override get totalAgility(): number {
    return clampPlayerFightingAttribute(this.agility + this.getEquipmentAttributeBonus('agility'));
  }

  override get totalSpirit(): number {
    return clampPlayerFightingAttribute(this.spirit + this.getEquipmentAttributeBonus('spirit'));
  }

  override get totalLuck(): number {
    return clampPlayerFightingAttribute(this.luck + this.getEquipmentAttributeBonus('luck'));
  }

  getOnHitEffectConfig(): PlayerOnHitEffectConfig {
    return { flags: this.onHitEffectFlagsValue, rounds: this.onHitEffectRoundsValue };
  }

  restoreOnHitEffectConfig(flags: number, rounds: number): void {
    this.onHitEffectFlagsValue = toUint8(flags);
    this.onHitEffectRoundsValue = toUint8(rounds);
    this.syncOnHitStatuses();
  }

  setLevel(level: number): void {
    this.level = this.levelUpChain ? Math.min(level, this.levelUpChain.maxLevel) : level;
  }

  levelUp(toLevel: number): boolean {
    if (toLevel <= this.level || !this.levelUpChain) return false;
    const fromLevel = this.level;
    const targetLevel = this.levelUpChain.maxLevel > 0 ? Math.min(toLevel, this.levelUpChain.maxLevel) : toLevel;

    this.level = targetLevel;
    const hpIncrease = this.levelUpChain.getHpMax(targetLevel) - this.levelUpChain.getHpMax(fromLevel);
    const mpIncrease = this.levelUpChain.getMpMax(targetLevel) - this.levelUpChain.getMpMax(fromLevel);
    const attackIncrease = this.levelUpChain.getAttack(targetLevel) - this.levelUpChain.getAttack(fromLevel);
    const defenseIncrease = this.levelUpChain.getDefense(targetLevel) - this.levelUpChain.getDefense(fromLevel);
    const agilityIncrease = this.levelUpChain.getAgility(targetLevel) - this.levelUpChain.getAgility(fromLevel);
    const spiritIncrease = this.levelUpChain.getSpirit(targetLevel) - this.levelUpChain.getSpirit(fromLevel);
    const luckIncrease = this.levelUpChain.getLuck(targetLevel) - this.levelUpChain.getLuck(fromLevel);

    this.hpMax += hpIncrease;
    this.mpMax += mpIncrease;
    this.hp = this.totalHpMax;
    this.mp = this.totalMpMax;
    this.attack += attackIncrease;
    this.defense += defenseIncrease;
    this.agility += agilityIncrease;
    this.spirit += spiritIncrease;
    this.luck += luckIncrease;
    if (this.magicChain) this.magicChain.learnedMagicCount = this.levelUpChain.getLearnMagicCount(targetLevel);
    return true;
  }

  getScriptAttribute(attribute: number): number {
    switch (attribute) {
      case PlayerReadableScriptAttribute.Level:
        return this.level;
      case PlayerReadableScriptAttribute.Exp:
        return this.exp;
      case PlayerReadableScriptAttribute.Hp:
        return this.hp;
      case PlayerReadableScriptAttribute.Mp:
        return this.mp;
      case PlayerReadableScriptAttribute.HpMax:
        return this.totalHpMax;
      case PlayerReadableScriptAttribute.MpMax:
        return this.totalMpMax;
      case PlayerReadableScriptAttribute.HpPerRound:
        return this.hpPerRound;
      case PlayerReadableScriptAttribute.MpPerRound:
        return this.mpPerRound;
      case PlayerReadableScriptAttribute.Attack:
        return this.totalAttack;
      case PlayerReadableScriptAttribute.Defense:
        return this.totalDefense;
      case PlayerReadableScriptAttribute.Agility:
        return this.totalAgility;
      case PlayerReadableScriptAttribute.Spirit:
        return this.totalSpirit;
      case PlayerReadableScriptAttribute.Luck:
        return this.totalLuck;
      case PlayerReadableScriptAttribute.OnHitEffectRounds:
        return this.onHitEffectRoundsValue;
      case PlayerReadableScriptAttribute.ImmuneStatusFlags:
        return this.immuneStatuses.toFlags();
      case PlayerReadableScriptAttribute.OnHitEffectFlags:
        return this.onHitEffectFlagsValue;
      case PlayerReadableScriptAttribute.CoopMagicIndex:
        return this.coopMagicIndex;
      case PlayerReadableScriptAttribute.HeadEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Head]?.index ?? 0;
      case PlayerReadableScriptAttribute.BodyEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Body]?.index ?? 0;
      case PlayerReadableScriptAttribute.ShoulderEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Shoulder]?.index ?? 0;
      case PlayerReadableScriptAttribute.WristEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Wrist]?.index ?? 0;
      case PlayerReadableScriptAttribute.HandEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Hand]?.index ?? 0;
      case PlayerReadableScriptAttribute.FootEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Foot]?.index ?? 0;
      case PlayerReadableScriptAttribute.Decoration1EquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Decoration1]?.index ?? 0;
      case PlayerReadableScriptAttribute.Decoration2EquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Decoration2]?.index ?? 0;
      default:
        return 0;
    }
  }

  setScriptAttribute(attribute: number, value: number): void {
    switch (attribute) {
      case PlayerWritableScriptAttribute.Level:
        this.setLevel(value);
        return;
      case PlayerWritableScriptAttribute.Exp:
        this.exp = value;
        return;
      case PlayerWritableScriptAttribute.Hp:
        this.hp = clampCurrentPoolValue(value, this.totalHpMax);
        return;
      case PlayerWritableScriptAttribute.Mp:
        this.mp = clampCurrentPoolValue(value, this.totalMpMax);
        return;
      case PlayerWritableScriptAttribute.HpMax:
        this.hpMax = this.getBaseScriptAttributeValue('hpMax', value);
        this.hp = clampCurrentPoolValue(this.hp, this.totalHpMax);
        return;
      case PlayerWritableScriptAttribute.MpMax:
        this.mpMax = this.getBaseScriptAttributeValue('mpMax', value);
        this.mp = clampCurrentPoolValue(this.mp, this.totalMpMax);
        return;
      case PlayerWritableScriptAttribute.HpPerRound:
        this.hpPerRound = Math.trunc(value);
        return;
      case PlayerWritableScriptAttribute.MpPerRound:
        this.mpPerRound = Math.trunc(value);
        return;
      case PlayerWritableScriptAttribute.Attack:
        this.attack = this.getBaseScriptAttributeValue('attack', value);
        return;
      case PlayerWritableScriptAttribute.Defense:
        this.defense = this.getBaseScriptAttributeValue('defense', value);
        return;
      case PlayerWritableScriptAttribute.Agility:
        this.agility = this.getBaseScriptAttributeValue('agility', value);
        return;
      case PlayerWritableScriptAttribute.Spirit:
        this.spirit = this.getBaseScriptAttributeValue('spirit', value);
        return;
      case PlayerWritableScriptAttribute.Luck:
        this.luck = this.getBaseScriptAttributeValue('luck', value);
        return;
      case PlayerWritableScriptAttribute.OnHitEffectRounds:
        this.setOnHitEffectRounds(value);
        return;
      case PlayerWritableScriptAttribute.ImmuneStatusFlags:
        this.immuneStatuses.replaceWithFlags(toUint8(value), 0);
        return;
      case PlayerWritableScriptAttribute.OnHitEffectFlags:
        this.setOnHitEffectFlags(value);
        return;
      case PlayerWritableScriptAttribute.CoopMagicIndex:
        this.coopMagicIndex = toUint8(value);
        return;
    }
  }

  addScriptAttribute(attribute: number, value: number): void {
    if (this.levelUpChain?.maxLevel === 0 && attribute === PlayerAdditiveScriptAttribute.Exp) {
      this.exp -= 150 + Math.trunc(this.exp * 0.1);
      return;
    }

    switch (attribute) {
      case PlayerAdditiveScriptAttribute.Level:
        this.setLevel(this.level + value);
        return;
      case PlayerAdditiveScriptAttribute.Hp:
        this.hp = clampCurrentPoolValue(this.hp + value, this.totalHpMax);
        return;
      case PlayerAdditiveScriptAttribute.Mp:
        this.mp = clampCurrentPoolValue(this.mp + value, this.totalMpMax);
        return;
      case PlayerAdditiveScriptAttribute.HpMax:
        this.hpMax += Math.trunc(value);
        this.hp = clampCurrentPoolValue(this.hp, this.totalHpMax);
        return;
      case PlayerAdditiveScriptAttribute.MpMax:
        this.mpMax += Math.trunc(value);
        this.mp = clampCurrentPoolValue(this.mp, this.totalMpMax);
        return;
      case PlayerAdditiveScriptAttribute.Attack:
        this.attack += Math.trunc(value);
        return;
      case PlayerAdditiveScriptAttribute.Defense:
        this.defense += Math.trunc(value);
        return;
      case PlayerAdditiveScriptAttribute.Agility:
        this.agility += Math.trunc(value);
        return;
      case PlayerAdditiveScriptAttribute.Exp:
        this.exp += value;
        return;
      case PlayerAdditiveScriptAttribute.Spirit:
        this.spirit += Math.trunc(value);
        return;
      case PlayerAdditiveScriptAttribute.Luck:
        this.luck += Math.trunc(value);
        return;
      case PlayerAdditiveScriptAttribute.OnHitEffectRounds:
        this.setOnHitEffectRounds(this.onHitEffectRoundsValue + value);
        return;
    }
  }

  getEquipmentByIndex(index: number): GoodsEquipment | null {
    return this.equipment[index] ?? null;
  }

  getCurrentEquipment(type: number): GoodsEquipment | null {
    const slot = this.findEquipmentSlot(type);
    return slot === null ? null : (this.equipment[slot] ?? null);
  }

  hasEquipment(type: number, index: number): boolean {
    if (type === EquipmentGoodsType.Decoration) {
      return [PlayerEquipmentSlot.Decoration1, PlayerEquipmentSlot.Decoration2].every(i => {
        const equipment = this.equipment[i];
        return equipment?.type === type && equipment.index === index;
      });
    }
    return this.equipment.some(
      (equipment, i) => i >= PlayerEquipmentSlot.Wrist && equipment?.type === type && equipment.index === index
    );
  }

  hasEquipmentSpace(type: number): boolean {
    const slot = this.findEquipmentSlot(type, slot => this.equipment[slot] === null);
    return slot !== null;
  }

  putOnEquipment(goods: GoodsEquipment, at?: number): number | null {
    if (at !== undefined) return this.putOnEquipmentAt(goods, at);
    const slot = this.findEquipmentSlot(goods.type, i => this.equipment[i] === null);
    return slot === null ? null : this.putOnEquipmentAt(goods, slot);
  }

  takeOffEquipment(type: number, index?: number): GoodsEquipment | null {
    if (index !== undefined) return this.takeOffEquipmentAt(index);
    const slot = this.findEquipmentSlot(type, i => this.equipment[i] !== null);
    return slot === null ? null : this.takeOffEquipmentAt(slot);
  }

  private findEquipmentSlot(type: number, predicate?: (slot: number) => boolean): number | null {
    for (let slot = 0; slot < PLAYER_EQUIPMENT_SLOT_GOODS_TYPES.length; slot += 1) {
      if (PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[slot] === type && (!predicate || predicate(slot))) return slot;
    }
    return null;
  }

  private putOnEquipmentAt(goods: GoodsEquipment, index: number): number | null {
    if (PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[index] !== goods.type) {
      throw new Error(`装备类型 ${goods.type} 不能放入槽位 ${index}`);
    }
    if (this.equipment[index] !== null) return null;
    this.equipment[index] = goods;
    this.applyEquipmentEffect(goods, 1);
    return index;
  }

  private takeOffEquipmentAt(index: number): GoodsEquipment | null {
    const equipment = this.equipment[index] ?? null;
    if (!equipment) return null;
    this.equipment[index] = null;
    this.applyEquipmentEffect(equipment, -1);
    return equipment;
  }

  private applyEquipmentEffect(equipment: GoodsEquipment, sign: 1 | -1): void {
    if (equipment instanceof GoodsWeapon) {
      this.applyWeaponEffect(equipment, sign);
    } else if (equipment instanceof GoodsDecoration) {
      this.applyDecorationEffect(equipment, sign);
    } else {
      this.applyEquipmentImmunity(equipment, sign);
    }
    if (equipmentChangesPoolMax(equipment)) {
      this.hp = clampCurrentPoolValue(this.hp, this.totalHpMax);
      this.mp = clampCurrentPoolValue(this.mp, this.totalMpMax);
    }
  }

  private applyWeaponEffect(equipment: GoodsWeapon, sign: 1 | -1): void {
    if (sign > 0) {
      this.onHitEffectFlagsValue = toUint8(equipment.effectFlags);
      this.onHitEffectRoundsValue = toUint8(equipment.effectRounds);
    } else {
      this.onHitEffectFlagsValue = 0;
      this.onHitEffectRoundsValue = 0;
    }
    this.syncOnHitStatuses();
  }

  private applyDecorationEffect(equipment: GoodsDecoration, sign: 1 | -1): void {
    this.hpPerRound = Math.trunc(this.hpPerRound + equipment.hpPerRound * sign);
    this.mpPerRound = Math.trunc(this.mpPerRound + equipment.mpPerRound * sign);
    this.coopMagicIndex = sign > 0 ? (equipment.coopMagic?.index ?? 0) : 0;
  }

  private applyEquipmentImmunity(equipment: GoodsEquipment, sign: 1 | -1): void {
    if (sign > 0) this.immuneStatuses.addFlags(equipment.effectFlags, 0);
    else this.immuneStatuses.removeFlags(equipment.effectFlags);
  }

  private setOnHitEffectRounds(value: number): void {
    this.onHitEffectRoundsValue = toUint8(value);
    this.syncOnHitStatuses();
  }

  private setOnHitEffectFlags(value: number): void {
    this.onHitEffectFlagsValue = toUint8(value);
    this.syncOnHitStatuses();
  }

  private syncOnHitStatuses(): void {
    this.onHitStatuses.replaceWithFlags(this.onHitEffectFlagsValue, this.onHitEffectRoundsValue);
  }

  private getBaseScriptAttributeValue(attribute: PlayerEquipmentAttribute, totalValue: number): number {
    return Math.trunc(totalValue) - this.getEquipmentAttributeBonus(attribute);
  }

  private getEquipmentAttributeBonus(attribute: PlayerEquipmentAttribute): number {
    let bonus = 0;
    for (const equipment of this.equipment ?? []) {
      if (!equipment) continue;
      bonus += equipment[attribute];
    }
    return bonus;
  }
}

function clampPlayerFightingAttribute(value: number): number {
  return Math.max(0, Math.trunc(value));
}

function equipmentChangesPoolMax(equipment: GoodsEquipment): boolean {
  return equipment.hpMax !== 0 || equipment.mpMax !== 0;
}

function clampCurrentPoolValue(value: number, max: number): number {
  const normalized = Math.trunc(value);
  return Math.min(Math.max(0, max), Math.max(0, normalized));
}
