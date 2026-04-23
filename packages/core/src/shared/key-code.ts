export const KeyCode = {
  Up: 1,
  Down: 2,
  Left: 3,
  Right: 4,
  PageUp: 5,
  PageDown: 6,
  Enter: 7,
  Cancel: 8,
  Repeat: 9,
} as const;

export type KeyCode = (typeof KeyCode)[keyof typeof KeyCode];
