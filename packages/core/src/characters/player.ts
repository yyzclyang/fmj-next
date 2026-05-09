import { Direction, type Direction as DirectionValue } from './character';
import { FightingCharacter, type FightingCharacterData } from './fighting-character';
import { GoodsDecorations, type GoodsEquipment, GoodsWeapon } from '@/goods';
import type { ResImage } from '@/lib/res-image';
import type { BaseMagic } from '@/magic';
import type { ResLevelUpChain } from './res-level-up-chain';

export const PLAYER_EQUIPMENT_TYPES = [6, 6, 5, 3, 7, 2, 4, 1] as const;

export interface PlayerMagicKey {
  readonly type: number;
  readonly index: number;
}

export interface PlayerData extends FightingCharacterData {
  readonly headImage: ResImage | null;
  readonly levelUpChain: ResLevelUpChain | null;
  readonly exp: number;
  readonly equipment: Array<GoodsEquipment | null>;
  readonly onHitStatusRounds: number;
  readonly onHitStatusMask: number;
  readonly coopMagicIndex: number;
  readonly hpPerRound: number;
  readonly mpPerRound: number;
}

export class Player extends FightingCharacter {
  headImage: ResImage | null;
  levelUpChain: ResLevelUpChain | null;
  exp: number;
  readonly equipment: Array<GoodsEquipment | null>;
  onHitStatusRounds: number;
  onHitStatusMask: number;
  coopMagicIndex: number;
  hpPerRound: number;
  mpPerRound: number;
  private readonly privateLearntMagics: BaseMagic[] = [];

  constructor(data: PlayerData) {
    super(data);
    this.headImage = data.headImage;
    this.levelUpChain = data.levelUpChain;
    this.exp = data.exp;
    this.equipment = data.equipment;
    this.onHitStatusRounds = data.onHitStatusRounds;
    this.onHitStatusMask = data.onHitStatusMask;
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

  getPrivateLearntMagicKeys(): PlayerMagicKey[] {
    return this.privateLearntMagics.map(magic => ({ type: magic.type, index: magic.index }));
  }

  restorePrivateLearntMagics(magics: readonly BaseMagic[]): void {
    this.privateLearntMagics.length = 0;
    this.privateLearntMagics.push(...magics);
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

  getAttribute(type: number): number {
    switch (type) {
      case 0:
        return this.level;
      case 1:
        return this.attack;
      case 2:
        return this.defense;
      case 3:
        return this.agility;
      case 4:
        return this.hp;
      case 5:
        return this.mp;
      case 6:
        return this.exp;
      case 7:
        return this.spirit;
      case 8:
        return this.luck;
      case 9:
        return this.onHitStatusRounds;
      case 10:
        return this.immuneStatuses.toFlags();
      case 11:
        return this.onHitStatusMask;
      case 12:
        return this.coopMagicIndex;
      case 13:
        return this.hpPerRound;
      case 14:
        return this.mpPerRound;
      case 15:
        return this.equipment[7]?.index ?? 0;
      case 16:
        return this.equipment[5]?.index ?? 0;
      case 17:
        return this.equipment[6]?.index ?? 0;
      case 18:
        return this.equipment[2]?.index ?? 0;
      case 19:
        return this.equipment[4]?.index ?? 0;
      case 20:
        return this.equipment[3]?.index ?? 0;
      case 21:
        return this.equipment[0]?.index ?? 0;
      case 22:
        return this.equipment[1]?.index ?? 0;
      case 23:
        return this.maxHp;
      case 24:
        return this.maxMp;
      default:
        return 0;
    }
  }

  setAttribute(type: number, value: number): void {
    switch (type) {
      case 0:
        this.setLevel(value);
        return;
      case 1:
        this.attack = value;
        return;
      case 2:
        this.defense = value;
        return;
      case 3:
        this.agility = value;
        return;
      case 4:
        this.hp = value;
        return;
      case 5:
        this.mp = value;
        return;
      case 6:
        this.exp = value;
        return;
      case 7:
        this.spirit = value;
        return;
      case 8:
        this.luck = value;
        return;
      case 9:
        this.setOnHitStatusRounds(value);
        return;
      case 10:
        this.immuneStatuses.replaceWithFlags(toUint8(value), 0);
        return;
      case 11:
        this.setOnHitStatusMask(value);
        return;
      case 12:
        this.coopMagicIndex = toUint8(value);
        return;
      case 13:
        this.hpPerRound = toUint8(value);
        return;
      case 14:
        this.mpPerRound = toUint8(value);
        return;
      case 15:
        this.maxHp = value;
        return;
      case 16:
        this.maxMp = value;
        return;
    }
  }

  addAttribute(type: number, value: number): void {
    if (this.levelUpChain?.maxLevel === 0 && type === 6) {
      this.exp -= 150 + Math.trunc(this.exp * 0.1);
      return;
    }

    switch (type) {
      case 0:
        this.setLevel(this.level + value);
        return;
      case 1:
        this.attack += value;
        return;
      case 2:
        this.defense += value;
        return;
      case 3:
        this.agility += value;
        return;
      case 4:
        this.hp += value;
        return;
      case 5:
        this.mp += value;
        return;
      case 6:
        this.exp += value;
        return;
      case 7:
        this.spirit += value;
        return;
      case 8:
        this.luck += value;
        return;
      case 9:
        this.setOnHitStatusRounds(this.onHitStatusRounds + value);
        return;
      case 10:
        this.maxHp += value;
        return;
      case 11:
        this.maxMp += value;
        return;
    }
  }

  getEquipmentByIndex(index: number): GoodsEquipment | null {
    return this.equipment[index] ?? null;
  }

  getCurrentEquipment(type: number): GoodsEquipment | null {
    for (let i = 0; i < PLAYER_EQUIPMENT_TYPES.length; i += 1) {
      if (PLAYER_EQUIPMENT_TYPES[i] === type) return this.equipment[i] ?? null;
    }
    return null;
  }

  hasEquipment(type: number, index: number): boolean {
    if (type === 6) {
      return [0, 1].every(i => {
        const equipment = this.equipment[i];
        return equipment?.type === type && equipment.index === index;
      });
    }
    return this.equipment.some((equipment, i) => i >= 2 && equipment?.type === type && equipment.index === index);
  }

  hasEquipmentSpace(type: number): boolean {
    if (type === 6) return this.equipment[0] == null || this.equipment[1] == null;
    return PLAYER_EQUIPMENT_TYPES.some((slotType, i) => slotType === type && this.equipment[i] == null);
  }

  putOnEquipment(goods: GoodsEquipment, at?: number): number | null {
    if (at != null) return this.putOnEquipmentAt(goods, at);
    for (let i = 0; i < PLAYER_EQUIPMENT_TYPES.length; i += 1) {
      if (PLAYER_EQUIPMENT_TYPES[i] === goods.type && this.equipment[i] == null) return this.putOnEquipmentAt(goods, i);
    }
    return null;
  }

  takeOffEquipment(type: number, index?: number): GoodsEquipment | null {
    if (index != null) return this.takeOffEquipmentAt(index);
    for (let i = 0; i < PLAYER_EQUIPMENT_TYPES.length; i += 1) {
      if (PLAYER_EQUIPMENT_TYPES[i] === type && this.equipment[i] != null) return this.takeOffEquipmentAt(i);
    }
    return null;
  }

  private putOnEquipmentAt(goods: GoodsEquipment, index: number): number | null {
    if (PLAYER_EQUIPMENT_TYPES[index] !== goods.type) {
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
    if (!(equipment instanceof GoodsDecorations)) {
      this.maxMp += equipment.mpMax * sign;
      this.maxHp += equipment.hpMax * sign;
    }
    this.defense += equipment.defense * sign;
    this.attack += equipment.attack * sign;
    this.spirit += equipment.spirit * sign;
    this.agility += equipment.agility * sign;
    this.luck += equipment.luck * sign;
    if (equipment instanceof GoodsWeapon) {
      if (sign > 0) {
        this.onHitStatusMask = toUint8(equipment.bitEffect);
        this.onHitStatusRounds = toUint8(equipment.sumRound);
      } else {
        this.onHitStatusMask = 0;
        this.onHitStatusRounds = 0;
      }
      this.syncOnHitStatuses();
      return;
    }
    if (equipment instanceof GoodsDecorations) {
      this.hpPerRound += equipment.hp * sign;
      this.mpPerRound += equipment.mp * sign;
      this.coopMagicIndex = sign > 0 ? equipment.coopMagic?.index ?? 0 : 0;
      return;
    }

    if (sign > 0) this.immuneStatuses.addFlags(equipment.bitEffect, 0);
    else this.immuneStatuses.removeFlags(equipment.bitEffect);
  }

  private setOnHitStatusRounds(value: number): void {
    this.onHitStatusRounds = toUint8(value);
    this.syncOnHitStatuses();
  }

  private setOnHitStatusMask(value: number): void {
    this.onHitStatusMask = toUint8(value);
    this.syncOnHitStatuses();
  }

  syncScriptAttributes(): void {
    this.syncOnHitStatuses();
  }

  private syncOnHitStatuses(): void {
    this.onHitStatuses.replaceWithFlags(this.onHitStatusMask, this.onHitStatusRounds);
  }
}

function toUint8(value: number): number {
  return value & 0xff;
}

export function mapDirection(value: number): DirectionValue {
  switch (value) {
    case 1:
      return Direction.North;
    case 2:
      return Direction.East;
    case 3:
      return Direction.South;
    case 4:
      return Direction.West;
    default:
      return Direction.North;
  }
}
