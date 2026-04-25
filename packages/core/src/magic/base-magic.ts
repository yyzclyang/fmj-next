import { ResBase } from '@/lib/res-base';
import type { ResSrs } from '@/lib/res-srs';
import { readGbkString } from '@/lib/resource-utils';

export interface MagicResourceProvider {
  getSrs(type: number, index: number): ResSrs | null;
}

export abstract class BaseMagic extends ResBase {
  roundNum = 0;
  isForAll = false;
  costMp = 0;
  magicAni: ResSrs | null = null;
  magicName = '';
  magicDescription = '';

  constructor(protected readonly resources: MagicResourceProvider) {
    super();
  }

  setData(buf: Uint8Array, offset: number): void {
    this.type = buf[offset] ?? 0;
    this.index = buf[offset + 1] ?? 0;
    const roundFlag = buf[offset + 3] ?? 0;
    this.roundNum = roundFlag & 0x7f;
    this.isForAll = (roundFlag & 0x80) !== 0;
    this.costMp = buf[offset + 4] ?? 0;
    const animationIndex = buf[offset + 5] ?? 0;
    this.magicAni = animationIndex > 0 ? this.resources.getSrs(2, animationIndex) : null;
    this.magicName = readGbkString(buf, offset + 6);
    this.magicDescription = readMagicDescription(buf, offset);
    this.setOtherData(buf, offset);
  }

  protected abstract setOtherData(buf: Uint8Array, offset: number): void;
}

function readMagicDescription(buf: Uint8Array, offset: number): string {
  const declaredLength = buf[offset + 2] ?? 0;
  if (declaredLength <= 0x70) return readGbkString(buf, offset + 0x1a);

  // 原版会把 offset + 0x70 写成 0 来截断，这里复制切片避免修改共享资源缓冲区。
  const end = offset + 0x70;
  const slice = buf.slice(offset + 0x1a, end);
  return readGbkString(slice, 0);
}
