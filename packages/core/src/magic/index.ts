export { BaseMagic } from './base-magic';
export type { MagicResourceProvider } from './base-magic';
export { MagicAttack } from './magic-attack';
export { MagicAuxiliary } from './magic-auxiliary';
export { MagicEnhance } from './magic-enhance';
export { MagicRestore } from './magic-restore';
export { MagicSpecial } from './magic-special';
export { ResMagicChain } from './res-magic-chain';
export type { MagicChainResourceProvider } from './res-magic-chain';

import type { MagicResourceProvider } from './base-magic';
import { BaseMagic } from './base-magic';
import { MagicAttack } from './magic-attack';
import { MagicAuxiliary } from './magic-auxiliary';
import { MagicEnhance } from './magic-enhance';
import { MagicRestore } from './magic-restore';
import { MagicSpecial } from './magic-special';

export function createMagic(type: number, resources: MagicResourceProvider): BaseMagic | null {
  switch (type) {
    case 1:
      return new MagicAttack(resources);
    case 2:
      return new MagicEnhance(resources);
    case 3:
      return new MagicRestore(resources);
    case 4:
      return new MagicAuxiliary(resources);
    case 5:
      return new MagicSpecial(resources);
    default:
      return null;
  }
}
