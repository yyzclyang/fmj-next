import { Character, type CharacterData } from './character';

export interface SceneObjData extends CharacterData {
  readonly delay: number;
}

export class SceneObj extends Character {
  delay: number;

  constructor(data: SceneObjData) {
    super(data);
    this.delay = data.delay;
  }
}
