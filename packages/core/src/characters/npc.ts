import { Character, CharacterState, type CharacterData } from './character';

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

export function mapCharacterState(value: number): CharacterState {
  switch (value) {
    case 1:
      return CharacterState.ForceMove;
    case 2:
      return CharacterState.Walking;
    case 3:
      return CharacterState.Pause;
    case 4:
      return CharacterState.Active;
    default:
      return CharacterState.Stop;
  }
}
