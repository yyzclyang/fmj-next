import {
  BuffMan,
  CharacterState,
  Monster,
  Npc,
  Player,
  SceneObj,
  mapCharacterState,
  mapDirection,
  type CarryGoods,
  type Character,
  type CharacterData,
  type FightingCharacterData,
  type MonsterData,
  type PlayerData,
} from '@/characters';
import type { GoodsEquipment } from '@/goods';
import { KeyCode } from '@/shared/key-code';
import type { DatLib } from '../dat-lib';
import { ResourceType, readGbkString, readUint16 } from '../resource-utils';

export function parseCharacterResource(
  datLib: DatLib,
  buffer: Uint8Array,
  type: number,
  offset: number
): Character | null {
  switch (type) {
    case 1:
      return createPlayer(datLib, buffer, offset);
    case 2:
      return createNpc(datLib, buffer, offset);
    case 3:
      return createMonster(datLib, buffer, offset);
    case 4:
      return createSceneObj(datLib, buffer, offset);
    default:
      return null;
  }
}

function createPlayer(datLib: DatLib, buffer: Uint8Array, offset: number): Player {
  const type = buffer[offset] ?? 0;
  const index = buffer[offset + 1] ?? 0;
  const magicChainIndex = buffer[offset + 0x17] ?? 0;
  const magicChain = magicChainIndex > 0 ? datLib.getMagicChain(magicChainIndex) : null;
  const learntMagicCount = buffer[offset + 9] ?? 0;
  if (magicChain) magicChain.learnNum = learntMagicCount;
  const maxHp = readUint16(buffer, offset + 0x26);
  const maxMp = readUint16(buffer, offset + 0x2a);
  const attack = readUint16(buffer, offset + 0x2e);
  const defend = readUint16(buffer, offset + 0x30);
  const speed = buffer[offset + 0x36] ?? 0;
  const lingli = buffer[offset + 0x37] ?? 0;
  const luck = buffer[offset + 0x38] ?? 0;
  const equipment = createPlayerEquipment(datLib, buffer, offset);

  const data: PlayerData = {
    ...createFightingCharacterDefaults({
      type,
      index,
      name: readGbkString(buffer, offset + 0x0a),
      state: CharacterState.Stop,
      direction: mapDirection(buffer[offset + 2] ?? 0),
      step: buffer[offset + 3] ?? 0,
      mapX: buffer[offset + 5] ?? 0,
      mapY: buffer[offset + 6] ?? 0,
      walkingSprite: datLib.createWalkingSprite(type, buffer[offset + 0x16] ?? 0),
    }),
    magicChain,
    learntMagicCount,
    level: buffer[offset + 0x20] ?? 0,
    maxHp,
    hp: readUint16(buffer, offset + 0x28),
    maxMp,
    mp: readUint16(buffer, offset + 0x2c),
    attack,
    defend,
    speed,
    lingli,
    luck,
    fightingSprite: datLib.createFightingSprite(ResourceType.PIC, index),
    headImage: index > 0 ? datLib.getImage(ResourceType.PIC, 1, index) : null,
    levelUpChain: datLib.getLevelupChain(index),
    currentExp: readUint16(buffer, offset + 0x32),
    equipment,
    totalMaxHp: maxHp,
    totalMaxMp: maxMp,
    totalAttack: attack,
    totalDefend: defend,
    totalSpeed: speed,
    totalLingli: lingli,
    totalLuck: luck,
  };

  return new Player(data);
}

function createNpc(datLib: DatLib, buffer: Uint8Array, offset: number): Npc {
  const delay = buffer[offset + 0x15] ?? 0;
  const state = delay === 0 ? CharacterState.Stop : mapCharacterState(buffer[offset + 4] ?? 0);
  return new Npc({
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    name: readGbkString(buffer, offset + 9),
    state,
    direction: mapDirection(buffer[offset + 2] ?? 0),
    step: buffer[offset + 3] ?? 0,
    mapX: 0,
    mapY: 0,
    walkingSprite: datLib.createWalkingSprite(2, buffer[offset + 0x16] ?? 0),
    delay,
  });
}

function createMonster(datLib: DatLib, buffer: Uint8Array, offset: number): Monster {
  const magicIndex = buffer[offset + 0x2f] ?? 0;
  const magicChain = magicIndex > 0 ? datLib.getMagicChain(magicIndex) : null;
  const learntMagicCount = buffer[offset + 2] ?? 0;
  if (magicChain) magicChain.learnNum = learntMagicCount;
  const buff = new BuffMan();
  buff.addBuff(buffer[offset + 3] ?? 0, 0);
  const atbuff = new BuffMan();
  atbuff.addBuff(buffer[offset + 4] ?? 0, buffer[offset + 0x17] ?? 0);

  const data: MonsterData = {
    ...createFightingCharacterDefaults({
      type: buffer[offset] ?? 0,
      index: buffer[offset + 1] ?? 0,
      name: readGbkString(buffer, offset + 6),
      state: CharacterState.Stop,
      direction: KeyCode.Down,
      step: 0,
      mapX: 0,
      mapY: 0,
      walkingSprite: null,
    }),
    magicChain,
    learntMagicCount,
    level: buffer[offset + 0x12] ?? 0,
    speed: buffer[offset + 0x13] ?? 0,
    lingli: buffer[offset + 0x14] ?? 0,
    luck: buffer[offset + 0x16] ?? 0,
    maxHp: readUint16(buffer, offset + 0x18),
    hp: readUint16(buffer, offset + 0x1a),
    maxMp: readUint16(buffer, offset + 0x1c),
    mp: readUint16(buffer, offset + 0x1e),
    attack: readUint16(buffer, offset + 0x20),
    defend: readUint16(buffer, offset + 0x22),
    buff,
    debuff: new BuffMan(),
    atbuff,
    fightingSprite: datLib.createFightingSprite(ResourceType.ACP, buffer[offset + 0x2e] ?? 0),
    iq: buffer[offset + 0x15] ?? 0,
    money: readUint16(buffer, offset + 0x24),
    exp: readUint16(buffer, offset + 0x26),
    stealGoods: readCarryGoods(
      datLib,
      buffer[offset + 0x28] ?? 0,
      buffer[offset + 0x29] ?? 0,
      buffer[offset + 0x2a] ?? 0
    ),
    dropGoods: readCarryGoods(
      datLib,
      buffer[offset + 0x2b] ?? 0,
      buffer[offset + 0x2c] ?? 0,
      buffer[offset + 0x2d] ?? 0
    ),
  };

  return new Monster(data);
}

function createSceneObj(datLib: DatLib, buffer: Uint8Array, offset: number): SceneObj {
  return new SceneObj({
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    name: readGbkString(buffer, offset + 9),
    state: mapCharacterState(buffer[offset + 4] ?? 0),
    direction: KeyCode.Up,
    step: buffer[offset + 3] ?? 0,
    mapX: 0,
    mapY: 0,
    walkingSprite: datLib.createWalkingSprite(4, buffer[offset + 0x16] ?? 0),
    delay: buffer[offset + 0x15] ?? 0,
  });
}

function createFightingCharacterDefaults(characterData: CharacterData): FightingCharacterData {
  return {
    ...characterData,
    magicChain: null,
    learntMagicCount: 0,
    level: 0,
    maxHp: 0,
    hp: 0,
    maxMp: 0,
    mp: 0,
    attack: 0,
    defend: 0,
    speed: 0,
    lingli: 0,
    luck: 0,
    buff: new BuffMan(),
    debuff: new BuffMan(),
    atbuff: new BuffMan(),
    fightingSprite: null,
  };
}

function createPlayerEquipment(datLib: DatLib, buffer: Uint8Array, offset: number): Array<GoodsEquipment | null> {
  return [
    readEquipment(datLib, 6, buffer[offset + 0x1e] ?? 0),
    readEquipment(datLib, 6, buffer[offset + 0x1f] ?? 0),
    readEquipment(datLib, 5, buffer[offset + 0x1b] ?? 0),
    readEquipment(datLib, 3, buffer[offset + 0x1d] ?? 0),
    readEquipment(datLib, 7, buffer[offset + 0x1c] ?? 0),
    readEquipment(datLib, 2, buffer[offset + 0x19] ?? 0),
    readEquipment(datLib, 4, buffer[offset + 0x1a] ?? 0),
    readEquipment(datLib, 1, buffer[offset + 0x18] ?? 0),
  ];
}

function readEquipment(datLib: DatLib, type: number, index: number): GoodsEquipment | null {
  return index > 0 ? datLib.getEquipment(type, index) : null;
}

function readCarryGoods(datLib: DatLib, type: number, index: number, count: number): CarryGoods | null {
  if (type <= 0 || index <= 0 || count <= 0) return null;
  const goods = datLib.getGoods(type, index);
  return goods ? { goods, count } : null;
}
