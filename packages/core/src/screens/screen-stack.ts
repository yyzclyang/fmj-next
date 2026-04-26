import type { Surface } from '@/rendering/surface';
import type { KeyCode } from '@/shared/key-code';
import type { BaseScreen } from './base-screen';

export class ScreenStack {
  private readonly screens: BaseScreen[] = [];

  get current(): BaseScreen | null {
    return this.screens[this.screens.length - 1] ?? null;
  }

  get isEmpty(): boolean {
    return this.screens.length === 0;
  }

  push(screen: BaseScreen): void {
    this.screens.push(screen);
    screen.performEnter();
  }

  pop(): BaseScreen | null {
    const screen = this.screens.pop() ?? null;
    screen?.performExit();
    return screen;
  }

  replace(screen: BaseScreen): void {
    this.pop();
    this.push(screen);
  }

  clear(): void {
    while (this.screens.length > 0) {
      this.pop();
    }
  }

  update(delta: number): void {
    this.current?.performUpdate(delta);
  }

  draw(surface: Surface): void {
    const screens = [...this.screens];
    for (const screen of screens) {
      screen.performDraw(surface);
    }
  }

  onKey(key: KeyCode): boolean | undefined {
    const screens = [...this.screens];
    for (let index = screens.length - 1; index >= 0; index -= 1) {
      if (screens[index]?.dispatchKey(key) !== true) return;
    }
    return true;
  }
}
