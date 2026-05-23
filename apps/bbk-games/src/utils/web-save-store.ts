import type { SaveStore } from '@fmj-next/core';
import dayjs from 'dayjs';
import { db, type GameSource, type SaveRecord } from '@/utils/database';

const LAST_GAME_META_KEY = 'bbk-games:last-game';

interface SaveContext {
  readonly scopeId: string;
  readonly libId: number;
  readonly source: GameSource;
}

interface LastGameMeta {
  readonly source: GameSource;
  readonly libId: number;
}

export class WebSaveStore implements SaveStore {
  private readonly source: GameSource;
  private readonly scopeId: string;
  private readonly libId: number;
  private readonly cache = new Map<number, Uint8Array>();

  constructor(context: SaveContext) {
    this.source = context.source;
    this.scopeId = context.scopeId;
    this.libId = context.libId;
  }

  async preload(): Promise<void> {
    const records = await db.save.where('scopeId').equals(this.scopeId).toArray();
    for (const record of records) {
      this.cache.set(record.slot, new Uint8Array(record.payload));
    }
  }

  read(slot: number): Uint8Array | null {
    return this.cache.get(slot) ?? null;
  }

  write(slot: number, value: Uint8Array): void {
    this.cache.set(slot, value);
    const record: SaveRecord = {
      scopeId: this.scopeId,
      slot,
      source: this.source,
      libId: this.libId,
      payload: value.slice().buffer,
      savedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    db.save
      .where('[scopeId+slot]')
      .equals([this.scopeId, slot])
      .modify({ payload: record.payload, savedAt: record.savedAt, source: record.source, libId: record.libId })
      .then(count => {
        if (count === 0) db.save.add(record);
      });
  }
}

export function saveLastGameMeta(meta: LastGameMeta): void {
  localStorage.setItem(LAST_GAME_META_KEY, JSON.stringify(meta));
}

export function loadLastGameMeta(): LastGameMeta | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_GAME_META_KEY) ?? '');
  } catch {
    return null;
  }
}
