import { KeyCode } from '@/shared/key-code';
import type { Direction } from './character';
import { FightingCharacter, type FightingCharacterData } from './fighting-character';
import type { GoodsEquipment } from '@/goods';
import type { ResImage } from '@/lib/res-image';
import type { ResLevelUpChain } from './res-level-up-chain';

export interface PlayerData extends FightingCharacterData {
  readonly headImage: ResImage | null;
  readonly levelUpChain: ResLevelUpChain | null;
  readonly currentExp: number;
  readonly equipment: Array<GoodsEquipment | null>;
  readonly totalMaxHp: number;
  readonly totalMaxMp: number;
  readonly totalAttack: number;
  readonly totalDefend: number;
  readonly totalSpeed: number;
  readonly totalLingli: number;
  readonly totalLuck: number;
}

export class Player extends FightingCharacter {
  headImage: ResImage | null;
  levelUpChain: ResLevelUpChain | null;
  currentExp: number;
  readonly equipment: Array<GoodsEquipment | null>;

  totalMaxHp: number;
  totalMaxMp: number;
  totalAttack: number;
  totalDefend: number;
  totalSpeed: number;
  totalLingli: number;
  totalLuck: number;

  constructor(data: PlayerData) {
    super(data);
    this.headImage = data.headImage;
    this.levelUpChain = data.levelUpChain;
    this.currentExp = data.currentExp;
    this.equipment = data.equipment;
    this.totalMaxHp = data.totalMaxHp;
    this.totalMaxMp = data.totalMaxMp;
    this.totalAttack = data.totalAttack;
    this.totalDefend = data.totalDefend;
    this.totalSpeed = data.totalSpeed;
    this.totalLingli = data.totalLingli;
    this.totalLuck = data.totalLuck;
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
