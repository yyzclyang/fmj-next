// Fixed-width integer helpers intentionally wrap/truncate values instead of clamping them.
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
