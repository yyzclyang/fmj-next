import {
  StatusSlots,
  CharacterState,
  Direction,
  Monster,
  Npc,
  Player,
  SceneObj,
  toCharacterState,
  toDirection,
  type CarryGoods,
  type CharacterData,
  type FightingCharacterData,
  type MonsterData,
  type PlayerData,
} from '@/characters';
import type { GoodsEquipment } from '@/goods';
import type { DatLib } from '../dat-lib';
import { ResourceType, readGbkString, readUint16 } from '../resource-utils';

export function parsePlayerResource(datLib: DatLib, buffer: Uint8Array, offset: number): Player {
  return createPlayer(datLib, buffer, offset);
}

export function parseNpcResource(datLib: DatLib, buffer: Uint8Array, offset: number): Npc {
  return createNpc(datLib, buffer, offset);
}

export function parseMonsterResource(datLib: DatLib, buffer: Uint8Array, offset: number): Monster {
  return createMonster(datLib, buffer, offset);
}

export function parseSceneObjResource(datLib: DatLib, buffer: Uint8Array, offset: number): SceneObj {
  return createSceneObj(datLib, buffer, offset);
}

function createPlayer(datLib: DatLib, buffer: Uint8Array, offset: number): Player {
  const type = buffer[offset] ?? 0;
  const index = buffer[offset + 1] ?? 0;
  const magicChainIndex = buffer[offset + 0x17] ?? 0;
  const magicChain = magicChainIndex > 0 ? datLib.getMagicChain(magicChainIndex) : null;
  const learnedMagicCount = buffer[offset + 9] ?? 0;
  if (magicChain) magicChain.learnedMagicCount = learnedMagicCount;
  const hpMax = readUint16(buffer, offset + 0x26);
  const mpMax = readUint16(buffer, offset + 0x2a);
  const attack = readUint16(buffer, offset + 0x2e);
  const defense = readUint16(buffer, offset + 0x30);
  const agility = buffer[offset + 0x36] ?? 0;
  const spirit = buffer[offset + 0x37] ?? 0;
  const luck = buffer[offset + 0x38] ?? 0;
  const equipment = createPlayerEquipment(datLib, buffer, offset);

  const data: PlayerData = {
    ...createFightingCharacterDefaults({
      type,
      index,
      name: readGbkString(buffer, offset + 0x0a),
      state: CharacterState.Stop,
      direction: toDirection(buffer[offset + 2] ?? 0),
      step: buffer[offset + 3] ?? 0,
      mapX: buffer[offset + 5] ?? 0,
      mapY: buffer[offset + 6] ?? 0,
      walkingSprite: datLib.createWalkingSprite(type, buffer[offset + 0x16] ?? 0),
    }),
    magicChain,
    learnedMagicCount,
    level: buffer[offset + 0x20] ?? 0,
    hpMax,
    hp: readUint16(buffer, offset + 0x28),
    mpMax,
    mp: readUint16(buffer, offset + 0x2c),
    attack,
    defense,
    agility,
    spirit,
    luck,
    immuneStatuses: StatusSlots.fromFlags(buffer[offset + 0x21] ?? 0, 0),
    fightingSprite: datLib.createFightingSprite(ResourceType.PIC, index),
    headImage: index > 0 ? datLib.getImage(ResourceType.PIC, 1, index) : null,
    levelUpChain: datLib.getLevelUpChain(index),
    exp: readUint16(buffer, offset + 0x32),
    equipment,
    onHitEffectRounds: buffer[offset + 0x39] ?? 0,
    onHitEffectFlags: buffer[offset + 0x22] ?? 0,
    coopMagicIndex: buffer[offset + 0x23] ?? 0,
    hpPerRound: buffer[offset + 0x24] ?? 0,
    mpPerRound: buffer[offset + 0x25] ?? 0,
  };

  return new Player(data);
}

function createNpc(datLib: DatLib, buffer: Uint8Array, offset: number): Npc {
  const delay = buffer[offset + 0x15] ?? 0;
  const state = delay === 0 ? CharacterState.Stop : toCharacterState(buffer[offset + 4] ?? 0);
  return new Npc({
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    name: readGbkString(buffer, offset + 9),
    state,
    direction: toDirection(buffer[offset + 2] ?? 0),
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
  const learnedMagicCount = buffer[offset + 2] ?? 0;
  if (magicChain) magicChain.learnedMagicCount = learnedMagicCount;
  const immuneStatuses = new StatusSlots();
  immuneStatuses.addFlags(buffer[offset + 3] ?? 0, 0);
  const onHitStatuses = new StatusSlots();
  onHitStatuses.addFlags(buffer[offset + 4] ?? 0, buffer[offset + 0x17] ?? 0);

  const data: MonsterData = {
    ...createFightingCharacterDefaults({
      type: buffer[offset] ?? 0,
      index: buffer[offset + 1] ?? 0,
      name: readGbkString(buffer, offset + 6),
      state: CharacterState.Stop,
      direction: Direction.South,
      step: 0,
      mapX: 0,
      mapY: 0,
      walkingSprite: null,
    }),
    magicChain,
    learnedMagicCount,
    level: buffer[offset + 0x12] ?? 0,
    agility: buffer[offset + 0x13] ?? 0,
    spirit: buffer[offset + 0x14] ?? 0,
    luck: buffer[offset + 0x16] ?? 0,
    hpMax: readUint16(buffer, offset + 0x18),
    hp: readUint16(buffer, offset + 0x1a),
    mpMax: readUint16(buffer, offset + 0x1c),
    mp: readUint16(buffer, offset + 0x1e),
    attack: readUint16(buffer, offset + 0x20),
    defense: readUint16(buffer, offset + 0x22),
    immuneStatuses,
    activeStatuses: new StatusSlots(),
    onHitStatuses,
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
    state: toCharacterState(buffer[offset + 4] ?? 0),
    direction: Direction.North,
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
    learnedMagicCount: 0,
    level: 0,
    hpMax: 0,
    hp: 0,
    mpMax: 0,
    mp: 0,
    attack: 0,
    defense: 0,
    agility: 0,
    spirit: 0,
    luck: 0,
    immuneStatuses: new StatusSlots(),
    activeStatuses: new StatusSlots(),
    onHitStatuses: new StatusSlots(),
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
