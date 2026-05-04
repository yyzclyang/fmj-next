import {
  GoodsDecorations,
  GoodsDrama,
  GoodsEquipment,
  GoodsHiddenWeapon,
  GoodsMedicine,
  GoodsMedicineChg4Ever,
  GoodsMedicineLife,
  GoodsStimulant,
  GoodsTudun,
  GoodsWeapon,
  type BaseGoods,
  type BaseGoodsData,
  type GoodsEquipmentData,
} from '@/goods';
import { MagicAttack } from '@/magic';
import type { DatLib } from '../dat-lib';
import { ResSrs } from '../res-srs';
import { ResourceType, readGbkString, readInt8, readInt16, readUint16 } from '../resource-utils';

export function parseGoodsResource(datLib: DatLib, buffer: Uint8Array, type: number, offset: number): BaseGoods | null {
  const baseData = parseBaseGoodsData(datLib, buffer, offset);
  if (type >= 1 && type <= 5) return new GoodsEquipment(parseGoodsEquipmentData(buffer, baseData, offset));

  switch (type) {
    case 6: {
      const magicIndex = buffer[offset + 0x1c] ?? 0;
      const magic = magicIndex > 0 ? datLib.getMagic(1, magicIndex) : null;
      return new GoodsDecorations({
        ...parseGoodsEquipmentData(buffer, baseData, offset),
        mpMax: 0,
        hpMax: 0,
        bitEffect: 0,
        mp: readInt8(buffer, offset + 0x16),
        hp: readInt8(buffer, offset + 0x17),
        coopMagic: magic instanceof MagicAttack ? magic : null,
      });
    }
    case 7:
      return new GoodsWeapon({
        ...parseGoodsEquipmentData(buffer, baseData, offset),
        animation: new ResSrs(),
        affectMp: 0,
      });
    case 8: {
      const animationIndex = buffer[offset + 0x1a] ?? 0;
      const animationType = buffer[offset + 0x1b] ?? 0;
      return new GoodsHiddenWeapon({
        ...baseData,
        affectHp: readInt16(buffer, offset + 0x16),
        affectMp: readInt16(buffer, offset + 0x18),
        animation: animationIndex > 0 ? datLib.getSrs(animationType, animationIndex) : null,
        bitMask: buffer[offset + 0x1c] ?? 0,
      });
    }
    case 9: {
      const animationIndex = buffer[offset + 0x1a] ?? 0;
      return new GoodsMedicine({
        ...baseData,
        hp: readUint16(buffer, offset + 0x16),
        mp: readUint16(buffer, offset + 0x18),
        animation: animationIndex > 0 ? datLib.getSrs(2, animationIndex) : null,
        bitMask: buffer[offset + 0x1c] ?? 0,
      });
    }
    case 10:
      return new GoodsMedicineLife({
        ...baseData,
        percent: Math.min(buffer[offset + 0x17] ?? 0, 100),
      });
    case 11:
      return new GoodsMedicineChg4Ever({
        ...baseData,
        mpMax: readInt8(buffer, offset + 0x16),
        hpMax: readInt8(buffer, offset + 0x17),
        defend: readInt8(buffer, offset + 0x18),
        attack: readInt8(buffer, offset + 0x19),
        lingli: readInt8(buffer, offset + 0x1a),
        speed: readInt8(buffer, offset + 0x1b),
        luck: readInt8(buffer, offset + 0x1d),
      });
    case 12:
      return new GoodsStimulant({
        ...baseData,
        defendPercent: buffer[offset + 0x18] ?? 0,
        attackPercent: buffer[offset + 0x19] ?? 0,
        speedPercent: buffer[offset + 0x1b] ?? 0,
        forAll: ((buffer[offset + 0x1c] ?? 0) & 0x10) !== 0,
      });
    case 13:
      return new GoodsTudun(baseData);
    case 14:
      return new GoodsDrama(baseData);
    default:
      return null;
  }
}

function parseBaseGoodsData(datLib: DatLib, buffer: Uint8Array, offset: number): BaseGoodsData {
  const type = buffer[offset] ?? 0;
  return {
    type,
    index: buffer[offset + 1] ?? 0,
    enable: buffer[offset + 3] ?? 0,
    sumRound: buffer[offset + 4] ?? 0,
    image: datLib.getImage(ResourceType.GDP, type, buffer[offset + 5] ?? 0),
    name: readGbkString(buffer, offset + 6),
    buyPrice: readUint16(buffer, offset + 0x12),
    sellPrice: readUint16(buffer, offset + 0x14),
    description: readGbkString(buffer, offset + 0x1e),
    eventId: readUint16(buffer, offset + 0x84),
  };
}

function parseGoodsEquipmentData(buffer: Uint8Array, baseData: BaseGoodsData, offset: number): GoodsEquipmentData {
  return {
    ...baseData,
    mpMax: readInt8(buffer, offset + 0x16),
    hpMax: readInt8(buffer, offset + 0x17),
    defend: readInt8(buffer, offset + 0x18),
    attack: readInt8(buffer, offset + 0x19),
    lingli: readInt8(buffer, offset + 0x1a),
    speed: readInt8(buffer, offset + 0x1b),
    bitEffect: buffer[offset + 0x1c] ?? 0,
    luck: readInt8(buffer, offset + 0x1d),
  };
}
