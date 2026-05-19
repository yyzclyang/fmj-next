import type { ResMagicChain } from '@/magic';
import { Character, type CharacterData } from './character';
import { StatusSlots } from './status';
import type { FightingSprite } from './fighting-sprite';

export interface FightingAttributeValues {
  readonly hpMax: number;
  readonly mpMax: number;
  readonly attack: number;
  readonly defense: number;
  readonly agility: number;
  readonly spirit: number;
  readonly luck: number;
}

export interface FightingCharacterData extends CharacterData {
  readonly magicChain: ResMagicChain | null;
  readonly learnedMagicCount: number;
  readonly level: number;
  readonly hpMax: number;
  readonly hp: number;
  readonly mpMax: number;
  readonly mp: number;
  readonly attack: number;
  readonly defense: number;
  readonly agility: number;
  readonly spirit: number;
  readonly luck: number;
  readonly immuneStatuses: StatusSlots;
  readonly activeStatuses: StatusSlots;
  readonly onHitStatuses: StatusSlots;
  readonly fightingSprite: FightingSprite | null;
}

export abstract class FightingCharacter extends Character {
  magicChain: ResMagicChain | null;
  learnedMagicCount: number;
  level: number;
  hpMax: number;
  hp: number;
  mpMax: number;
  mp: number;
  attack: number;
  defense: number;
  agility: number;
  spirit: number;
  luck: number;
  immuneStatuses: StatusSlots;
  activeStatuses: StatusSlots;
  onHitStatuses: StatusSlots;
  fightingSprite: FightingSprite | null;

  protected constructor(data: FightingCharacterData) {
    super(data);
    this.magicChain = data.magicChain;
    this.learnedMagicCount = data.learnedMagicCount;
    this.level = data.level;
    this.hpMax = data.hpMax;
    this.hp = data.hp;
    this.mpMax = data.mpMax;
    this.mp = data.mp;
    this.attack = data.attack;
    this.defense = data.defense;
    this.agility = data.agility;
    this.spirit = data.spirit;
    this.luck = data.luck;
    this.immuneStatuses = data.immuneStatuses;
    this.activeStatuses = data.activeStatuses;
    this.onHitStatuses = data.onHitStatuses;
    this.fightingSprite = data.fightingSprite;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get totalHpMax(): number {
    return this.hpMax;
  }

  get totalMpMax(): number {
    return this.mpMax;
  }

  get totalAttack(): number {
    return this.attack;
  }

  get totalDefense(): number {
    return this.defense;
  }

  get totalAgility(): number {
    return this.agility;
  }

  get totalSpirit(): number {
    return this.spirit;
  }

  get totalLuck(): number {
    return this.luck;
  }
}
