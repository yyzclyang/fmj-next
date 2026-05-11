import {
  STATUS_FLAG_POISON,
  STATUS_FLAG_DEFENSE,
  STATUS_FLAG_SEAL,
  STATUS_FLAG_ATTACK,
  STATUS_FLAG_CONFUSE,
  STATUS_FLAG_SLEEP,
  STATUS_FLAG_AGILITY,
} from '@/characters/status';
import type { FightingCharacter } from '@/characters';
import type { Game } from '@/game/game';
import type { ResImage } from '@/lib/res-image';
import type { ResSrs } from '@/lib/res-srs';
import { ResourceType } from '@/lib/resource-utils';
import type { Surface } from '@/rendering/surface';
import { drawText } from '@/rendering/text-render';
import { drawActiveAnimations, FRAME_INTERVAL, updateActiveAnimations } from './animation-sprite';
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
  private raiseAnimations: CombatActionAnimation[];
  private readonly visibleTargetSet: Set<FightingCharacter>;

  constructor(raiseAnimations: readonly CombatActionAnimation[], fighters: readonly FightingCharacter[]) {
    this.raiseAnimations = [...raiseAnimations];
    this.visibleTargetSet = new Set(fighters);
  }

  keepsVisible(fighter: FightingCharacter): boolean {
    return this.visibleTargetSet.has(fighter);
  }

  update(delta: number): boolean {
    return updateActiveAnimations(this.raiseAnimations, delta);
  }

  draw(surface: Surface): void {
    drawActiveAnimations(surface, this.raiseAnimations);
  }
}

export class MissCombatAnimation implements CombatActionAnimation {
  private dy = 0;
  private dt = 0;
  private elapsed = 0;
  private readonly image: ResImage | null;

  constructor(
    game: Game,
    private readonly x: number,
    private readonly y: number
  ) {
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
    drawText(surface, 'Miss', this.x, this.y + this.dy);
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

  constructor(
    game: Game,
    private readonly x: number,
    private readonly y: number,
    private readonly hpDiff: number,
    statusFlags: number
  ) {
    this.showingNumber = hpDiff !== 0;
    this.signImage = hpDiff === 0 ? null : game.datLib.getImage(ResourceType.PIC, 2, hpDiff > 0 ? 6 : 7);
    this.smallNumImage = game.datLib.getImage(ResourceType.PIC, 2, 5);
    for (const item of [
      { flag: STATUS_FLAG_POISON, srs: 243 },
      { flag: STATUS_FLAG_CONFUSE, srs: 244 },
      { flag: STATUS_FLAG_SEAL, srs: 245 },
      { flag: STATUS_FLAG_SLEEP, srs: 246 },
      { flag: STATUS_FLAG_ATTACK, srs: 240 },
      { flag: STATUS_FLAG_DEFENSE, srs: 241 },
      { flag: STATUS_FLAG_AGILITY, srs: 242 },
    ]) {
      if ((statusFlags & item.flag) === 0) continue;
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
    drawText(surface, num > 0 ? `+${num}` : `${num}`, left, top);
    return;
  }
  signImage.draw(surface, 1, left, top);
  let x = left + signImage.width + 1;
  for (const char of `${Math.abs(num)}`) {
    smallNumImage.draw(surface, Number(char) + 1, x, top);
    x += smallNumImage.width + 1;
  }
}
