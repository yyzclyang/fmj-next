import { Direction, toDirection } from '@/characters';

export function toNpcStepDirection(faceTo: number): Direction {
  // NPCSTEP 的朝向参数是 0..3，比角色资源里的 Direction 编码少 1。
  if (faceTo < 0 || faceTo > 3) return Direction.South;
  return toDirection(faceTo + 1);
}
