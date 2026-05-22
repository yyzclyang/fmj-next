import Dexie from 'dexie';
import type { BbkGameLib } from '@/apis/game';

export interface LibBuffer {
  id: number;
  libId: number;
  buffer: ArrayBufferLike;
}

class BbkGamesDB extends Dexie {
  lib!: Dexie.Table<BbkGameLib, number>;
  libBuffer!: Dexie.Table<LibBuffer, number>;

  constructor() {
    super('bbk_games');
    this.version(1).stores({
      lib: '++id',
      libBuffer: '++id, libId',
    });
  }
}

export const db = new BbkGamesDB();
