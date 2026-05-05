import { createDefaultSaveScopeId, type GameLibManifest, type LoadedGameLibManifest } from './game-profiles';

const LIB_SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SAVE_SCOPE_ID_PATTERN = /^[A-Za-z0-9-]+$/;

export interface LoadedGameLib {
  readonly manifest: LoadedGameLibManifest;
  readonly datLib: Uint8Array;
}

export async function loadRemoteGameLib(manifest: GameLibManifest): Promise<LoadedGameLib> {
  const normalizedManifest = normalizeManifest(manifest);
  if (!normalizedManifest.url) throw new Error(`LIB URL 为空: ${normalizedManifest.name}`);

  const response = await fetch(normalizedManifest.url);
  if (!response.ok) {
    throw new Error(`Failed to load DAT.LIB for ${normalizedManifest.name} from ${normalizedManifest.url}: ${response.status}`);
  }

  const datLib = new Uint8Array(await response.arrayBuffer());
  const actualSha256 = await createDatLibSha256(datLib);
  if (actualSha256 !== normalizedManifest.sha256) {
    throw new Error(`DAT.LIB SHA-256 不匹配: ${normalizedManifest.name}`);
  }

  return { manifest: normalizedManifest, datLib };
}

export async function loadLocalGameLib(file: File, baseManifest?: GameLibManifest): Promise<LoadedGameLib> {
  const datLib = new Uint8Array(await file.arrayBuffer());
  const sha256 = await createDatLibSha256(datLib);
  const manifest = normalizeManifest({
    name: file.name,
    url: '',
    sha256,
    scopeId: createDefaultSaveScopeId(sha256),
    compat: baseManifest?.compat ?? null,
  });

  return { manifest, datLib };
}

export async function createDatLibSha256(data: Uint8Array): Promise<string> {
  const input = new ArrayBuffer(data.byteLength);
  new Uint8Array(input).set(data);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeManifest(manifest: GameLibManifest): LoadedGameLibManifest {
  const sha256 = manifest.sha256.toLowerCase();
  if (!LIB_SHA256_PATTERN.test(sha256)) throw new Error(`LIB SHA-256 非法: ${manifest.sha256}`);
  if (!SAVE_SCOPE_ID_PATTERN.test(manifest.scopeId)) throw new Error(`存档 scopeId 非法: ${manifest.scopeId}`);
  return {
    ...manifest,
    sha256,
    compat: manifest.compat ?? null,
  };
}
