import { request } from '@/utils/request/request';

export interface ListResponse {
  readonly list: readonly BbkGame[];
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

export async function getBbkGames(current = 1, pageSize = 20): Promise<ListResponse> {
  return request<ListResponse>('/v1/bbk/games', { query: { current, pageSize } });
}
