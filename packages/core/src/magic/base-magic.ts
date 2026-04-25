import { ResBase } from '@/lib/res-base';
import type { ResSrs } from '@/lib/res-srs';

export interface BaseMagicData {
  readonly type: number;
  readonly index: number;
  readonly roundNum: number;
  readonly isForAll: boolean;
  readonly costMp: number;
  readonly magicAni: ResSrs | null;
  readonly magicName: string;
  readonly magicDescription: string;
}

export abstract class BaseMagic extends ResBase {
  roundNum: number;
  isForAll: boolean;
  costMp: number;
  magicAni: ResSrs | null;
  magicName: string;
  magicDescription: string;

  protected constructor(data: BaseMagicData) {
    super();
    this.type = data.type;
    this.index = data.index;
    this.roundNum = data.roundNum;
    this.isForAll = data.isForAll;
    this.costMp = data.costMp;
    this.magicAni = data.magicAni;
    this.magicName = data.magicName;
    this.magicDescription = data.magicDescription;
  }

  // 魔法资源由 DatLib 构造；保留空实现只是为了兼容 ResBase 体系。
  setData(): void {}
}
