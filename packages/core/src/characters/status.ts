export interface StatusSlot {
  value: number;
  round: number;
}

export const STATUS_SLOT_COUNT = 8;
export const STATUS_FLAGS_ALL = 0b1111_1111;

export const STATUS_FLAG_SLEEP = 0b0000_0001;
export const STATUS_FLAG_SEAL = 0b0000_0010;
export const STATUS_FLAG_CONFUSE = 0b0000_0100;
export const STATUS_FLAG_POISON = 0b0000_1000;
export const STATUS_FLAG_ATTACK_ALL = 0b0001_0000;
export const STATUS_FLAG_ATTACK = 0b0010_0000;
export const STATUS_FLAG_DEFENSE = 0b0100_0000;
export const STATUS_FLAG_AGILITY = 0b1000_0000;

export const STATUS_SLOT_SLEEP = 0;
export const STATUS_SLOT_SEAL = 1;
export const STATUS_SLOT_CONFUSE = 2;
export const STATUS_SLOT_POISON = 3;
export const STATUS_SLOT_ATTACK = 5;
export const STATUS_SLOT_DEFENSE = 6;
export const STATUS_SLOT_AGILITY = 7;

export class StatusSlots {
  readonly slots: StatusSlot[] = Array.from({ length: STATUS_SLOT_COUNT }, () => ({ value: 0, round: 0 }));

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
    this.clearFlags(STATUS_FLAGS_ALL);
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
    for (let i = STATUS_SLOT_SLEEP; i <= STATUS_SLOT_POISON; i += 1) this.decayStackedStatus(i);
    for (let i = STATUS_SLOT_ATTACK; i <= STATUS_SLOT_AGILITY; i += 1) this.decayTimedStatus(i);
  }

  private decayStackedStatus(slotIndex: number): void {
    const slot = this.slots[slotIndex];
    if (!slot || slot.round <= 0) return;
    slot.round -= 1;
    if (slot.round > 0) return;
    slot.value -= 1;
  }

  private decayTimedStatus(slotIndex: number): void {
    const slot = this.slots[slotIndex];
    if (!slot || slot.round <= 0) return;
    slot.round -= 1;
    if (slot.round <= 0) slot.value = 0;
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
  for (let i = 0; i < STATUS_SLOT_COUNT; i += 1) {
    if ((flags & (1 << i)) !== 0) slotIndexes.push(i);
  }
  return slotIndexes;
}
