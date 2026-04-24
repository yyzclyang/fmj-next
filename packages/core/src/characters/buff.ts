export interface BuffState {
  value: number;
  round: number;
}

export class BuffMan {
  readonly buffs: BuffState[] = Array.from({ length: 8 }, () => ({ value: 0, round: 0 }));

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
