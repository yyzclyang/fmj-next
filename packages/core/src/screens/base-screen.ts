import type { Game } from '@/game/game';
import { Surface } from '@/rendering/surface';
import { KeyCode } from '@/shared/key-code';

export abstract class BaseScreen {
  protected readonly game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  update(delta: number): void {
    void delta;
  }

  abstract draw(surface: Surface): void;

  onKeyDown(key: KeyCode): void {
    void key;
  }

  onKeyUp(key: KeyCode): void {
    void key;
  }
}
