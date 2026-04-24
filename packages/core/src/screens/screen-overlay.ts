import type { Surface } from '@/rendering/surface';
import type { KeyCode } from '@/shared/key-code';

export interface ScreenOverlay {
  readonly coversScreen: boolean;
  draw(surface: Surface): void;
  onKeyDown?(key: KeyCode): void;
  onKeyUp?(key: KeyCode): void;
}
