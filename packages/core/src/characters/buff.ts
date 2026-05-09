export interface BuffState {
  value: number;
  round: number;
}

export class BuffMan {
  readonly buffs: BuffState[] = Array.from({ length: 8 }, () => ({ value: 0, round: 0 }));

  hasBuff(mask: number): boolean {
    return maskToIndexes(mask).some(index => (this.buffs[index]?.value ?? 0) > 0);
  }

  toMask(): number {
    let mask = 0;
    for (let i = 0; i < this.buffs.length; i += 1) {
      if ((this.buffs[i]?.value ?? 0) > 0) mask |= 1 << i;
    }
    return mask;
  }

  setMask(mask: number, round: number): void {
    this.clearBuff(0xff);
    for (const index of maskToIndexes(mask)) {
      const buff = this.buffs[index];
      if (!buff) continue;
      buff.value = 1;
      buff.round = round;
    }
  }

  addBuff(mask: number, round: number): void {
    for (const index of maskToIndexes(mask)) {
      const buff = this.buffs[index];
      if (!buff) continue;
      if (round === 0) {
        buff.value += 1;
      } else {
        if (buff.round === 0) buff.value += 1;
        buff.round = Math.max(buff.round, round);
      }
    }
  }

  delBuff(mask: number): void {
    for (const index of maskToIndexes(mask)) {
      const buff = this.buffs[index];
      if (buff && buff.value > 0) buff.value -= 1;
    }
  }

  clearBuff(mask: number): void {
    for (const index of maskToIndexes(mask)) {
      const buff = this.buffs[index];
      if (!buff) continue;
      buff.value = 0;
      buff.round = 0;
    }
  }

  decay(): void {
    for (let i = 0; i <= 3; i += 1) this.decayOne(i, 0);
    for (let i = 5; i <= 7; i += 1) this.decayOne(i, 1);
  }

  private decayOne(index: number, mode: 0 | 1): void {
    const buff = this.buffs[index];
    if (!buff || buff.round <= 0) return;
    buff.round -= 1;
    if (buff.round > 0) return;
    if (mode === 0) buff.value -= 1;
    else buff.value = 0;
  }

  static fromRoundAndMask(round: number, mask: number): BuffMan {
    const man = new BuffMan();
    for (const index of maskToIndexes(mask)) {
      const buff = man.buffs[index];
      if (!buff) continue;
      buff.value = 1;
      buff.round = round;
    }
    return man;
  }
}

export function maskToIndexes(mask: number): number[] {
  const res: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    if ((mask & (1 << i)) !== 0) res.push(i);
  }
  return res;
}
