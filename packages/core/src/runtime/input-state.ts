import { KeyCode } from '@/shared/key-code';

export class InputState {
  private readonly pressed = new Set<KeyCode>();

  press(key: KeyCode): void {
    this.pressed.add(key);
  }

  release(key: KeyCode): void {
    this.pressed.delete(key);
  }

  isPressed(key: KeyCode): boolean {
    return this.pressed.has(key);
  }
}
