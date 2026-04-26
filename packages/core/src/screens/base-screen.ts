import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import type { KeyCode } from '@/shared/key-code';
import { ScreenStack } from './screen-stack';

export abstract class BaseScreen {
  readonly screenStack = new ScreenStack();
  protected readonly game: Game;

  protected constructor(game: Game) {
    this.game = game;
  }

  update(delta: number): void {
    void delta;
  }

  abstract draw(surface: Surface): void;

  onKey(key: KeyCode): boolean | undefined {
    void key;
    return undefined;
  }

  onEnter(): void {}

  onExit(): void {}

  performUpdate(delta: number): void {
    if (!this.screenStack.isEmpty) {
      this.screenStack.update(delta);
      return;
    }

    this.update(delta);
  }

  performDraw(surface: Surface): void {
    this.draw(surface);
    this.screenStack.draw(surface);
  }

  dispatchKey(key: KeyCode): boolean | undefined {
    if (!this.screenStack.isEmpty && this.screenStack.onKey(key) !== true) return;
    return this.onKey(key);
  }

  performEnter(): void {
    this.onEnter();
  }

  performExit(): void {
    this.screenStack.clear();
    this.onExit();
  }
}
