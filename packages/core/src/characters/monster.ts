import type { BaseGoods } from '@/goods';
import { randomInt } from '@/utils/integer';
import { FightingCharacter, type FightingCharacterData } from './fighting-character';

export interface CarryGoods {
  readonly goods: BaseGoods;
  count: number;
}

export interface MonsterData extends FightingCharacterData {
  readonly iq: number;
  readonly money: number;
  readonly exp: number;
  readonly stealGoods: CarryGoods | null;
  readonly dropGoods: CarryGoods | null;
}

export class Monster extends FightingCharacter {
  iq: number;
  money: number;
  exp: number;
  stealGoods: CarryGoods | null;
  dropGoods: CarryGoods | null;

  constructor(data: MonsterData) {
    super(data);
    this.iq = data.iq;
    this.money = data.money;
    this.exp = data.exp;
    this.stealGoods = data.stealGoods;
    this.dropGoods = data.dropGoods;
  }

  // 偷取库存属于怪物战斗状态，成功一次只扣一件
  tryStealGoods(attacker: FightingCharacter, randomRoll = randomInt(0x10000)): BaseGoods | null {
    const carry = this.stealGoods;
    if (!carry || carry.count <= 0) return null;
    // C 引擎这里用动作角色下标读取敌人幸运，且幸运为 0 会取模 0；TS 保留公式但修正这两个缺陷。
    const attackerLuck = Math.max(1, attacker.totalLuck);
    const targetLuck = Math.max(1, this.totalLuck);
    const gate = attackerLuck > targetLuck ? 3 : 2;
    if ((randomRoll % attackerLuck) + 1 <= randomRoll % targetLuck || randomRoll % gate === 0) return null;
    carry.count -= 1;
    return carry.goods;
  }
}
