import { ResourceType, readGbkString, readUint16 } from '@/lib/resource-utils';
import type { BaseGoods } from '@/goods';
import { FightingCharacter } from './fighting-character';

export interface CarryGoods {
  readonly goods: BaseGoods;
  count: number;
}

export class Monster extends FightingCharacter {
  iq = 0;
  money = 0;
  exp = 0;
  stealGoods: CarryGoods | null = null;
  dropGoods: CarryGoods | null = null;

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    const magicIndex = buf[offset + 0x2f] ?? 0;
    this.magicChain = magicIndex > 0 ? this.resources.getMagicChain(magicIndex) : null;
    this.learntMagicCount = buf[offset + 2] ?? 0;
    if (this.magicChain) this.magicChain.learnNum = this.learntMagicCount;
    this.buff.addBuff(buf[offset + 3] ?? 0, 0);
    this.atbuff.addBuff(buf[offset + 4] ?? 0, buf[offset + 0x17] ?? 0);
    this.name = readGbkString(buf, offset + 6);
    this.level = buf[offset + 0x12] ?? 0;
    this.speed = buf[offset + 0x13] ?? 0;
    this.lingli = buf[offset + 0x14] ?? 0;
    this.iq = buf[offset + 0x15] ?? 0;
    this.luck = buf[offset + 0x16] ?? 0;
    this.maxHp = readUint16(buf, offset + 0x18);
    this.hp = readUint16(buf, offset + 0x1a);
    this.maxMp = readUint16(buf, offset + 0x1c);
    this.mp = readUint16(buf, offset + 0x1e);
    this.attack = readUint16(buf, offset + 0x20);
    this.defend = readUint16(buf, offset + 0x22);
    this.money = readUint16(buf, offset + 0x24);
    this.exp = readUint16(buf, offset + 0x26);
    this.stealGoods = this.readCarryGoods(buf[offset + 0x28] ?? 0, buf[offset + 0x29] ?? 0, buf[offset + 0x2a] ?? 0);
    this.dropGoods = this.readCarryGoods(buf[offset + 0x2b] ?? 0, buf[offset + 0x2c] ?? 0, buf[offset + 0x2d] ?? 0);
    this.fightingSprite = this.createFightingSprite(ResourceType.ACP, buf[offset + 0x2e] ?? 0);
  }

  private readCarryGoods(type: number, index: number, count: number): CarryGoods | null {
    if (type <= 0 || index <= 0 || count <= 0) return null;
    const goods = this.loadGoods(type, index);
    return goods ? { goods, count } : null;
  }
}
