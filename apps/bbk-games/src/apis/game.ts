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
  const id = await db.lib.add(lib as BbkGameLib);
  await db.libBuffer.add({ libId: id, buffer } as LibBuffer);
  return { ...lib, id };
}

export async function deleteLocalBbkGameLibApi(id: number): Promise<void> {
  const lib = await db.lib.get(id);
  if (!lib) return;
  await Promise.all([
    db.lib.delete(id),
    db.libBuffer.where('libId').equals(id).delete(),
    db.save.where('scopeId').equals(lib.scopeId).delete(),
  ]);
}

export async function getLocalBbkGameLibDataApi(libId: number): Promise<ArrayBufferLike | undefined> {
  const record = await db.libBuffer.where('libId').equals(libId).first();
  return record?.buffer;
}
