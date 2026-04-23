const gbkDecoder = new TextDecoder('GBK');

export const ResourceType = {
  GUT: 1,
  MAP: 2,
  ARS: 3,
  MRS: 4,
  SRS: 5,
  GRS: 6,
  TIL: 7,
  ACP: 8,
  GDP: 9,
  GGJ: 10,
  PIC: 11,
  MLR: 12,
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export interface ResourceKey {
  readonly resType: ResourceType;
  readonly type: number;
  readonly index: number;
}

export function serializeResourceKey(key: ResourceKey): string {
  return `${key.resType}:${key.type}:${key.index}`;
}

export function readGbkString(buf: Uint8Array, start: number): string {
  let end = start;
  while (end < buf.length && buf[end] !== 0) {
    end += 1;
  }
  return gbkDecoder.decode(buf.subarray(start, end));
}

export function readUint16(buf: Uint8Array, start: number): number {
  const low = buf[start] ?? 0;
  const high = buf[start + 1] ?? 0;
  return low | (high << 8);
}

export function readInt16(buf: Uint8Array, start: number): number {
  const value = readUint16(buf, start);
  return value >= 0x8000 ? value - 0x10000 : value;
}

export function readInt8(buf: Uint8Array, start: number): number {
  const value = buf[start] ?? 0;
  return value >= 0x80 ? 0x7f : value;
}
