import type { Game } from '@/game/game';
import type { Surface } from '@/rendering/surface';
import type { KeyCode } from '@/shared/key-code';
import { ScreenStack } from './screen-stack';

export abstract class BaseScreen {
  readonly screenStack = new ScreenStack();
  protected readonly game: Game;
  private ownerStack: ScreenStack | null = null;

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

  attachOwnerStack(stack: ScreenStack): void {
    if (this.ownerStack) {
      throw new Error('Screen 已经挂载到其他 ScreenStack');
    }
    this.ownerStack = stack;
  }

  detachOwnerStack(stack: ScreenStack): void {
    if (this.ownerStack !== stack) {
      throw new Error('ScreenStack 解绑了不属于自己的 Screen');
    }
    this.ownerStack = null;
  }

  protected close(): void {
    if (!this.ownerStack) {
      throw new Error('未挂载的 Screen 不能关闭');
    }
    this.ownerStack.close(this);
  }

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
    if (!this.screenStack.isEmpty && this.screenStack.dispatchKey(key) !== true) return;
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
