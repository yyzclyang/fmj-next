import { readInt8 } from '@/lib/resource-utils';
import { MagicAttack } from '@/magic';
import { GoodsEquipment } from './goods-equipment';

export class GoodsDecorations extends GoodsEquipment {
  mp = 0;
  hp = 0;
  coopMagic: MagicAttack | null = null;

  protected override setOtherData(buf: Uint8Array, offset: number): void {
    this.mp = readInt8(buf, offset + 0x16);
    this.hp = readInt8(buf, offset + 0x17);
    this.defend = buf[offset + 0x18] ?? 0;
    this.attack = buf[offset + 0x19] ?? 0;
    this.lingli = readInt8(buf, offset + 0x1a);
    this.speed = readInt8(buf, offset + 0x1b);
    const magicIndex = buf[offset + 0x1c] ?? 0;
    const magic = magicIndex > 0 ? this.resources.getMagic(1, magicIndex) : null;
    this.coopMagic = magic instanceof MagicAttack ? magic : null;
    this.luck = readInt8(buf, offset + 0x1d);
  }
}
