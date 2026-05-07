export function isLibBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length > 3 && bytes[0] === 0x4c && bytes[1] === 0x49 && bytes[2] === 0x42;
}

export function isGamBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 0x46 && bytes[0] === 0x47 && bytes[1] === 0x41 && bytes[2] === 0x4d;
}

export function gam2lib(buffer: ArrayBuffer): ArrayBuffer | null {
  const bytes = new Uint8Array(buffer);
  const offset = (bytes[0x42] | (bytes[0x43] << 8) | (bytes[0x44] << 16) | (bytes[0x45] << 24)) >>> 0;
  if (offset <= 0 || offset >= bytes.length) return null;

  const libBuffer = buffer.slice(offset);
  return isLibBuffer(libBuffer) ? libBuffer : null;
}

export async function createLibSha256(data: Uint8Array): Promise<string> {
  const input = new ArrayBuffer(data.byteLength);
  new Uint8Array(input).set(data);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
