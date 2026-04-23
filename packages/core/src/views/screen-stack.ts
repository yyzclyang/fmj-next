import { Surface } from '@/rendering/surface';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from './base-screen';

export class ScreenStack {
  private currentScreen: BaseScreen | null = null;

  changeScreen(screen: BaseScreen): void {
    this.currentScreen = screen;
  }

  update(delta: number): void {
    this.currentScreen?.update(delta);
  }

  draw(surface: Surface): void {
    this.currentScreen?.draw(surface);
  }

  keyDown(key: KeyCode): void {
    this.currentScreen?.onKeyDown(key);
  }

  keyUp(key: KeyCode): void {
    this.currentScreen?.onKeyUp(key);
  }
}
