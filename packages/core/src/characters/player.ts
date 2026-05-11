import { FightingCharacter, type FightingCharacterData } from './fighting-character';
import { EquipmentGoodsType, GoodsDecorations, type GoodsEquipment, GoodsWeapon } from '@/goods';
import type { ResImage } from '@/lib/res-image';
import type { BaseMagic } from '@/magic';
import { toUint8 } from '@/shared/integer';
import type { ResLevelUpChain } from './res-level-up-chain';

const PlayerReadableAttribute = {
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
  MaxHp: 23,
  MaxMp: 24,
} as const;

const PlayerWritableAttribute = {
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
  MaxHp: 15,
  MaxMp: 16,
} as const;

const PlayerAdditiveAttribute = {
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
  MaxHp: 10,
  MaxMp: 11,
} as const;

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
  private readonly privateLearntMagics: BaseMagic[] = [];

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

  getAllLearntMagics(): BaseMagic[] {
    const chainMagics = this.magicChain?.getAllLearntMagics() ?? [];
    return [...this.privateLearntMagics, ...chainMagics];
  }

  learnMagic(magic: BaseMagic): void {
    this.privateLearntMagics.push(magic);
  }

  getPrivateLearntMagicRefs(): PlayerMagicRef[] {
    return this.privateLearntMagics.map(magic => ({ type: magic.type, index: magic.index }));
  }

  restorePrivateLearntMagics(magics: readonly BaseMagic[]): void {
    this.privateLearntMagics.length = 0;
    this.privateLearntMagics.push(...magics);
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
    const hpIncrease = this.levelUpChain.getMaxHp(targetLevel) - this.levelUpChain.getMaxHp(fromLevel);
    const mpIncrease = this.levelUpChain.getMaxMp(targetLevel) - this.levelUpChain.getMaxMp(fromLevel);
    const attackIncrease = this.levelUpChain.getAttack(targetLevel) - this.levelUpChain.getAttack(fromLevel);
    const defenseIncrease = this.levelUpChain.getDefense(targetLevel) - this.levelUpChain.getDefense(fromLevel);
    const agilityIncrease = this.levelUpChain.getAgility(targetLevel) - this.levelUpChain.getAgility(fromLevel);
    const spiritIncrease = this.levelUpChain.getSpirit(targetLevel) - this.levelUpChain.getSpirit(fromLevel);
    const luckIncrease = this.levelUpChain.getLuck(targetLevel) - this.levelUpChain.getLuck(fromLevel);

    this.maxHp += hpIncrease;
    this.maxMp += mpIncrease;
    this.attack += attackIncrease;
    this.defense += defenseIncrease;
    this.agility += agilityIncrease;
    this.spirit += spiritIncrease;
    this.luck += luckIncrease;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    if (this.magicChain) {
      this.magicChain.learnNum = this.levelUpChain.getLearnMagicCount(targetLevel);
    }
    return true;
  }

  getAttribute(attribute: number): number {
    switch (attribute) {
      case PlayerReadableAttribute.Level:
        return this.level;
      case PlayerReadableAttribute.Attack:
        return this.attack;
      case PlayerReadableAttribute.Defense:
        return this.defense;
      case PlayerReadableAttribute.Agility:
        return this.agility;
      case PlayerReadableAttribute.Hp:
        return this.hp;
      case PlayerReadableAttribute.Mp:
        return this.mp;
      case PlayerReadableAttribute.Exp:
        return this.exp;
      case PlayerReadableAttribute.Spirit:
        return this.spirit;
      case PlayerReadableAttribute.Luck:
        return this.luck;
      case PlayerReadableAttribute.OnHitEffectRounds:
        return this.onHitEffectRoundsValue;
      case PlayerReadableAttribute.ImmuneStatusFlags:
        return this.immuneStatuses.toFlags();
      case PlayerReadableAttribute.OnHitEffectFlags:
        return this.onHitEffectFlagsValue;
      case PlayerReadableAttribute.CoopMagicIndex:
        return this.coopMagicIndex;
      case PlayerReadableAttribute.HpPerRound:
        return this.hpPerRound;
      case PlayerReadableAttribute.MpPerRound:
        return this.mpPerRound;
      case PlayerReadableAttribute.HeadEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Head]?.index ?? 0;
      case PlayerReadableAttribute.BodyEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Body]?.index ?? 0;
      case PlayerReadableAttribute.ShoulderEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Shoulder]?.index ?? 0;
      case PlayerReadableAttribute.WristEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Wrist]?.index ?? 0;
      case PlayerReadableAttribute.HandEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Hand]?.index ?? 0;
      case PlayerReadableAttribute.FootEquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Foot]?.index ?? 0;
      case PlayerReadableAttribute.Decoration1EquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Decoration1]?.index ?? 0;
      case PlayerReadableAttribute.Decoration2EquipmentIndex:
        return this.equipment[PlayerEquipmentSlot.Decoration2]?.index ?? 0;
      case PlayerReadableAttribute.MaxHp:
        return this.maxHp;
      case PlayerReadableAttribute.MaxMp:
        return this.maxMp;
      default:
        return 0;
    }
  }

  setAttribute(attribute: number, value: number): void {
    switch (attribute) {
      case PlayerWritableAttribute.Level:
        this.setLevel(value);
        return;
      case PlayerWritableAttribute.Attack:
        this.attack = value;
        return;
      case PlayerWritableAttribute.Defense:
        this.defense = value;
        return;
      case PlayerWritableAttribute.Agility:
        this.agility = value;
        return;
      case PlayerWritableAttribute.Hp:
        this.hp = value;
        return;
      case PlayerWritableAttribute.Mp:
        this.mp = value;
        return;
      case PlayerWritableAttribute.Exp:
        this.exp = value;
        return;
      case PlayerWritableAttribute.Spirit:
        this.spirit = value;
        return;
      case PlayerWritableAttribute.Luck:
        this.luck = value;
        return;
      case PlayerWritableAttribute.OnHitEffectRounds:
        this.setOnHitEffectRounds(value);
        return;
      case PlayerWritableAttribute.ImmuneStatusFlags:
        this.immuneStatuses.replaceWithFlags(toUint8(value), 0);
        return;
      case PlayerWritableAttribute.OnHitEffectFlags:
        this.setOnHitEffectFlags(value);
        return;
      case PlayerWritableAttribute.CoopMagicIndex:
        this.coopMagicIndex = toUint8(value);
        return;
      case PlayerWritableAttribute.HpPerRound:
        this.hpPerRound = toUint8(value);
        return;
      case PlayerWritableAttribute.MpPerRound:
        this.mpPerRound = toUint8(value);
        return;
      case PlayerWritableAttribute.MaxHp:
        this.maxHp = value;
        return;
      case PlayerWritableAttribute.MaxMp:
        this.maxMp = value;
        return;
    }
  }

  addAttribute(attribute: number, value: number): void {
    if (this.levelUpChain?.maxLevel === 0 && attribute === PlayerAdditiveAttribute.Exp) {
      this.exp -= 150 + Math.trunc(this.exp * 0.1);
      return;
    }

    switch (attribute) {
      case PlayerAdditiveAttribute.Level:
        this.setLevel(this.level + value);
        return;
      case PlayerAdditiveAttribute.Attack:
        this.attack += value;
        return;
      case PlayerAdditiveAttribute.Defense:
        this.defense += value;
        return;
      case PlayerAdditiveAttribute.Agility:
        this.agility += value;
        return;
      case PlayerAdditiveAttribute.Hp:
        this.hp += value;
        return;
      case PlayerAdditiveAttribute.Mp:
        this.mp += value;
        return;
      case PlayerAdditiveAttribute.Exp:
        this.exp += value;
        return;
      case PlayerAdditiveAttribute.Spirit:
        this.spirit += value;
        return;
      case PlayerAdditiveAttribute.Luck:
        this.luck += value;
        return;
      case PlayerAdditiveAttribute.OnHitEffectRounds:
        this.setOnHitEffectRounds(this.onHitEffectRoundsValue + value);
        return;
      case PlayerAdditiveAttribute.MaxHp:
        this.maxHp += value;
        return;
      case PlayerAdditiveAttribute.MaxMp:
        this.maxMp += value;
        return;
    }
  }

  getEquipmentByIndex(index: number): GoodsEquipment | null {
    return this.equipment[index] ?? null;
  }

  getCurrentEquipment(type: number): GoodsEquipment | null {
    for (let slot = 0; slot < PLAYER_EQUIPMENT_SLOT_GOODS_TYPES.length; slot += 1) {
      if (PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[slot] === type) return this.equipment[slot] ?? null;
    }
    return null;
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
    if (type === EquipmentGoodsType.Decoration) {
      return [PlayerEquipmentSlot.Decoration1, PlayerEquipmentSlot.Decoration2].some(i => this.equipment[i] == null);
    }
    return PLAYER_EQUIPMENT_SLOT_GOODS_TYPES.some(
      (goodsType, slot) => goodsType === type && this.equipment[slot] == null
    );
  }

  putOnEquipment(goods: GoodsEquipment, at?: number): number | null {
    if (at != null) return this.putOnEquipmentAt(goods, at);
    for (let slot = 0; slot < PLAYER_EQUIPMENT_SLOT_GOODS_TYPES.length; slot += 1) {
      if (PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[slot] === goods.type && this.equipment[slot] == null)
        return this.putOnEquipmentAt(goods, slot);
    }
    return null;
  }

  takeOffEquipment(type: number, index?: number): GoodsEquipment | null {
    if (index != null) return this.takeOffEquipmentAt(index);
    for (let slot = 0; slot < PLAYER_EQUIPMENT_SLOT_GOODS_TYPES.length; slot += 1) {
      if (PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[slot] === type && this.equipment[slot] != null)
        return this.takeOffEquipmentAt(slot);
    }
    return null;
  }

  private putOnEquipmentAt(goods: GoodsEquipment, index: number): number | null {
    if (PLAYER_EQUIPMENT_SLOT_GOODS_TYPES[index] !== goods.type) {
      throw new Error(`装备类型 ${goods.type} 不能放入槽位 ${index}`);
    }
    if (this.equipment[index] != null) return null;
    this.applyEquipmentEffect(goods, 1);
    this.equipment[index] = goods;
    return index;
  }

  private takeOffEquipmentAt(index: number): GoodsEquipment | null {
    const equipment = this.equipment[index] ?? null;
    if (!equipment) return null;
    this.applyEquipmentEffect(equipment, -1);
    this.equipment[index] = null;
    return equipment;
  }

  private applyEquipmentEffect(equipment: GoodsEquipment, sign: 1 | -1): void {
    this.applyEquipmentStats(equipment, sign);
    if (equipment instanceof GoodsWeapon) {
      this.applyWeaponEffect(equipment, sign);
      return;
    }
    if (equipment instanceof GoodsDecorations) {
      this.applyDecorationEffect(equipment, sign);
      return;
    }
    this.applyEquipmentImmunity(equipment, sign);
  }

  private applyEquipmentStats(equipment: GoodsEquipment, sign: 1 | -1): void {
    if (!(equipment instanceof GoodsDecorations)) {
      this.maxMp += equipment.mpMax * sign;
      this.maxHp += equipment.hpMax * sign;
    }
    this.defense += equipment.defense * sign;
    this.attack += equipment.attack * sign;
    this.spirit += equipment.spirit * sign;
    this.agility += equipment.agility * sign;
    this.luck += equipment.luck * sign;
  }

  private applyWeaponEffect(equipment: GoodsWeapon, sign: 1 | -1): void {
    if (sign > 0) {
      this.onHitEffectFlagsValue = toUint8(equipment.effectFlags);
      this.onHitEffectRoundsValue = toUint8(equipment.sumRound);
    } else {
      this.onHitEffectFlagsValue = 0;
      this.onHitEffectRoundsValue = 0;
    }
    this.syncOnHitStatuses();
  }

  private applyDecorationEffect(equipment: GoodsDecorations, sign: 1 | -1): void {
    this.hpPerRound += equipment.hp * sign;
    this.mpPerRound += equipment.mp * sign;
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
}
