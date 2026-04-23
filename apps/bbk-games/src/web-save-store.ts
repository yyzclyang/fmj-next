import type { SaveStore } from '@fmj-next/core';

const STORAGE_PREFIX = 'bbk-games:';

export const webSaveStore: SaveStore = {
  read(key) {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return Uint8Array.from(JSON.parse(raw) as number[]);
  },
  write(key, value) {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify([...value]));
  },
};
