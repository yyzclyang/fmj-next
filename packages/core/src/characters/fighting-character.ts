import { Character } from './character';
import { BuffMan } from './buff';
import type { ResourceRef } from './character';
import type { FightingSprite } from './fighting-sprite';

export abstract class FightingCharacter extends Character {
  magicChainRef: ResourceRef | null = null;
  learntMagicCount = 0;
  level = 0;
  maxHp = 0;
  hp = 0;
  maxMp = 0;
  mp = 0;
  attack = 0;
  defend = 0;
  speed = 0;
  lingli = 0;
  luck = 0;
  buff = new BuffMan();
  debuff = new BuffMan();
  atbuff = new BuffMan();
  fightingSprite: FightingSprite | null = null;

  get isAlive(): boolean {
    return this.hp > 0;
  }
}
