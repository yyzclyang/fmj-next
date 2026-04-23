import { ResBase } from './res-base';
import { readGbkString, readUint16 } from './resource-utils';

export class ResGut extends ResBase {
  description = '';
  sceneEvent: number[] = [];
  scriptData = new Uint8Array(0);

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    this.description = readGbkString(buf, offset + 2);

    const length = readUint16(buf, offset + 0x18);
    const sceneEventCount = buf[offset + 0x1a] ?? 0;
    this.sceneEvent = new Array<number>(sceneEventCount);

    for (let i = 0; i < sceneEventCount; i += 1) {
      this.sceneEvent[i] = readUint16(buf, offset + 0x1b + i * 2);
    }

    const scriptOffset = offset + 0x1b + sceneEventCount * 2;
    const scriptLength = Math.max(0, length - sceneEventCount * 2 - 3);
    this.scriptData = buf.slice(scriptOffset, scriptOffset + scriptLength);
  }
}
