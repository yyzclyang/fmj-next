const gbkDecoder = new TextDecoder('GBK');

export const ResourceType = {
  GUT: 1, // 剧情脚本资源
  MAP: 2, // 地图资源
  ARS: 3, // 角色和场景对象资源
  MRS: 4, // 魔法资源
  SRS: 5, // 特效动画资源
  GRS: 6, // 道具资源
  TIL: 7, // 地图块图像资源
  ACP: 8, // 角色图片资源
  GDP: 9, // 道具图片资源
  GGJ: 10, // 特效图片资源
  PIC: 11, // 杂类图片资源
  MLR: 12, // 魔法链和升级链资源
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

export function readUint32(buf: Uint8Array, start: number): number {
  const low = readUint16(buf, start);
  const high = readUint16(buf, start + 2);
  return low + high * 0x10000;
}

export function readInt16(buf: Uint8Array, start: number): number {
  const value = readUint16(buf, start);
  return value >= 0x8000 ? value - 0x10000 : value;
}

export function readInt8(buf: Uint8Array, start: number): number {
  const value = buf[start] ?? 0;
  // 资源用最高位表示负向属性，低 7 位是幅值，不是通用二补码 int8。
  return value >= 0x80 ? 0x80 - value : value;
}
