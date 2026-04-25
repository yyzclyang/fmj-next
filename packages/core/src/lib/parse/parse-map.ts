import { ResMap, type ResMapData } from '../res-map';
import { readGbkString } from '../resource-utils';

export function parseMapResource(buffer: Uint8Array, offset: number): ResMap {
  return new ResMap(parseMapData(buffer, offset));
}

function parseMapData(buffer: Uint8Array, offset: number): ResMapData {
  const mapWidth = buffer[offset + 0x10] ?? 0;
  const mapHeight = buffer[offset + 0x11] ?? 0;
  const length = mapWidth * mapHeight * 2;

  return {
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    tilIndex: buffer[offset + 2] ?? 0,
    mapName: readGbkString(buffer, offset + 3),
    mapWidth,
    mapHeight,
    data: buffer.slice(offset + 0x12, offset + 0x12 + length),
  };
}
