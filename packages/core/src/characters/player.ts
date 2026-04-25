import { ResourceType, readGbkString, readUint16 } from '@/lib/resource-utils';
import { KeyCode } from '@/shared/key-code';
import { FightingCharacter } from './fighting-character';
import type { Direction } from './character';
import type { GoodsEquipment } from '@/goods';
import type { ResImage } from '@/lib/res-image';
import type { ResLevelupChain } from './res-levelup-chain';

export class Player extends FightingCharacter {
  headImage: ResImage | null = null;
  levelupChain: ResLevelupChain | null = null;
  currentExp = 0;
  readonly equipment: Array<GoodsEquipment | null> = Array.from({ length: 8 }, () => null);

  totalMaxHp = 0;
  totalMaxMp = 0;
  totalAttack = 0;
  totalDefend = 0;
  totalSpeed = 0;
  totalLingli = 0;
  totalLuck = 0;

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.headImage = this.index > 0 ? this.loadImage(ResourceType.PIC, 1, this.index) : null;
    this.walkingSprite = this.createWalkingSprite(this.type, buf[offset + 0x16] ?? 0);
    this.fightingSprite = this.createFightingSprite(ResourceType.PIC, this.index);
    this.direction = mapDirection(buf[offset + 2] ?? 0);
    this.step = buf[offset + 3] ?? 0;
    this.mapX = buf[offset + 5] ?? 0;
    this.mapY = buf[offset + 6] ?? 0;
    const magicChainIndex = buf[offset + 0x17] ?? 0;
    this.magicChain = magicChainIndex > 0 ? this.resources.getMagicChain(magicChainIndex) : null;
    this.learntMagicCount = buf[offset + 9] ?? 0;
    if (this.magicChain) this.magicChain.learnNum = this.learntMagicCount;
    this.name = readGbkString(buf, offset + 0x0a);
    this.level = buf[offset + 0x20] ?? 0;
    this.maxHp = readUint16(buf, offset + 0x26);
    this.hp = readUint16(buf, offset + 0x28);
    this.maxMp = readUint16(buf, offset + 0x2a);
    this.mp = readUint16(buf, offset + 0x2c);
    this.attack = readUint16(buf, offset + 0x2e);
    this.defend = readUint16(buf, offset + 0x30);
    this.currentExp = readUint16(buf, offset + 0x32);
    this.speed = buf[offset + 0x36] ?? 0;
    this.lingli = buf[offset + 0x37] ?? 0;
    this.luck = buf[offset + 0x38] ?? 0;

    this.totalMaxHp = this.maxHp;
    this.totalMaxMp = this.maxMp;
    this.totalAttack = this.attack;
    this.totalDefend = this.defend;
    this.totalSpeed = this.speed;
    this.totalLingli = this.lingli;
    this.totalLuck = this.luck;
    this.levelupChain = this.resources.getLevelupChain(this.index);
    this.readInitialEquipment(buf, offset);
  }

  private readInitialEquipment(buf: Uint8Array, offset: number): void {
    this.equipment[0] = this.readEquipment(6, buf[offset + 0x1e] ?? 0);
    this.equipment[1] = this.readEquipment(6, buf[offset + 0x1f] ?? 0);
    this.equipment[2] = this.readEquipment(5, buf[offset + 0x1b] ?? 0);
    this.equipment[3] = this.readEquipment(3, buf[offset + 0x1d] ?? 0);
    this.equipment[4] = this.readEquipment(7, buf[offset + 0x1c] ?? 0);
    this.equipment[5] = this.readEquipment(2, buf[offset + 0x19] ?? 0);
    this.equipment[6] = this.readEquipment(4, buf[offset + 0x1a] ?? 0);
    this.equipment[7] = this.readEquipment(1, buf[offset + 0x18] ?? 0);
  }

  private readEquipment(type: number, index: number): GoodsEquipment | null {
    return index > 0 ? this.loadEquipment(type, index) : null;
  }
}

export function mapDirection(value: number): Direction {
  switch (value) {
    case 1:
      return KeyCode.Up;
    case 2:
      return KeyCode.Right;
    case 3:
      return KeyCode.Down;
    case 4:
      return KeyCode.Left;
    default:
      return KeyCode.Up;
  }
}
