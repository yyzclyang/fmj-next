import { Character, type CharacterData } from './character';

export interface NpcData extends CharacterData {
  readonly delay: number;
}

export class Npc extends Character {
  delay: number;

  constructor(data: NpcData) {
    super(data);
    this.delay = data.delay;
  }
}
