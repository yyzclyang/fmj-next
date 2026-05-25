import Dexie from 'dexie';
import type { BbkGameLib } from '@/apis/game';

export interface LibBuffer {
  id: number;
  sha256: string;
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
    this.version(2).stores({
      libBuffer: '++id, sha256',
    }).upgrade(async tx => {
      const libs = await tx.table('lib').toArray();
      const libMap = new Map(libs.map(l => [l.id, l]));
      await tx.table('libBuffer').toCollection().modify(buf => {
        const lib = libMap.get(buf.libId);
        if (lib) buf.sha256 = lib.sha256;
      });
    });
  }
}

export const db = new BbkGamesDB();
