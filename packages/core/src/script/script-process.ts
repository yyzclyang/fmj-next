interface ScriptCommand {
  execute(process: ScriptProcess): void;
}

const MAX_STEPS_PER_TICK = 2048;

// 最小脚本进程只负责顺序执行、事件跳转和地址跳转。
export class ScriptProcess {
  private currentIndex = 0;
  running = false;

  constructor(
    private readonly commands: ScriptCommand[],
    private readonly eventIndex: number[],
    private readonly addressIndexMap: Map<number, number>,
    private readonly headerSize: number
  ) {}

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  step(): void {
    let steps = 0;

    while (this.running && this.currentIndex < this.commands.length && steps < MAX_STEPS_PER_TICK) {
      const indexBefore = this.currentIndex;
      this.commands[this.currentIndex]?.execute(this);
      if (!this.running) return;
      if (this.currentIndex === indexBefore) {
        this.currentIndex += 1;
      }
      steps += 1;
    }

    if (this.currentIndex >= this.commands.length) {
      this.running = false;
      return;
    }

    if (steps >= MAX_STEPS_PER_TICK) {
      throw new Error('Script step limit exceeded');
    }
  }

  gotoAddress(address: number): void {
    const target = this.addressIndexMap.get(address - this.headerSize);
    if (target == null) return;
    this.currentIndex = target;
  }

  triggerEvent(eventId: number): boolean {
    if (eventId < 1 || eventId > this.eventIndex.length) return false;

    const target = this.eventIndex[eventId - 1] ?? -1;
    if (target < 0) return false;

    this.currentIndex = target;
    this.running = true;
    return true;
  }
}
