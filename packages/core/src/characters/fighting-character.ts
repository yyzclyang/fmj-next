import { Character, type CharacterData } from './character';
import { BuffMan } from './buff';
import type { FightingSprite } from './fighting-sprite';
import type { ResMagicChain } from '@/magic';

export interface FightingCharacterData extends CharacterData {
  readonly magicChain: ResMagicChain | null;
  readonly learntMagicCount: number;
  readonly level: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly maxMp: number;
  readonly mp: number;
  readonly attack: number;
  readonly defend: number;
  readonly speed: number;
  readonly lingli: number;
  readonly luck: number;
  readonly buff: BuffMan;
  readonly debuff: BuffMan;
  readonly atbuff: BuffMan;
  readonly fightingSprite: FightingSprite | null;
}

export abstract class FightingCharacter extends Character {
  magicChain: ResMagicChain | null;
  learntMagicCount: number;
  level: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  attack: number;
  defend: number;
  speed: number;
  lingli: number;
  luck: number;
  buff: BuffMan;
  debuff: BuffMan;
  atbuff: BuffMan;
  fightingSprite: FightingSprite | null;

  protected constructor(data: FightingCharacterData) {
    super(data);
    this.magicChain = data.magicChain;
    this.learntMagicCount = data.learntMagicCount;
    this.level = data.level;
    this.maxHp = data.maxHp;
    this.hp = data.hp;
    this.maxMp = data.maxMp;
    this.mp = data.mp;
    this.attack = data.attack;
    this.defend = data.defend;
    this.speed = data.speed;
    this.lingli = data.lingli;
    this.luck = data.luck;
    this.buff = data.buff;
    this.debuff = data.debuff;
    this.atbuff = data.atbuff;
    this.fightingSprite = data.fightingSprite;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }
}
