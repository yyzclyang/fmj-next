import { ResGut, type ResGutData } from '../res-gut';
import { readGbkString, readUint16 } from '../resource-utils';

export function parseGutResource(buffer: Uint8Array, offset: number): ResGut {
  return new ResGut(parseGutData(buffer, offset));
}

function parseGutData(buffer: Uint8Array, offset: number): ResGutData {
  const length = readUint16(buffer, offset + 0x18);
  const sceneEventCount = buffer[offset + 0x1a] ?? 0;
  const sceneEvent = new Array<number>(sceneEventCount);

  for (let i = 0; i < sceneEventCount; i += 1) {
    sceneEvent[i] = readUint16(buffer, offset + 0x1b + i * 2);
  }

  const scriptOffset = offset + 0x1b + sceneEventCount * 2;
  const scriptLength = Math.max(0, length - sceneEventCount * 2 - 3);

  return {
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    description: readGbkString(buffer, offset + 2),
    sceneEvent,
    scriptData: buffer.slice(scriptOffset, scriptOffset + scriptLength),
  };
}
