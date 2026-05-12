import type { Surface } from '@/rendering/surface';
import type { KeyCode } from '@/utils/key-code';
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
    screen.attachOwnerStack(this);
    this.screens.push(screen);
    screen.performEnter();
  }

  pop(): BaseScreen | null {
    const screen = this.screens.pop() ?? null;
    if (!screen) return null;
    screen.performExit();
    screen.detachOwnerStack(this);
    return screen;
  }

  close(screen: BaseScreen): void {
    if (this.current !== screen) {
      throw new Error('只能关闭当前栈顶 Screen');
    }
    this.pop();
  }

  replace(screen: BaseScreen): void {
    this.pop();
    this.push(screen);
  }

  replaceAll(screen: BaseScreen): void {
    this.clear();
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

  // 返回 true 表示当前栈没有消费按键，调用方可以继续向外层传递。
  dispatchKey(key: KeyCode): boolean | undefined {
    const screens = [...this.screens];
    for (let index = screens.length - 1; index >= 0; index -= 1) {
      if (screens[index]?.dispatchKey(key) !== true) return;
    }
    return true;
  }
}
