import { KeyCode, type KeyCode as KeyCodeType } from '@fmj-next/core';

export type KeyBindings = Record<KeyCodeType, string[]>;

const STORAGE_KEY = 'bbk-key-bindings';

export const DefaultKeyBindings: KeyBindings = {
  [KeyCode.Up]: ['ArrowUp'],
  [KeyCode.Down]: ['ArrowDown'],
  [KeyCode.Left]: ['ArrowLeft'],
  [KeyCode.Right]: ['ArrowRight'],
  [KeyCode.PageUp]: ['PageUp'],
  [KeyCode.PageDown]: ['PageDown'],
  [KeyCode.Enter]: ['Enter'],
  [KeyCode.Cancel]: ['Escape'],
  [KeyCode.Repeat]: ['KeyR'],
  [KeyCode.Search]: ['Digit1'],
  [KeyCode.Insert]: ['Digit2'],
  [KeyCode.Modify]: ['Digit3'],
  [KeyCode.Delete]: ['Digit4'],
};

export const KeyCodeLabels: Record<KeyCodeType, string> = {
  [KeyCode.Up]: '上',
  [KeyCode.Down]: '下',
  [KeyCode.Left]: '左',
  [KeyCode.Right]: '右',
  [KeyCode.PageUp]: '上翻页',
  [KeyCode.PageDown]: '下翻页',
  [KeyCode.Enter]: '确认',
  [KeyCode.Cancel]: '取消',
  [KeyCode.Repeat]: '重复',
  [KeyCode.Search]: '搜索',
  [KeyCode.Insert]: '插入',
  [KeyCode.Modify]: '修改',
  [KeyCode.Delete]: '删除',
} as const;

export function loadKeyBindings(): KeyBindings {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return structuredClone(DefaultKeyBindings);
    return JSON.parse(json) as KeyBindings;
  } catch {
    return structuredClone(DefaultKeyBindings);
  }
}

export function saveKeyBindings(bindings: KeyBindings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function lookupKeyCode(bindings: KeyBindings, code: string): KeyCodeType | null {
  for (const [key, codes] of Object.entries(bindings)) {
    if (codes.includes(code)) return Number(key) as KeyCodeType;
  }
  return null;
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  const map: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Enter: 'Enter',
    Escape: 'Esc',
    Space: 'Space',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
    Backspace: '⌫',
    Tab: 'Tab',
  };
  return map[code] ?? code;
}
