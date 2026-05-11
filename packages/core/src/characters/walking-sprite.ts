import { type ResImage } from '@/lib/res-image';

// 行走图在解析角色资源时绑定图片，避免主场景每帧重新取资源。
export class WalkingSprite {
  constructor(readonly image: ResImage) {}

  get type(): number {
    return this.image.type;
  }

  get index(): number {
    return this.image.index;
  }
}
