import { readUint16 } from '@/lib/resource-utils';
import { BaseMagic } from './base-magic';

export class MagicAuxiliary extends BaseMagic {
  hpPercent = 0;

  protected setOtherData(buf: Uint8Array, offset: number): void {
    this.hpPercent = readUint16(buf, offset + 0x12);
  }
}
