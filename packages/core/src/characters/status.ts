export interface StatusSlot {
  value: number;
  round: number;
}

export class StatusSlots {
  readonly slots: StatusSlot[] = Array.from({ length: 8 }, () => ({ value: 0, round: 0 }));

  hasAnyFlag(flags: number): boolean {
    return flagsToSlotIndexes(flags).some(slotIndex => (this.slots[slotIndex]?.value ?? 0) > 0);
  }

  toFlags(): number {
    let flags = 0;
    for (let i = 0; i < this.slots.length; i += 1) {
      if ((this.slots[i]?.value ?? 0) > 0) flags |= 1 << i;
    }
    return flags;
  }

  replaceWithFlags(flags: number, round: number): void {
    this.clearFlags(0b1111_1111);
    for (const slotIndex of flagsToSlotIndexes(flags)) {
      const slot = this.slots[slotIndex];
      if (!slot) continue;
      slot.value = 1;
      slot.round = round;
    }
  }

  addFlags(flags: number, round: number): void {
    for (const slotIndex of flagsToSlotIndexes(flags)) {
      const slot = this.slots[slotIndex];
      if (!slot) continue;
      if (round === 0) {
        slot.value += 1;
      } else {
        if (slot.round === 0) slot.value += 1;
        slot.round = Math.max(slot.round, round);
      }
    }
  }

  removeFlags(flags: number): void {
    for (const slotIndex of flagsToSlotIndexes(flags)) {
      const slot = this.slots[slotIndex];
      if (slot && slot.value > 0) slot.value -= 1;
    }
  }

  clearFlags(flags: number): void {
    for (const slotIndex of flagsToSlotIndexes(flags)) {
      const slot = this.slots[slotIndex];
      if (!slot) continue;
      slot.value = 0;
      slot.round = 0;
    }
  }

  decay(): void {
    for (let i = 0; i <= 3; i += 1) this.decayOne(i, 0);
    for (let i = 5; i <= 7; i += 1) this.decayOne(i, 1);
  }

  private decayOne(slotIndex: number, mode: 0 | 1): void {
    const slot = this.slots[slotIndex];
    if (!slot || slot.round <= 0) return;
    slot.round -= 1;
    if (slot.round > 0) return;
    if (mode === 0) slot.value -= 1;
    else slot.value = 0;
  }

  static fromFlags(flags: number, round: number): StatusSlots {
    const statusSlots = new StatusSlots();
    for (const slotIndex of flagsToSlotIndexes(flags)) {
      const slot = statusSlots.slots[slotIndex];
      if (!slot) continue;
      slot.value = 1;
      slot.round = round;
    }
    return statusSlots;
  }
}

export function flagsToSlotIndexes(flags: number): number[] {
  const slotIndexes: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    if ((flags & (1 << i)) !== 0) slotIndexes.push(i);
  }
  return slotIndexes;
}
