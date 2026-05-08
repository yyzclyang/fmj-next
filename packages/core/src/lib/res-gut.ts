import { ResBase } from './res-base';

export interface ResGutData {
  readonly type: number;
  readonly index: number;
  readonly description: string;
  readonly sceneEvent: number[];
  readonly scriptData: Uint8Array;
}

export class ResGut extends ResBase {
  description = '';
  sceneEvent: number[] = [];
  scriptData: Uint8Array = new Uint8Array(0);

  constructor(data?: ResGutData) {
    super();
    if (!data) return;
    this.type = data.type;
    this.index = data.index;
    this.description = data.description;
    this.sceneEvent = data.sceneEvent;
    this.scriptData = data.scriptData;
  }
}
