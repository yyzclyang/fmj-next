import { createLibSha256, gam2lib, isGamBuffer, isLibBuffer } from '@/utils/utils';
import type { BbkGameLib } from '@/apis/game.ts';

const HARDCODED_LIB_URL =
  'https://pub-e5fdb2db51c64340bb86d3d8b4a5ff51.r2.dev/bbk/game/lib/9ec5aac3692d6257029ca6a38d94dd330072c7e7fcccc2ee6be95129230ff86c.lib';

export type GameLibManifest = BbkGameLib;

export interface LoadedGameLib {
  readonly manifest: GameLibManifest;
  readonly lib: Uint8Array;
}

export async function loadRemoteGameLib(gameLib: BbkGameLib): Promise<LoadedGameLib> {
  const buffer = await fetch(HARDCODED_LIB_URL).then(res => {
    if (!res.ok) throw new Error(`Failed to load LIB`);
    return res.arrayBuffer();
  });
  const lib = new Uint8Array(buffer);

  return { lib, manifest: gameLib };
}

export async function loadLocalGameLib(file: File): Promise<LoadedGameLib> {
  const buffer = await file.arrayBuffer();
  const libBuffer = isGamBuffer(buffer) ? gam2lib(buffer) : buffer;
  if (!libBuffer || !isLibBuffer(libBuffer)) throw new Error('文件格式错误');

  const lib = new Uint8Array(libBuffer);
  const sha256 = await createLibSha256(lib);
  const manifest = {
    id: 0,
    name: file.name,
    description: '',
    author: '本地文件',
    url: '',
    version: '',
    sha256,
    size: lib.byteLength,
    scopeId: sha256.slice(0, 16),
    engineOptions: '',
    publishedAt: null,
  };

  return { lib, manifest };
}
