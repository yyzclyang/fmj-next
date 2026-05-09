export interface StatusSlot {
  value: number;
  round: number;
}

export class StatusSet {
  readonly slots: StatusSlot[] = Array.from({ length: 8 }, () => ({ value: 0, round: 0 }));

  hasStatus(mask: number): boolean {
    return maskToIndexes(mask).some(index => (this.slots[index]?.value ?? 0) > 0);
  }

  toMask(): number {
    let mask = 0;
    for (let i = 0; i < this.slots.length; i += 1) {
      if ((this.slots[i]?.value ?? 0) > 0) mask |= 1 << i;
    }
    return mask;
  }

  setStatuses(mask: number, round: number): void {
    this.clearStatuses(0xff);
    for (const index of maskToIndexes(mask)) {
      const slot = this.slots[index];
      if (!slot) continue;
      slot.value = 1;
      slot.round = round;
    }
  }

  addStatuses(mask: number, round: number): void {
    for (const index of maskToIndexes(mask)) {
      const slot = this.slots[index];
      if (!slot) continue;
      if (round === 0) {
        slot.value += 1;
      } else {
        if (slot.round === 0) slot.value += 1;
        slot.round = Math.max(slot.round, round);
      }
    }
  }

  removeStatuses(mask: number): void {
    for (const index of maskToIndexes(mask)) {
      const slot = this.slots[index];
      if (slot && slot.value > 0) slot.value -= 1;
    }
  }

  clearStatuses(mask: number): void {
    for (const index of maskToIndexes(mask)) {
      const slot = this.slots[index];
      if (!slot) continue;
      slot.value = 0;
      slot.round = 0;
    }
  }

  decay(): void {
    for (let i = 0; i <= 3; i += 1) this.decayOne(i, 0);
    for (let i = 5; i <= 7; i += 1) this.decayOne(i, 1);
  }

  private decayOne(index: number, mode: 0 | 1): void {
    const slot = this.slots[index];
    if (!slot || slot.round <= 0) return;
    slot.round -= 1;
    if (slot.round > 0) return;
    if (mode === 0) slot.value -= 1;
    else slot.value = 0;
  }

  static fromRoundAndMask(round: number, mask: number): StatusSet {
    const set = new StatusSet();
    for (const index of maskToIndexes(mask)) {
      const slot = set.slots[index];
      if (!slot) continue;
      slot.value = 1;
      slot.round = round;
    }
    return set;
  }
}

export function maskToIndexes(mask: number): number[] {
  const res: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    if ((mask & (1 << i)) !== 0) res.push(i);
  }
  return res;
}
