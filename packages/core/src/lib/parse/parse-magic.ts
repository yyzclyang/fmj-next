import {
  MagicAttack,
  MagicAuxiliary,
  MagicEnhance,
  MagicRestore,
  MagicSpecial,
  ResMagicChain,
  type BaseMagic,
  type BaseMagicData,
  type ResMagicChainData,
} from '@/magic';
import type { DatLib } from '../dat-lib';
import { readGbkString, readInt16, readUint16 } from '../resource-utils';

export function parseMagicResource(datLib: DatLib, buffer: Uint8Array, type: number, offset: number): BaseMagic | null {
  const baseData = parseBaseMagicData(datLib, buffer, offset);
  switch (type) {
    case 1:
      return new MagicAttack({
        ...baseData,
        affectHp: readInt16(buffer, offset + 0x12),
        affectMp: readInt16(buffer, offset + 0x14),
        defensePercent: buffer[offset + 0x16] ?? 0,
        attackPercent: buffer[offset + 0x17] ?? 0,
        statusFlags: buffer[offset + 0x18] ?? 0,
        agilityPercent: buffer[offset + 0x19] ?? 0,
      });
    case 2:
      return new MagicEnhance({
        ...baseData,
        defensePercent: buffer[offset + 0x16] ?? 0,
        attackPercent: buffer[offset + 0x17] ?? 0,
        statusRound: ((buffer[offset + 0x18] ?? 0) >> 4) & 0x0f,
        agilityPercent: buffer[offset + 0x19] ?? 0,
      });
    case 3:
      return new MagicRestore({
        ...baseData,
        hp: readUint16(buffer, offset + 0x12),
        cureFlags: buffer[offset + 0x18] ?? 0,
      });
    case 4:
      return new MagicAuxiliary({
        ...baseData,
        hpPercent: readUint16(buffer, offset + 0x12),
      });
    case 5:
      return new MagicSpecial(baseData);
    default:
      return null;
  }
}

export function parseMagicChainResource(datLib: DatLib, buffer: Uint8Array, offset: number): ResMagicChain {
  const data = parseMagicChainData(datLib, buffer, offset);
  return new ResMagicChain(data);
}

function parseMagicChainData(datLib: DatLib, buffer: Uint8Array, offset: number): ResMagicChainData {
  const magicSum = buffer[offset + 2] ?? 0;
  const magics: ResMagicChainData['magics'] = [];

  let pointer = offset + 3;
  for (let i = 0; i < magicSum; i += 1) {
    const magicType = buffer[pointer] ?? 0;
    const magicIndex = buffer[pointer + 1] ?? 0;
    pointer += 2;
    magics.push(datLib.getMagic(magicType, magicIndex));
  }

  return {
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    magicSum,
    learnNum: 0,
    magics,
  };
}

function parseBaseMagicData(datLib: DatLib, buffer: Uint8Array, offset: number): BaseMagicData {
  const roundFlag = buffer[offset + 3] ?? 0;
  const animationIndex = buffer[offset + 5] ?? 0;
  return {
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    roundNum: roundFlag & 0x7f,
    isForAll: (roundFlag & 0x80) !== 0,
    costMp: buffer[offset + 4] ?? 0,
    magicAni: animationIndex > 0 ? datLib.getSrs(2, animationIndex) : null,
    magicName: readGbkString(buffer, offset + 6),
    magicDescription: readMagicDescription(buffer, offset),
  };
}

function readMagicDescription(buffer: Uint8Array, offset: number): string {
  const declaredLength = buffer[offset + 2] ?? 0;
  if (declaredLength <= 0x70) return readGbkString(buffer, offset + 0x1a);

  // 原版会把 offset + 0x70 写成 0 来截断，这里复制切片避免修改共享资源缓冲区。
  const end = offset + 0x70;
  const slice = buffer.slice(offset + 0x1a, end);
  return readGbkString(slice, 0);
}
