import { KeyCode } from '@/shared/key-code';
import type { Direction } from './character';
import { FightingCharacter, type FightingCharacterData } from './fighting-character';
import type { GoodsEquipment } from '@/goods';
import type { ResImage } from '@/lib/res-image';
import type { BaseMagic } from '@/magic';
import type { ResLevelUpChain } from './res-level-up-chain';

export interface PlayerData extends FightingCharacterData {
  readonly headImage: ResImage | null;
  readonly levelUpChain: ResLevelUpChain | null;
  readonly currentExp: number;
  readonly equipment: Array<GoodsEquipment | null>;
  readonly totalMaxHp: number;
  readonly totalMaxMp: number;
  readonly totalAttack: number;
  readonly totalDefend: number;
  readonly totalSpeed: number;
  readonly totalLingli: number;
  readonly totalLuck: number;
}

export class Player extends FightingCharacter {
  headImage: ResImage | null;
  levelUpChain: ResLevelUpChain | null;
  currentExp: number;
  readonly equipment: Array<GoodsEquipment | null>;
  private readonly privateLearntMagics: BaseMagic[] = [];

  totalMaxHp: number;
  totalMaxMp: number;
  totalAttack: number;
  totalDefend: number;
  totalSpeed: number;
  totalLingli: number;
  totalLuck: number;

  constructor(data: PlayerData) {
    super(data);
    this.headImage = data.headImage;
    this.levelUpChain = data.levelUpChain;
    this.currentExp = data.currentExp;
    this.equipment = data.equipment;
    this.totalMaxHp = data.totalMaxHp;
    this.totalMaxMp = data.totalMaxMp;
    this.totalAttack = data.totalAttack;
    this.totalDefend = data.totalDefend;
    this.totalSpeed = data.totalSpeed;
    this.totalLingli = data.totalLingli;
    this.totalLuck = data.totalLuck;
  }

  getAllLearntMagics(): BaseMagic[] {
    const chainMagics = this.magicChain?.getAllLearntMagics() ?? [];
    return [...this.privateLearntMagics, ...chainMagics];
  }

  learnMagic(magic: BaseMagic): void {
    this.privateLearntMagics.push(magic);
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
    const defendIncrease = this.levelUpChain.getDefend(targetLevel) - this.levelUpChain.getDefend(fromLevel);
    const speedIncrease = this.levelUpChain.getSpeed(targetLevel) - this.levelUpChain.getSpeed(fromLevel);
    const lingliIncrease = this.levelUpChain.getLingli(targetLevel) - this.levelUpChain.getLingli(fromLevel);
    const luckIncrease = this.levelUpChain.getLuck(targetLevel) - this.levelUpChain.getLuck(fromLevel);

    this.totalMaxHp += hpIncrease;
    this.totalMaxMp += mpIncrease;
    this.totalAttack += attackIncrease;
    this.totalDefend += defendIncrease;
    this.totalSpeed += speedIncrease;
    this.totalLingli += lingliIncrease;
    this.totalLuck += luckIncrease;

    this.maxHp = this.totalMaxHp;
    this.maxMp = this.totalMaxMp;
    this.attack = this.totalAttack;
    this.defend = this.totalDefend;
    this.speed = this.totalSpeed;
    this.lingli = this.totalLingli;
    this.luck = this.totalLuck;
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
        return this.defend;
      case 3:
        return this.speed;
      case 4:
        return this.hp;
      case 5:
        return this.mp;
      case 6:
        return this.currentExp;
      case 7:
        return this.lingli;
      case 8:
        return this.luck;
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
        this.totalAttack = value;
        this.attack = value;
        return;
      case 2:
        this.totalDefend = value;
        this.defend = value;
        return;
      case 3:
        this.totalSpeed = value;
        this.speed = value;
        return;
      case 4:
        this.hp = value;
        return;
      case 5:
        this.mp = value;
        return;
      case 6:
        this.currentExp = value;
        return;
      case 7:
        this.totalLingli = value;
        this.lingli = value;
        return;
      case 8:
        this.totalLuck = value;
        this.luck = value;
        return;
      case 15:
        this.totalMaxHp = value;
        this.maxHp = value;
        return;
      case 16:
        this.totalMaxMp = value;
        this.maxMp = value;
        return;
    }
  }

  addAttribute(type: number, value: number): void {
    if (this.levelUpChain?.maxLevel === 0 && type === 6) {
      this.currentExp -= 150 + Math.trunc(this.currentExp * 0.1);
      return;
    }

    switch (type) {
      case 0:
        this.setLevel(this.level + value);
        return;
      case 1:
        this.totalAttack += value;
        this.attack += value;
        return;
      case 2:
        this.totalDefend += value;
        this.defend += value;
        return;
      case 3:
        this.totalSpeed += value;
        this.speed += value;
        return;
      case 4:
        this.hp += value;
        return;
      case 5:
        this.mp += value;
        return;
      case 6:
        this.currentExp += value;
        return;
      case 7:
        this.totalLingli += value;
        this.lingli += value;
        return;
      case 8:
        this.totalLuck += value;
        this.luck += value;
        return;
      case 10:
        this.totalMaxHp += value;
        this.maxHp += value;
        return;
      case 11:
        this.totalMaxMp += value;
        this.maxMp += value;
        return;
    }
  }
}

export function mapDirection(value: number): Direction {
  switch (value) {
    case 1:
      return KeyCode.Up;
    case 2:
      return KeyCode.Right;
    case 3:
      return KeyCode.Down;
    case 4:
      return KeyCode.Left;
    default:
      return KeyCode.Up;
  }
}
