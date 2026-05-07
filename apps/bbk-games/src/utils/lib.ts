import { createLibSha256, gam2lib, isGamBuffer, isLibBuffer } from '@/utils/utils';

const HARDCODED_LIB_URL =
  'https://pub-e5fdb2db51c64340bb86d3d8b4a5ff51.r2.dev/bbk/game/lib/9ec5aac3692d6257029ca6a38d94dd330072c7e7fcccc2ee6be95129230ff86c.lib';

export interface GameLibManifest {
  readonly name: string;
  readonly url: string;
  readonly sha256: string;
  readonly scopeId: string;
  readonly engineOptions: string;
}

export interface LoadedGameLib {
  readonly manifest: GameLibManifest;
  readonly lib: Uint8Array;
}

export async function loadRemoteGameLib(manifest: GameLibManifest): Promise<LoadedGameLib> {
  const buffer = await fetch(HARDCODED_LIB_URL).then(res => {
    if (!res.ok) throw new Error(`Failed to load LIB`);
    return res.arrayBuffer();
  });
  const lib = new Uint8Array(buffer);

  return { lib, manifest };
}

export async function loadLocalGameLib(file: File): Promise<LoadedGameLib> {
  const buffer = await file.arrayBuffer();
  const libBuffer = isGamBuffer(buffer) ? gam2lib(buffer) : buffer;
  if (!libBuffer || !isLibBuffer(libBuffer)) throw new Error('文件格式错误');

  const lib = new Uint8Array(libBuffer);
  const sha256 = await createLibSha256(lib);
  const manifest = {
    name: file.name,
    url: '',
    sha256,
    scopeId: sha256.slice(0, 16),
    engineOptions: '',
  };

  return { lib, manifest };
}
