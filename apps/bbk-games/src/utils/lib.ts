import type { BbkGame, BbkGameLib } from '@/apis/game';
import { R2_STATIC_BASE_URL } from '@/utils/env';

const gbkDecoder = new TextDecoder('GBK');

export interface LoadedGameLib {
  readonly manifest: BbkGameLib;
  readonly lib: Uint8Array;
}

export interface LoadedLocalGame {
  readonly game: BbkGame;
  readonly loadedGameLib: LoadedGameLib;
}

export async function loadRemoteGameLib(gameLib: BbkGameLib): Promise<LoadedGameLib> {
  const buffer = await fetch(`${R2_STATIC_BASE_URL}/${gameLib.url}`).then(res => {
    if (!res.ok) throw new Error(`Failed to load LIB`);
    return res.arrayBuffer();
  });
  const lib = new Uint8Array(buffer);

  return { lib, manifest: gameLib };
}

export async function loadLocalGame(file: File): Promise<LoadedLocalGame> {
  const buffer = await file.arrayBuffer();
  const libBuffer = isGamBuffer(buffer) ? gam2lib(buffer) : buffer;
  if (!libBuffer || !isLibBuffer(libBuffer)) throw new Error('文件格式错误');

  const { name, author, version } = parseGame(buffer);
  console.log('name, author, version', name, author, version);
  const lib = new Uint8Array(libBuffer);
  const sha256 = await createLibSha256(lib);
  const bbkGameLib: BbkGameLib = {
    id: -1,
    name,
    description: '',
    author,
    url: file.name,
    version,
    sha256,
    size: lib.byteLength,
    scopeId: sha256.slice(0, 16),
    engineOptions: '',
    publishedAt: null,
  };

  return {
    game: {
      id: -1,
      name: '本地游戏',
      description: '',
      coverUrl: '',
      libs: [bbkGameLib],
    },
    loadedGameLib: { manifest: bbkGameLib, lib },
  };
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
  return {
    name: readGbkText(bytes, 0x03, 0x0d),
    author: '',
    version: '',
  };
}

async function createLibSha256(data: Uint8Array): Promise<string> {
  const input = new ArrayBuffer(data.byteLength);
  new Uint8Array(input).set(data);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function readGbkText(bytes: Uint8Array, start: number, length: number): string {
  let end = start + length;
  while (end > start && (bytes[end - 1] === 0 || bytes[end - 1] === 0x20 || bytes[end - 1] === 0xff)) end--;
  let zero = start;
  while (zero < end && bytes[zero] !== 0) zero++;
  return gbkDecoder.decode(bytes.subarray(start, zero)).trim();
}
