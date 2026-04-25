import { isImageResourceType, ResImage } from './res-image';
import { ResBase } from './res-base';
import { ResGut } from './res-gut';
import { ResMap } from './res-map';
import { ResourceType, readGbkString, readInt8, readInt16, readUint16, serializeResourceKey, type ResourceKey } from './resource-utils';
import { ResSrs } from './res-srs';
import {
  BuffMan,
  Character,
  CharacterState,
  FightingSprite,
  Monster,
  Npc,
  Player,
  SceneObj,
  WalkingSprite,
  mapCharacterState,
  mapDirection,
  type CarryGoods,
  type CharacterData,
  type FightingCharacterData,
  type MonsterData,
  type PlayerData,
} from '@/characters';
import { KeyCode } from '@/shared/key-code';
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
import { ResLevelUpChain, type ResLevelUpChainData } from '@/characters/res-level-up-chain';

const LEVEL_UP_CHAIN_LEVEL_BYTES = 20;

export class DatLib implements MagicChainResourceProvider {
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

    if (resType === ResourceType.ARS) {
      return this.createCharacter(type, offset);
    }

    if (resType === ResourceType.MLR && type === 2) {
      return this.createLevelUpChain(offset);
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

  getLevelupChain(index: number): ResLevelUpChain | null {
    const res = this.getRes(ResourceType.MLR, 2, index);
    return res instanceof ResLevelUpChain ? res : null;
  }

  private createResource(resType: ResourceType, type: number): ResBase | null {
    switch (resType) {
      case ResourceType.GUT:
        return new ResGut();
      case ResourceType.MAP:
        return new ResMap();
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
      default:
        return null;
    }
  }

  private createLevelUpChain(offset: number): ResLevelUpChain {
    const data = this.parseLevelUpChainData(offset);
    return new ResLevelUpChain(data);
  }

  private parseLevelUpChainData(offset: number): ResLevelUpChainData {
    let maxLevel = this.buffer[offset + 2] ?? 0;
    if (maxLevel <= 0) maxLevel = 99;
    const dataStart = offset + 4;
    const dataEnd = dataStart + maxLevel * LEVEL_UP_CHAIN_LEVEL_BYTES;
    return {
      type: this.buffer[offset] ?? 0,
      index: this.buffer[offset + 1] ?? 0,
      maxLevel,
      levelData: this.buffer.slice(dataStart, Math.min(dataEnd, this.buffer.length)),
    };
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

  private createCharacter(type: number, offset: number): Character | null {
    switch (type) {
      case 1:
        return this.createPlayer(offset);
      case 2:
        return this.createNpc(offset);
      case 3:
        return this.createMonster(offset);
      case 4:
        return this.createSceneObj(offset);
      default:
        return null;
    }
  }

  private createPlayer(offset: number): Player {
    const type = this.buffer[offset] ?? 0;
    const index = this.buffer[offset + 1] ?? 0;
    const magicChainIndex = this.buffer[offset + 0x17] ?? 0;
    const magicChain = magicChainIndex > 0 ? this.getMagicChain(magicChainIndex) : null;
    const learntMagicCount = this.buffer[offset + 9] ?? 0;
    if (magicChain) magicChain.learnNum = learntMagicCount;
    const maxHp = readUint16(this.buffer, offset + 0x26);
    const maxMp = readUint16(this.buffer, offset + 0x2a);
    const attack = readUint16(this.buffer, offset + 0x2e);
    const defend = readUint16(this.buffer, offset + 0x30);
    const speed = this.buffer[offset + 0x36] ?? 0;
    const lingli = this.buffer[offset + 0x37] ?? 0;
    const luck = this.buffer[offset + 0x38] ?? 0;
    const equipment = this.createPlayerEquipment(offset);

    const data: PlayerData = {
      ...this.createFightingCharacterDefaults({
        type,
        index,
        name: readGbkString(this.buffer, offset + 0x0a),
        state: CharacterState.Stop,
        direction: mapDirection(this.buffer[offset + 2] ?? 0),
        step: this.buffer[offset + 3] ?? 0,
        mapX: this.buffer[offset + 5] ?? 0,
        mapY: this.buffer[offset + 6] ?? 0,
        walkingSprite: this.createWalkingSprite(type, this.buffer[offset + 0x16] ?? 0),
      }),
      magicChain,
      learntMagicCount,
      level: this.buffer[offset + 0x20] ?? 0,
      maxHp,
      hp: readUint16(this.buffer, offset + 0x28),
      maxMp,
      mp: readUint16(this.buffer, offset + 0x2c),
      attack,
      defend,
      speed,
      lingli,
      luck,
      fightingSprite: this.createFightingSprite(ResourceType.PIC, index),
      headImage: index > 0 ? this.getImage(ResourceType.PIC, 1, index) : null,
      levelUpChain: this.getLevelupChain(index),
      currentExp: readUint16(this.buffer, offset + 0x32),
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

  private createNpc(offset: number): Npc {
    const delay = this.buffer[offset + 0x15] ?? 0;
    const state = delay === 0 ? CharacterState.Stop : mapCharacterState(this.buffer[offset + 4] ?? 0);
    return new Npc({
      type: this.buffer[offset] ?? 0,
      index: this.buffer[offset + 1] ?? 0,
      name: readGbkString(this.buffer, offset + 9),
      state,
      direction: mapDirection(this.buffer[offset + 2] ?? 0),
      step: this.buffer[offset + 3] ?? 0,
      mapX: 0,
      mapY: 0,
      walkingSprite: this.createWalkingSprite(2, this.buffer[offset + 0x16] ?? 0),
      delay,
    });
  }

  private createMonster(offset: number): Monster {
    const magicIndex = this.buffer[offset + 0x2f] ?? 0;
    const magicChain = magicIndex > 0 ? this.getMagicChain(magicIndex) : null;
    const learntMagicCount = this.buffer[offset + 2] ?? 0;
    if (magicChain) magicChain.learnNum = learntMagicCount;
    const buff = new BuffMan();
    buff.addBuff(this.buffer[offset + 3] ?? 0, 0);
    const atbuff = new BuffMan();
    atbuff.addBuff(this.buffer[offset + 4] ?? 0, this.buffer[offset + 0x17] ?? 0);

    const data: MonsterData = {
      ...this.createFightingCharacterDefaults(
        {
          type: this.buffer[offset] ?? 0,
          index: this.buffer[offset + 1] ?? 0,
          name: readGbkString(this.buffer, offset + 6),
          state: CharacterState.Stop,
          direction: KeyCode.Down,
          step: 0,
          mapX: 0,
          mapY: 0,
          walkingSprite: null,
        }
      ),
      magicChain,
      learntMagicCount,
      level: this.buffer[offset + 0x12] ?? 0,
      speed: this.buffer[offset + 0x13] ?? 0,
      lingli: this.buffer[offset + 0x14] ?? 0,
      luck: this.buffer[offset + 0x16] ?? 0,
      maxHp: readUint16(this.buffer, offset + 0x18),
      hp: readUint16(this.buffer, offset + 0x1a),
      maxMp: readUint16(this.buffer, offset + 0x1c),
      mp: readUint16(this.buffer, offset + 0x1e),
      attack: readUint16(this.buffer, offset + 0x20),
      defend: readUint16(this.buffer, offset + 0x22),
      buff,
      debuff: new BuffMan(),
      atbuff,
      fightingSprite: this.createFightingSprite(ResourceType.ACP, this.buffer[offset + 0x2e] ?? 0),
      iq: this.buffer[offset + 0x15] ?? 0,
      money: readUint16(this.buffer, offset + 0x24),
      exp: readUint16(this.buffer, offset + 0x26),
      stealGoods: this.readCarryGoods(
        this.buffer[offset + 0x28] ?? 0,
        this.buffer[offset + 0x29] ?? 0,
        this.buffer[offset + 0x2a] ?? 0
      ),
      dropGoods: this.readCarryGoods(
        this.buffer[offset + 0x2b] ?? 0,
        this.buffer[offset + 0x2c] ?? 0,
        this.buffer[offset + 0x2d] ?? 0
      ),
    };

    return new Monster(data);
  }

  private createSceneObj(offset: number): SceneObj {
    return new SceneObj({
      type: this.buffer[offset] ?? 0,
      index: this.buffer[offset + 1] ?? 0,
      name: readGbkString(this.buffer, offset + 9),
      state: mapCharacterState(this.buffer[offset + 4] ?? 0),
      direction: KeyCode.Up,
      step: this.buffer[offset + 3] ?? 0,
      mapX: 0,
      mapY: 0,
      walkingSprite: this.createWalkingSprite(4, this.buffer[offset + 0x16] ?? 0),
      delay: this.buffer[offset + 0x15] ?? 0,
    });
  }

  private createFightingCharacterDefaults(characterData: CharacterData): FightingCharacterData {
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

  private createPlayerEquipment(offset: number): Array<GoodsEquipment | null> {
    return [
      this.readEquipment(6, this.buffer[offset + 0x1e] ?? 0),
      this.readEquipment(6, this.buffer[offset + 0x1f] ?? 0),
      this.readEquipment(5, this.buffer[offset + 0x1b] ?? 0),
      this.readEquipment(3, this.buffer[offset + 0x1d] ?? 0),
      this.readEquipment(7, this.buffer[offset + 0x1c] ?? 0),
      this.readEquipment(2, this.buffer[offset + 0x19] ?? 0),
      this.readEquipment(4, this.buffer[offset + 0x1a] ?? 0),
      this.readEquipment(1, this.buffer[offset + 0x18] ?? 0),
    ];
  }

  private readEquipment(type: number, index: number): GoodsEquipment | null {
    return index > 0 ? this.getEquipment(type, index) : null;
  }

  private readCarryGoods(type: number, index: number, count: number): CarryGoods | null {
    if (type <= 0 || index <= 0 || count <= 0) return null;
    const goods = this.getGoods(type, index);
    return goods ? { goods, count } : null;
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
