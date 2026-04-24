import { ResImage } from '@/lib/res-image';

// 战斗图在角色资源解析时绑定图片，和 Kotlin FightingSprite 一样持有 ResImage。
export class FightingSprite {
  currentFrame = 1;
  combatX = 0;
  combatY = 0;

  constructor(readonly image: ResImage) {}

  get width(): number {
    return this.image.width;
  }

  get height(): number {
    return this.image.height;
  }

  get frameCount(): number {
    return this.image.number;
  }

  setCombatPos(x: number, y: number): void {
    this.combatX = x;
    this.combatY = y;
  }

  move(dx: number, dy: number): void {
    this.combatX += dx;
    this.combatY += dy;
  }
}
