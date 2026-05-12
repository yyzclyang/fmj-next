import {
  FightingSprite,
  WalkingSprite,
  type Monster,
  type Npc,
  type Player,
  type ResLevelUpChain,
  type SceneObj,
} from '@/characters';
import { GoodsEquipment, type BaseGoods } from '@/goods';
import type { BaseMagic, ResMagicChain } from '@/magic';
import { createLogger } from '@/utils/logger';
import {
  parseMonsterResource,
  parseNpcResource,
  parsePlayerResource,
  parseSceneObjResource,
} from './parse/parse-character';
import { parseGoodsResource } from './parse/parse-goods';
import { parseGutResource } from './parse/parse-gut';
import { parseImageResource } from './parse/parse-image';
import { parseLevelUpChainResource } from './parse/parse-level-up-chain';
import { parseMagicChainResource, parseMagicResource } from './parse/parse-magic';
import { parseMapResource } from './parse/parse-map';
import { parseSrsResource } from './parse/parse-srs';
import type { ResGut } from './res-gut';
import { isImageResourceType, type ResImage } from './res-image';
import type { ResMap } from './res-map';
import type { ResSrs } from './res-srs';
import { ResourceType, serializeResourceKey, type ResourceKey } from './resource-utils';

const logger = createLogger('资源');

export class DatLib {
  private readonly offsets = new Map<string, number>();
  private readonly resourceKeys: ResourceKey[] = [];
  private readonly buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.loadOffsets();
  }

  listResourceKeys(resType?: ResourceType): ResourceKey[] {
    const res =
      resType === undefined ? [...this.resourceKeys] : this.resourceKeys.filter(key => key.resType === resType);
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
    if (!isImageResourceType(resType)) return null;
    const offset = this.getOffset(resType, type, index);
    return offset === null ? null : parseImageResource(this.buffer, offset, { resType, type, index });
  }

  getSrs(type: number, index: number): ResSrs | null {
    const offset = this.getOffset(ResourceType.SRS, type, index);
    return offset === null ? null : parseSrsResource(this.buffer, offset);
  }

  getGut(type: number, index: number): ResGut | null {
    const offset = this.getOffset(ResourceType.GUT, type, index);
    return offset === null ? null : parseGutResource(this.buffer, offset);
  }

  getMap(type: number, index: number): ResMap | null {
    const offset = this.getOffset(ResourceType.MAP, type, index);
    return offset === null ? null : parseMapResource(this.buffer, offset);
  }

  getPlayer(index: number): Player | null {
    const offset = this.getOffset(ResourceType.ARS, 1, index);
    return offset === null ? null : parsePlayerResource(this, this.buffer, offset);
  }

  getNpc(index: number): Npc | null {
    const offset = this.getOffset(ResourceType.ARS, 2, index);
    return offset === null ? null : parseNpcResource(this, this.buffer, offset);
  }

  getMonster(index: number): Monster | null {
    const offset = this.getOffset(ResourceType.ARS, 3, index);
    return offset === null ? null : parseMonsterResource(this, this.buffer, offset);
  }

  getSceneObj(index: number): SceneObj | null {
    const offset = this.getOffset(ResourceType.ARS, 4, index);
    return offset === null ? null : parseSceneObjResource(this, this.buffer, offset);
  }

  getEquipment(type: number, index: number): GoodsEquipment | null {
    const goods = this.getGoods(type, index);
    return goods instanceof GoodsEquipment ? goods : null;
  }

  getGoods(type: number, index: number): BaseGoods | null {
    const offset = this.getOffset(ResourceType.GRS, type, index);
    return offset === null ? null : parseGoodsResource(this, this.buffer, type, offset);
  }

  getMagic(type: number, index: number): BaseMagic | null {
    const offset = this.getOffset(ResourceType.MRS, type, index);
    return offset === null ? null : parseMagicResource(this, this.buffer, type, offset);
  }

  getMagicChain(index: number): ResMagicChain | null {
    const offset = this.getOffset(ResourceType.MLR, 1, index);
    return offset === null ? null : parseMagicChainResource(this, this.buffer, offset);
  }

  getLevelUpChain(index: number): ResLevelUpChain | null {
    const offset = this.getOffset(ResourceType.MLR, 2, index);
    return offset === null ? null : parseLevelUpChainResource(this.buffer, offset);
  }

  private getOffset(resType: ResourceType, type: number, index: number): number | null {
    return this.offsets.get(serializeResourceKey({ resType, type, index })) ?? null;
  }

  private loadOffsets(): void {
    let keyPtr = 0x10;
    let offsetPtr = 0x2000;
    let invalidCount = 0;

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
      } else {
        invalidCount += 1;
      }

      keyPtr += 3;
      offsetPtr += 3;
    }
    logger.log('索引', `资源=${this.resourceKeys.length}, 无效偏移=${invalidCount}, ${this.formatResourceTypeCounts()}`);
  }

  private formatResourceTypeCounts(): string {
    const counts = new Map<ResourceType, number>();
    for (const key of this.resourceKeys) {
      counts.set(key.resType, (counts.get(key.resType) ?? 0) + 1);
    }
    return [...counts]
      .sort(([a], [b]) => a - b)
      .map(([resType, count]) => `${getResourceTypeName(resType)}=${count}`)
      .join(', ');
  }
}

function getResourceTypeName(resType: ResourceType): string {
  for (const [name, value] of Object.entries(ResourceType)) {
    if (value === resType) return name;
  }
  return `UNKNOWN_${resType}`;
}
