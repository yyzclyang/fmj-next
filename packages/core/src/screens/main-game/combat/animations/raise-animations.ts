import {
  BUFF_MASK_DU,
  BUFF_MASK_FANG,
  BUFF_MASK_FENG,
  BUFF_MASK_GONG,
  BUFF_MASK_LUAN,
  BUFF_MASK_MIAN,
  BUFF_MASK_SU,
} from '@/combat/combat-constants';
import type { FightingCharacter } from '@/characters';
import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import type { ResSrs } from '@/lib/res-srs';
import { ResourceType } from '@/lib/resource-utils';
import type { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { FRAME_INTERVAL } from './animation-sprite';
import type { CombatActionAnimation } from './animation-types';

export class StaticCombatAnimation implements CombatActionAnimation {
  private elapsed = 0;

  constructor(private readonly duration: number) {}

  update(delta: number): boolean {
    this.elapsed += delta;
    return this.elapsed < this.duration;
  }

  draw(): void {}
}

export class RaiseGroupCombatAnimation implements CombatActionAnimation {
  private raises: CombatActionAnimation[];
  private readonly targetSet: Set<FightingCharacter>;

  constructor(raises: readonly CombatActionAnimation[], fighters: readonly FightingCharacter[]) {
    this.raises = [...raises];
    this.targetSet = new Set(fighters);
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.targetSet.has(fighter);
  }

  update(delta: number): boolean {
    this.raises = this.raises.filter(raise => raise.update(delta));
    return this.raises.length > 0;
  }

  draw(surface: Surface): void {
    for (const raise of this.raises) raise.draw(surface);
  }
}

export class MissCombatAnimation implements CombatActionAnimation {
  private dy = 0;
  private dt = 0;
  private elapsed = 0;
  private readonly image: ResImage | null;

  constructor(game: Game, private readonly x: number, private readonly y: number) {
    this.image = game.datLib.getImage(ResourceType.PIC, 2, 18);
  }

  update(delta: number): boolean {
    this.elapsed += delta;
    while (this.elapsed >= FRAME_INTERVAL) {
      this.elapsed -= FRAME_INTERVAL;
      this.dt += 1;
      this.dy -= this.dt;
    }
    return this.dt <= 4;
  }

  draw(surface: Surface): void {
    if (this.image) {
      this.image.draw(surface, 1, this.x, this.y + this.dy);
      return;
    }
    TextRender.drawText(surface, 'Miss', this.x, this.y + this.dy);
  }
}

export class RaiseCombatAnimation implements CombatActionAnimation {
  private dy = 0;
  private dt = 0;
  private elapsed = 0;
  private showingNumber: boolean;
  private readonly signImage: ResImage | null;
  private readonly smallNumImage: ResImage | null;
  private readonly srsList: ResSrs[] = [];

  constructor(game: Game, private readonly x: number, private readonly y: number, private readonly hpDiff: number, buffMask: number) {
    this.showingNumber = hpDiff !== 0;
    this.signImage = hpDiff === 0 ? null : game.datLib.getImage(ResourceType.PIC, 2, hpDiff > 0 ? 6 : 7);
    this.smallNumImage = game.datLib.getImage(ResourceType.PIC, 2, 5);
    for (const item of [
      { mask: BUFF_MASK_DU, srs: 243 },
      { mask: BUFF_MASK_LUAN, srs: 244 },
      { mask: BUFF_MASK_FENG, srs: 245 },
      { mask: BUFF_MASK_MIAN, srs: 246 },
      { mask: BUFF_MASK_GONG, srs: 240 },
      { mask: BUFF_MASK_FANG, srs: 241 },
      { mask: BUFF_MASK_SU, srs: 242 },
    ]) {
      if ((buffMask & item.mask) === 0) continue;
      const srs = game.datLib.getSrs(1, item.srs);
      if (!srs) continue;
      srs.start();
      this.srsList.push(srs);
    }
  }

  update(delta: number): boolean {
    if (this.showingNumber) {
      this.elapsed += delta;
      while (this.elapsed >= FRAME_INTERVAL) {
        this.elapsed -= FRAME_INTERVAL;
        this.dt += 1;
        this.dy -= this.dt;
      }
      if (this.dt <= 4) return true;
      this.showingNumber = false;
      return this.srsList.length > 0;
    }
    const srs = this.srsList[0];
    if (!srs) return false;
    if (srs.update(delta)) return true;
    this.srsList.shift();
    return this.srsList.length > 0;
  }

  draw(surface: Surface): void {
    if (this.showingNumber) {
      drawSignedSmallNum(surface, this.signImage, this.smallNumImage, this.hpDiff, this.x, this.y + this.dy);
      return;
    }
    this.srsList[0]?.drawAbsolutely(surface, this.x, this.y);
  }
}

function drawSignedSmallNum(
  surface: Surface,
  signImage: ResImage | null,
  smallNumImage: ResImage | null,
  num: number,
  left: number,
  top: number
): void {
  if (!signImage || !smallNumImage) {
    TextRender.drawText(surface, num > 0 ? `+${num}` : `${num}`, left, top);
    return;
  }
  signImage.draw(surface, 1, left, top);
  let x = left + signImage.width + 1;
  for (const char of `${Math.abs(num)}`) {
    smallNumImage.draw(surface, Number(char) + 1, x, top);
    x += smallNumImage.width + 1;
  }
}
