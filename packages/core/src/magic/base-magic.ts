import { ResBase } from '@/lib/res-base';
import type { ResSrs } from '@/lib/res-srs';

export interface BaseMagicData {
  readonly type: number;
  readonly index: number;
  readonly castRounds: number;
  readonly targetAll: boolean;
  readonly costMp: number;
  readonly animation: ResSrs | null;
  readonly name: string;
  readonly description: string;
}

export abstract class BaseMagic extends ResBase {
  castRounds: number;
  targetAll: boolean;
  costMp: number;
  animation: ResSrs | null;
  name: string;
  description: string;

  protected constructor(data: BaseMagicData) {
    super();
    this.type = data.type;
    this.index = data.index;
    this.castRounds = data.castRounds;
    this.targetAll = data.targetAll;
    this.costMp = data.costMp;
    this.animation = data.animation;
    this.name = data.name;
    this.description = data.description;
  }
}
