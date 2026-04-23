export interface SaveStore {
  read(key: string): Uint8Array | null;
  write(key: string, value: Uint8Array): void;
}

export interface AudioPort {
  playMusic(id: string): void;
  stopMusic(): void;
  playSfx(id: string): void;
}

export interface EngineHost {
  readonly saveStore: SaveStore;
  readonly audio: AudioPort;
}
