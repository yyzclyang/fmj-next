import { readGbkString } from '@/lib/resource-utils';
import { KeyCode } from '@/shared/key-code';
import { Character } from './character';
import { mapCharacterState } from './npc';

export class SceneObj extends Character {
  delay = 0;

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.step = buf[offset + 3] ?? 0;
    this.state = mapCharacterState(buf[offset + 4] ?? 0);
    this.name = readGbkString(buf, offset + 9);
    this.delay = buf[offset + 0x15] ?? 0;
    this.walkingSprite = this.createWalkingSprite(4, buf[offset + 0x16] ?? 0);
    this.direction = KeyCode.Up;
  }
}
