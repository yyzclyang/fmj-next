import { isImageResourceType, ResImage } from './res-image';
import { ResBase } from './res-base';
import { ResGut } from './res-gut';
import { ResMap } from './res-map';
import { ResourceType, readGbkString, readInt8, readInt16, readUint16, serializeResourceKey, type ResourceKey } from './resource-utils';
import { ResSrs } from './res-srs';
import {
  Character,
  FightingSprite,
  Monster,
  Npc,
  Player,
  SceneObj,
  WalkingSprite,
  type CharacterResourceProvider,
} from '@/characters';
import {
  BaseGoods,
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
  type BaseGoodsData,
  type GoodsEquipmentData,
} from '@/goods';
import {
  BaseMagic,
  MagicAttack,
  MagicAuxiliary,
  MagicEnhance,
  MagicRestore,
  MagicSpecial,
  ResMagicChain,
  type BaseMagicData,
  type MagicChainResourceProvider,
} from '@/magic';
import { ResLevelupChain } from '@/characters/res-levelup-chain';

export class DatLib implements CharacterResourceProvider, MagicChainResourceProvider {
  private readonly offsets = new Map<string, number>();
  private readonly resourceKeys: ResourceKey[] = [];
  private readonly buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.loadOffsets();
  }

  getRes(resType: ResourceType, type: number, index: number): ResBase | null {
    // TODO: 后续给角色、道具等资源使用方补明确方法，减少直接依赖通用 getRes。
    const offset = this.offsets.get(serializeResourceKey({ resType, type, index })) ?? null;
    if (offset == null) return null;

    if (resType === ResourceType.MRS) {
      return this.createMagic(type, offset);
    }

    if (resType === ResourceType.GRS) {
      return this.createGoods(type, offset);
    }

    const res = this.createResource(resType, type);
    if (!res) return null;

    res.setData(this.buffer, offset);
    return res;
  }

  listResourceKeys(resType?: ResourceType): ResourceKey[] {
    const res = resType == null ? [...this.resourceKeys] : this.resourceKeys.filter(key => key.resType === resType);
    return res.sort((a, b) => a.resType - b.resType || a.type - b.type || a.index - b.index);
  }

  createWalkingSprite(type: number, index: number): WalkingSprite | null {
    const image = this.getImage(ResourceType.ACP, type, index);
    return image ? new WalkingSprite(image) : null;
  }

  createFightingSprite(resType: ResourceType, index: number): FightingSprite | null {
    const image = this.getImage(resType, 3, index);
    return image ? new FightingSprite(image) : null;
  }

  getImage(resType: ResourceType, type: number, index: number): ResImage | null {
    const res = this.getRes(resType, type, index);
    return res instanceof ResImage ? res : null;
  }

  getSrs(type: number, index: number): ResSrs | null {
    const res = this.getRes(ResourceType.SRS, type, index);
    return res instanceof ResSrs ? res : null;
  }

  getEquipment(type: number, index: number): GoodsEquipment | null {
    const goods = this.getGoods(type, index);
    return goods instanceof GoodsEquipment ? goods : null;
  }

  getGoods(type: number, index: number): BaseGoods | null {
    const res = this.getRes(ResourceType.GRS, type, index);
    return res instanceof BaseGoods ? res : null;
  }

  getMagic(type: number, index: number): BaseMagic | null {
    const res = this.getRes(ResourceType.MRS, type, index);
    return res instanceof BaseMagic ? res : null;
  }

  getMagicChain(index: number): ResMagicChain | null {
    const res = this.getRes(ResourceType.MLR, 1, index);
    return res instanceof ResMagicChain ? res : null;
  }

  getLevelupChain(index: number): ResLevelupChain | null {
    const res = this.getRes(ResourceType.MLR, 2, index);
    return res instanceof ResLevelupChain ? res : null;
  }

  private createResource(resType: ResourceType, type: number): ResBase | null {
    switch (resType) {
      case ResourceType.GUT:
        return new ResGut();
      case ResourceType.MAP:
        return new ResMap();
      case ResourceType.ARS:
        return this.createCharacter(type);
      case ResourceType.SRS:
        return new ResSrs();
      case ResourceType.MLR:
        return this.createMlr(type);
      default:
        return isImageResourceType(resType) ? new ResImage() : null;
    }
  }

  private createMlr(type: number): ResBase | null {
    switch (type) {
      case 1:
        return new ResMagicChain(this);
      case 2:
        return new ResLevelupChain();
      default:
        return null;
    }
  }

  private createMagic(type: number, offset: number): BaseMagic | null {
    const baseData = this.parseBaseMagicData(offset);
    switch (type) {
      case 1:
        return new MagicAttack({
          ...baseData,
          affectHp: readInt16(this.buffer, offset + 0x12),
          affectMp: readInt16(this.buffer, offset + 0x14),
          defendPercent: this.buffer[offset + 0x16] ?? 0,
          attackPercent: this.buffer[offset + 0x17] ?? 0,
          buffMask: this.buffer[offset + 0x18] ?? 0,
          speedPercent: this.buffer[offset + 0x19] ?? 0,
        });
      case 2:
        return new MagicEnhance({
          ...baseData,
          defendPercent: this.buffer[offset + 0x16] ?? 0,
          attackPercent: this.buffer[offset + 0x17] ?? 0,
          buffRound: ((this.buffer[offset + 0x18] ?? 0) >> 4) & 0x0f,
          speedPercent: this.buffer[offset + 0x19] ?? 0,
        });
      case 3:
        return new MagicRestore({
          ...baseData,
          hp: readUint16(this.buffer, offset + 0x12),
          cureMask: this.buffer[offset + 0x18] ?? 0,
        });
      case 4:
        return new MagicAuxiliary({
          ...baseData,
          hpPercent: readUint16(this.buffer, offset + 0x12),
        });
      case 5:
        return new MagicSpecial(baseData);
      default:
        return null;
    }
  }

  private createGoods(type: number, offset: number): BaseGoods | null {
    const baseData = this.parseBaseGoodsData(offset);
    if (type >= 1 && type <= 5) return new GoodsEquipment(this.parseGoodsEquipmentData(baseData, offset));

    switch (type) {
      case 6: {
        const magicIndex = this.buffer[offset + 0x1c] ?? 0;
        const magic = magicIndex > 0 ? this.getMagic(1, magicIndex) : null;
        return new GoodsDecorations({
          ...this.parseGoodsEquipmentData(baseData, offset),
          mpMax: 0,
          hpMax: 0,
          bitEffect: 0,
          mp: readInt8(this.buffer, offset + 0x16),
          hp: readInt8(this.buffer, offset + 0x17),
          coopMagic: magic instanceof MagicAttack ? magic : null,
        });
      }
      case 7:
        return new GoodsWeapon({
          ...this.parseGoodsEquipmentData(baseData, offset),
          animation: new ResSrs(),
          affectMp: 0,
        });
      case 8: {
        const animationIndex = this.buffer[offset + 0x1a] ?? 0;
        const animationType = this.buffer[offset + 0x1b] ?? 0;
        return new GoodsHiddenWeapon({
          ...baseData,
          affectHp: readInt16(this.buffer, offset + 0x16),
          affectMp: readInt16(this.buffer, offset + 0x18),
          animation: animationIndex > 0 ? this.getSrs(animationType, animationIndex) : null,
          bitMask: this.buffer[offset + 0x1c] ?? 0,
        });
      }
      case 9: {
        const animationIndex = this.buffer[offset + 0x1a] ?? 0;
        return new GoodsMedicine({
          ...baseData,
          hp: readUint16(this.buffer, offset + 0x16),
          mp: readUint16(this.buffer, offset + 0x18),
          animation: animationIndex > 0 ? this.getSrs(2, animationIndex) : null,
          bitMask: this.buffer[offset + 0x1c] ?? 0,
        });
      }
      case 10:
        return new GoodsMedicineLife({
          ...baseData,
          percent: Math.min(this.buffer[offset + 0x17] ?? 0, 100),
        });
      case 11:
        return new GoodsMedicineChg4Ever({
          ...baseData,
          mpMax: readInt8(this.buffer, offset + 0x16),
          hpMax: readInt8(this.buffer, offset + 0x17),
          defend: this.buffer[offset + 0x18] ?? 0,
          attack: this.buffer[offset + 0x19] ?? 0,
          lingli: readInt8(this.buffer, offset + 0x1a),
          speed: readInt8(this.buffer, offset + 0x1b),
          luck: readInt8(this.buffer, offset + 0x1d),
        });
      case 12:
        return new GoodsStimulant({
          ...baseData,
          defendPercent: this.buffer[offset + 0x18] ?? 0,
          attackPercent: this.buffer[offset + 0x19] ?? 0,
          speedPercent: this.buffer[offset + 0x1b] ?? 0,
          forAll: ((this.buffer[offset + 0x1c] ?? 0) & 0x10) !== 0,
        });
      case 13:
        return new GoodsTudun(baseData);
      case 14:
        return new GoodsDrama(baseData);
      default:
        return null;
    }
  }

  private parseBaseGoodsData(offset: number): BaseGoodsData {
    const type = this.buffer[offset] ?? 0;
    return {
      type,
      index: this.buffer[offset + 1] ?? 0,
      enable: this.buffer[offset + 3] ?? 0,
      sumRound: this.buffer[offset + 4] ?? 0,
      image: this.getImage(ResourceType.GDP, type, this.buffer[offset + 5] ?? 0),
      name: readGbkString(this.buffer, offset + 6),
      buyPrice: readUint16(this.buffer, offset + 0x12),
      sellPrice: readUint16(this.buffer, offset + 0x14),
      description: readGbkString(this.buffer, offset + 0x1e),
      eventId: readUint16(this.buffer, offset + 0x84),
    };
  }

  private parseGoodsEquipmentData(baseData: BaseGoodsData, offset: number): GoodsEquipmentData {
    return {
      ...baseData,
      mpMax: readInt8(this.buffer, offset + 0x16),
      hpMax: readInt8(this.buffer, offset + 0x17),
      defend: this.buffer[offset + 0x18] ?? 0,
      attack: this.buffer[offset + 0x19] ?? 0,
      lingli: readInt8(this.buffer, offset + 0x1a),
      speed: readInt8(this.buffer, offset + 0x1b),
      bitEffect: this.buffer[offset + 0x1c] ?? 0,
      luck: readInt8(this.buffer, offset + 0x1d),
    };
  }

  private parseBaseMagicData(offset: number): BaseMagicData {
    const roundFlag = this.buffer[offset + 3] ?? 0;
    const animationIndex = this.buffer[offset + 5] ?? 0;
    return {
      type: this.buffer[offset] ?? 0,
      index: this.buffer[offset + 1] ?? 0,
      roundNum: roundFlag & 0x7f,
      isForAll: (roundFlag & 0x80) !== 0,
      costMp: this.buffer[offset + 4] ?? 0,
      magicAni: animationIndex > 0 ? this.getSrs(2, animationIndex) : null,
      magicName: readGbkString(this.buffer, offset + 6),
      magicDescription: this.readMagicDescription(offset),
    };
  }

  private readMagicDescription(offset: number): string {
    const declaredLength = this.buffer[offset + 2] ?? 0;
    if (declaredLength <= 0x70) return readGbkString(this.buffer, offset + 0x1a);

    // 原版会把 offset + 0x70 写成 0 来截断，这里复制切片避免修改共享资源缓冲区。
    const end = offset + 0x70;
    const slice = this.buffer.slice(offset + 0x1a, end);
    return readGbkString(slice, 0);
  }

  private createCharacter(type: number): Character | null {
    switch (type) {
      case 1:
        return new Player(this);
      case 2:
        return new Npc(this);
      case 3:
        return new Monster(this);
      case 4:
        return new SceneObj(this);
      default:
        return null;
    }
  }

  private loadOffsets(): void {
    let keyPtr = 0x10;
    let offsetPtr = 0x2000;

    while (keyPtr + 2 < this.buffer.length && this.buffer[keyPtr] !== 0xff) {
      const resType = this.buffer[keyPtr] as ResourceType;
      const type = this.buffer[keyPtr + 1] ?? 0;
      const index = this.buffer[keyPtr + 2] ?? 0;
      const block = this.buffer[offsetPtr] ?? 0;
      const low = this.buffer[offsetPtr + 1] ?? 0;
      const high = this.buffer[offsetPtr + 2] ?? 0;
      const offset = block * 0x4000 + (high << 8) + low;

      if (offset >= 0 && offset < this.buffer.length) {
        const key = { resType, type, index };
        this.offsets.set(serializeResourceKey(key), offset);
        this.resourceKeys.push(key);
      }

      keyPtr += 3;
      offsetPtr += 3;
    }
  }
}
