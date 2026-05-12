import type { Surface } from '@/rendering/surface';
import type { KeyCode } from '@/utils/key-code';

export interface ScreenOverlay {
  readonly coversScreen: boolean;
  draw(surface: Surface): void;
  onKey?(key: KeyCode): boolean | undefined;
}
