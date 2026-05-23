import Dexie from 'dexie';
import type { BbkGameLib } from '@/apis/game';

export interface LibBuffer {
  id: number;
  libId: number;
  buffer: ArrayBufferLike;
}

export type GameSource = 'local' | 'remote';

export interface SaveRecord {
  id?: number;
  scopeId: string;
  slot: number;
  source: GameSource;
  libId: number;
  payload: ArrayBuffer;
  savedAt: string;
}

class BbkGamesDB extends Dexie {
  lib!: Dexie.Table<BbkGameLib, number>;
  libBuffer!: Dexie.Table<LibBuffer, number>;
  save!: Dexie.Table<SaveRecord, number>;

  constructor() {
    super('bbk_games');
    this.version(1).stores({
      lib: '++id',
      libBuffer: '++id, libId',
      save: '++id, scopeId, slot, [scopeId+slot]',
    });
  }
}

export const db = new BbkGamesDB();
