import type { Surface } from '@/rendering/surface';
import { drawSelectedText, drawText } from '@/rendering/text-render';

export interface VerticalMenuOptions {
  readonly items: readonly string[];
  readonly selectedIndex: number;
  readonly left: number;
  readonly top: number;
  readonly lineGap: number;
}

// 二级菜单都沿用同一套逐行高亮绘制，坐标仍由各 screen 按 Kotlin 基线控制。
export function drawVerticalMenu(surface: Surface, options: VerticalMenuOptions): void {
  const { items, selectedIndex, left, top, lineGap } = options;
  for (let i = 0; i < items.length; i += 1) {
    const draw = i === selectedIndex ? drawSelectedText : drawText;
    draw(surface, items[i] ?? '', left, top + i * lineGap);
  }
}

export function moveSelectionWrap(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return (index + step + count) % count;
}

export function moveSelectionClamp(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, index + step));
}
