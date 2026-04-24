import { readGbkString } from '@/lib/resource-utils';
import { Character, CharacterState } from './character';
import { mapDirection } from './player';

export class Npc extends Character {
  delay = 0;

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.direction = mapDirection(buf[offset + 2] ?? 0);
    this.step = buf[offset + 3] ?? 0;
    this.state = mapCharacterState(buf[offset + 4] ?? 0);
    this.name = readGbkString(buf, offset + 9);
    this.delay = buf[offset + 0x15] ?? 0;
    if (this.delay === 0) this.state = CharacterState.Stop;
    this.walkingSprite = this.createWalkingSprite(2, buf[offset + 0x16] ?? 0);
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
