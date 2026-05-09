import type { ResImage } from '@/lib/res-image';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { getTextWidth } from '@/screens/main-game/ui-utils';

export function drawSmallNum(surface: Surface, image: ResImage | null, num: number, left: number, top: number): number {
  const text = `${Math.max(0, Math.trunc(num))}`;
  if (!image) {
    TextRender.drawText(surface, text, left, top);
    return getTextWidth(text);
  }

  let x = left;
  for (const char of text) {
    image.draw(surface, Number(char) + 1, x, top);
    x += image.width + 1;
  }
  return text.length * image.width;
}
