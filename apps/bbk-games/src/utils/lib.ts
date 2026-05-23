import type { BbkGameLib } from '@/apis/game';
import { getLocalBbkGameLibDataApi } from '@/apis/game';
import { type GameSource } from '@/utils/database';
import { R2_STATIC_BASE_URL } from '@/utils/env';

const gbkDecoder = new TextDecoder('GBK');

export interface LoadedGameLib {
  readonly source: GameSource;
  readonly manifest: BbkGameLib;
  readonly buffer: ArrayBufferLike;
}

export async function loadGameLib(gameLib: BbkGameLib, source: GameSource): Promise<LoadedGameLib> {
  const buffer =
    source === 'local'
      ? await getLocalBbkGameLibDataApi(gameLib.id).then(b => b ?? Promise.reject(new Error('Failed to load LIB')))
      : await fetch(`${R2_STATIC_BASE_URL}/${gameLib.url}`).then(res => {
          if (!res.ok) throw new Error('Failed to load LIB');
          return res.arrayBuffer();
        });
  return { source, manifest: gameLib, buffer };
}

export async function parseLocalGameFile(file: File): Promise<[Omit<BbkGameLib, 'id'>, ArrayBuffer]> {
  const buffer = await file.arrayBuffer();
  const libBuffer = isGamBuffer(buffer) ? gam2lib(buffer) : buffer;
  if (!libBuffer || !isLibBuffer(libBuffer)) throw new Error('文件格式错误');

  const { name, author, version } = parseGame(buffer);
  const sha256 = await createLibSha256(libBuffer);
  return [
    {
      name,
      description: '',
      author,
      url: file.name,
      version,
      sha256,
      size: libBuffer.byteLength,
      scopeId: `local_${sha256.slice(0, 16)}`,
      engineOptions: '',
      publishedAt: null,
    },
    libBuffer,
  ];
}

function isLibBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length > 3 && bytes[0] === 0x4c && bytes[1] === 0x49 && bytes[2] === 0x42;
}

function isGamBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 0x46 && bytes[0] === 0x47 && bytes[1] === 0x41 && bytes[2] === 0x4d;
}

function gam2lib(buffer: ArrayBuffer): ArrayBuffer | null {
  const bytes = new Uint8Array(buffer);
  const offset = (bytes[0x42] | (bytes[0x43] << 8) | (bytes[0x44] << 16) | (bytes[0x45] << 24)) >>> 0;
  if (offset <= 0 || offset >= bytes.length) return null;
  const libBuffer = buffer.slice(offset);
  return isLibBuffer(libBuffer) ? libBuffer : null;
}

function parseGame(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (isGamBuffer(buffer)) {
    return {
      name: readGbkText(bytes, 0x06, 0x20),
      author: readGbkText(bytes, 0x26, 0x10),
      version: readGbkText(bytes, 0x37, 0x0b),
    };
  }
  return { name: readGbkText(bytes, 0x03, 0x0d), author: '', version: '' };
}

async function createLibSha256(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function readGbkText(bytes: Uint8Array, start: number, length: number): string {
  let end = start + length;
  while (end > start && (bytes[end - 1] === 0 || bytes[end - 1] === 0x20 || bytes[end - 1] === 0xff)) end--;
  let zero = start;
  while (zero < end && bytes[zero] !== 0) zero++;
  return gbkDecoder.decode(bytes.subarray(start, zero)).trim();
}
