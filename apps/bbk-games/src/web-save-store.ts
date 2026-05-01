import type { SaveStore } from '@fmj-next/core';

const STORAGE_PREFIX = 'bbk-games:';
const CORRUPT_SAVE_MESSAGE = '存档损坏';

export const webSaveStore: SaveStore = {
  read(key) {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw == null) return null;
    try {
      const data = JSON.parse(raw) as unknown;
      if (!Array.isArray(data)) throw new Error(CORRUPT_SAVE_MESSAGE);
      return Uint8Array.from(data);
    } catch {
      throw new Error(CORRUPT_SAVE_MESSAGE);
    }
  },
  write(key, value) {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify([...value]));
  },
};
