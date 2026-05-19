// 截断成 8 位无符号整数
export function toUint8(value: number): number {
  return value & 0xff;
}

export function toUint16(value: number): number {
  return value & 0xffff;
}

export function toInt8(value: number): number {
  const uint8 = toUint8(value);
  return uint8 >= 0x80 ? uint8 - 0x100 : uint8;
}

export function toInt16(value: number): number {
  const uint16 = toUint16(value);
  return uint16 >= 0x8000 ? uint16 - 0x10000 : uint16;
}

export function randomInt(maxExclusive: number): number {
  return Math.trunc(Math.random() * Math.max(1, maxExclusive));
}
