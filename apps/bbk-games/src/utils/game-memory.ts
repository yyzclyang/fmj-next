import type { BbkGameLib } from '@/apis/game';

const LAST_GAME_META_KEY = 'bbk-last-game';
const DB_NAME = 'bbk-games';
const STORE = 'blobs';

export type LastGameMeta = { type: 'local' | 'remote'; manifest: BbkGameLib };

export function saveLastGame(meta: LastGameMeta): void {
  localStorage.setItem(LAST_GAME_META_KEY, JSON.stringify(meta));
}

export function loadLastGame(): LastGameMeta | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_GAME_META_KEY) ?? '');
  } catch {
    return null;
  }
}

export async function saveLocalLib(data: Uint8Array): Promise<void> {
  const tx = (await openDB()).transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(data, 'lib');
  return new Promise(r => {
    tx.oncomplete = () => r();
  });
}

export async function loadLocalLib(): Promise<Uint8Array | null> {
  const req = (await openDB()).transaction(STORE, 'readonly').objectStore(STORE).get('lib');
  return new Promise(r => {
    req.onsuccess = () => r(req.result ?? null);
    req.onerror = () => r(null);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
