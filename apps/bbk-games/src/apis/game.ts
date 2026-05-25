import { request } from '@/utils/request/request';
import { db, type LibBuffer } from '@/utils/database';

export interface ListResponse<T> {
  readonly list: readonly T[];
  readonly current: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface BbkGame {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly coverUrl: string;
  readonly libs: readonly BbkGameLib[];
}

export interface BbkGameLib {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly url: string;
  readonly version: string;
  readonly sha256: string;
  readonly size: number;
  readonly scopeId: string;
  readonly engineOptions: string;
  readonly publishedAt: string | null;
}

export async function getBbkGamesApi(current = 1, pageSize = 20): Promise<ListResponse<BbkGame>> {
  return request<ListResponse<BbkGame>>('/v1/bbk/games', { query: { current, pageSize } });
}

export async function saveLocalBbkGameLibApi(lib: Omit<BbkGameLib, 'id'>, buffer: ArrayBuffer): Promise<BbkGameLib> {
  const [id] = await Promise.all([
    db.lib.add(lib as BbkGameLib),
    db.libBuffer.put({ sha256: lib.sha256, buffer } as LibBuffer),
  ]);
  return { ...lib, id };
}

export async function deleteLocalBbkGameLibApi(id: number): Promise<void> {
  const lib = await db.lib.get(id);
  if (!lib) return;
  await Promise.all([
    db.lib.delete(id),
    db.save.where('scopeId').equals(lib.scopeId).delete(),
  ]);
  const remaining = await db.lib.where('sha256').equals(lib.sha256).count();
  if (remaining === 0)
    await db.libBuffer.where('sha256').equals(lib.sha256).delete();
}

export async function getLocalBbkGameLibDataApi(sha256: string): Promise<ArrayBufferLike | undefined> {
  const record = await db.libBuffer.where('sha256').equals(sha256).first();
  return record?.buffer;
}
