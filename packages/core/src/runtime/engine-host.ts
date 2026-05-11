export interface SaveStore {
  read(slot: number): Uint8Array | null;
  write(slot: number, value: Uint8Array): void;
}

export interface AudioPort {
  playMusic(id: string): void;
  stopMusic(): void;
}

export interface EngineHost {
  readonly saveStore: SaveStore;
  readonly audio: AudioPort;
  requestExit?(): void;
}
