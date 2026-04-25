import { readUint16 } from '@/lib/resource-utils';
import { BaseMagic } from './base-magic';

export class MagicRestore extends BaseMagic {
  hp = 0;
  cureMask = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.hp = readUint16(buf, offset + 0x12);
    this.cureMask = buf[offset + 0x18] ?? 0;
  }
}
