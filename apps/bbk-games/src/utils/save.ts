import type { SaveStore } from '@fmj-next/core';
import dayjs from 'dayjs';

const SAVE_ENVELOPE_VERSION = 'v1';
const STORAGE_PREFIX = `bbk-games:save:${SAVE_ENVELOPE_VERSION}:`;
const CORRUPT_SAVE_MESSAGE = '存档损坏';
const LIB_SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SAVE_SCOPE_ID_PATTERN = /^[A-Za-z0-9-]+$/;
const LAST_LIB_ID_KEY = 'bbk-games:last-lib-id';

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

export class WebSaveStore implements SaveStore {
  private readonly scopeId: string;
  private readonly sha256: string;

  constructor(context: SaveContext) {
    const sha256 = context.sha256.toLowerCase();
    if (!LIB_SHA256_PATTERN.test(sha256)) throw new Error(`LIB SHA-256 非法: ${context.sha256}`);
    if (!SAVE_SCOPE_ID_PATTERN.test(context.scopeId)) throw new Error(`存档 scopeId 非法: ${context.scopeId}`);
    this.scopeId = context.scopeId;
    this.sha256 = sha256;
  }

  read(slot: number): Uint8Array | null {
    const raw = window.localStorage.getItem(this.getSlotKey(slot));
    if (raw === null) return null;
    try {
      return parseEnvelope(raw, this.scopeId);
    } catch {
      throw new Error(CORRUPT_SAVE_MESSAGE);
    }
  }

  write(slot: number, value: Uint8Array): void {
    window.localStorage.setItem(
      this.getSlotKey(slot),
      JSON.stringify(createEnvelope(value, this.scopeId, this.sha256))
    );
  }

  private getSlotKey(slot: number): string {
    return `${STORAGE_PREFIX}${this.scopeId}:slot:${slot}`;
  }
}

function createEnvelope(value: Uint8Array, scopeId: string, sha256: string): SaveEnvelope {
  return {
    version: SAVE_ENVELOPE_VERSION,
    scopeId,
    sha256,
    savedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    payload: [...value],
  };
}

function parseEnvelope(raw: string, scopeId: string): Uint8Array {
  const value = JSON.parse(raw) as unknown;
  if (!isSaveEnvelope(value, scopeId)) throw new Error(CORRUPT_SAVE_MESSAGE);
  return Uint8Array.from(value.payload);
}

function isSaveEnvelope(value: unknown, scopeId: string): value is SaveEnvelope {
  if (!isRecord(value)) return false;
  return (
    value.version === SAVE_ENVELOPE_VERSION &&
    value.scopeId === scopeId &&
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

export function saveLastLibId(libId: number): void {
  localStorage.setItem(LAST_LIB_ID_KEY, String(libId));
}

export function loadLastLibId(): number | null {
  const value = localStorage.getItem(LAST_LIB_ID_KEY);
  return value ? Number(value) : null;
}
