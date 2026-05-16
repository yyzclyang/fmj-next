import type { SaveStore } from '@fmj-next/core';

const SAVE_ENVELOPE_VERSION = 'v1';
const STORAGE_PREFIX = `bbk-games:save:v1:`;
const CORRUPT_SAVE_MESSAGE = '存档损坏';
const LIB_SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SAVE_SCOPE_ID_PATTERN = /^[A-Za-z0-9-]+$/;

interface Save extends SaveStore {
  setSaveContext(context: SaveContext): void;
}

interface SaveContext {
  readonly scopeId: string;
  readonly sha256: string;
}

interface SaveEnvelope {
  readonly version: typeof SAVE_ENVELOPE_VERSION;
  readonly scopeId: string;
  readonly sha256: string;
  readonly savedAt: string;
  readonly payload: number[];
}

let saveContext: SaveContext | null = null;

function getCurrentSaveContext(): SaveContext {
  if (!saveContext) throw new Error('未设置存档上下文，无法读写存档');
  return saveContext;
}

function getSlotStorageKey(slot: number): string {
  return `${STORAGE_PREFIX}${getCurrentSaveContext().scopeId}:slot:${slot}`;
}

function createEnvelope(value: Uint8Array): SaveEnvelope {
  const context = getCurrentSaveContext();
  return {
    version: SAVE_ENVELOPE_VERSION,
    scopeId: context.scopeId,
    sha256: context.sha256,
    savedAt: new Date().toISOString(),
    payload: [...value],
  };
}

function parseEnvelope(raw: string): Uint8Array {
  const value = JSON.parse(raw) as unknown;
  if (!isSaveEnvelope(value)) throw new Error(CORRUPT_SAVE_MESSAGE);
  return Uint8Array.from(value.payload);
}

function isSaveEnvelope(value: unknown): value is SaveEnvelope {
  if (!isRecord(value)) return false;
  return (
    value.version === SAVE_ENVELOPE_VERSION &&
    value.scopeId === getCurrentSaveContext().scopeId &&
    typeof value.sha256 === 'string' &&
    LIB_SHA256_PATTERN.test(value.sha256) &&
    typeof value.savedAt === 'string' &&
    isByteArray(value.payload)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isByteArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => Number.isInteger(item) && item >= 0 && item <= 255);
}

export const webSaveStore: Save = {
  setSaveContext(context) {
    const sha256 = context.sha256.toLowerCase();
    if (!LIB_SHA256_PATTERN.test(sha256)) throw new Error(`LIB SHA-256 非法: ${context.sha256}`);
    if (!SAVE_SCOPE_ID_PATTERN.test(context.scopeId)) throw new Error(`存档 scopeId 非法: ${context.scopeId}`);
    saveContext = {
      scopeId: context.scopeId,
      sha256,
    };
  },
  read(slot) {
    const raw = window.localStorage.getItem(getSlotStorageKey(slot));
    if (raw === null) return null;
    try {
      return parseEnvelope(raw);
    } catch {
      throw new Error(CORRUPT_SAVE_MESSAGE);
    }
  },
  write(slot, value) {
    window.localStorage.setItem(getSlotStorageKey(slot), JSON.stringify(createEnvelope(value)));
  },
};
