import { BASE_URL } from '@/utils/env';

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  readonly query?: Record<string, QueryValue>;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return fetch(createRequestUrl(path, options.query), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(response => {
    if (!response.ok) throw new Error(`请求失败: ${response.status}`);
    return response.json() as Promise<T>;
  });
}

function createRequestUrl(path: string, query?: Record<string, QueryValue>): string {
  const baseUrl = /^https?:\/\//.test(path) ? path : `${BASE_URL}${path}`;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    searchParams.set(key, String(value));
  }
  const queryString = searchParams.toString();

  return `${baseUrl}${queryString ? '?' + queryString : ''}`;
}
