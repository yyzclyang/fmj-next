interface ScriptCommand {
  execute(process: ScriptProcess): void;
}

export interface ScriptOperation {
  update(delta: number): boolean;
}

export interface ScriptProcessSnapshot {
  currentIndex: number;
  running: boolean;
  timer: number;
  timerCounter: number;
  timerEventId: number;
}

const MAX_STEPS_PER_TICK = 2048;

// 最小脚本进程只负责顺序执行、事件跳转和地址跳转。
export class ScriptProcess {
  private currentIndex = 0;
  private operation: ScriptOperation | null = null;
  private timer = 0;
  private timerCounter = 0;
  private timerEventId = 0;
  private resumeOnRestore = false;
  parent: ScriptProcess | null = null;
  running = false;

  constructor(
    private readonly commands: ScriptCommand[],
    private readonly eventIndex: number[],
    private readonly addressIndexMap: Map<number, number>,
    private readonly headerSize: number
  ) {}

  start(): void {
    this.running = true;
    this.resumeOnRestore = false;
  }

  stop(): void {
    this.running = false;
    this.resumeOnRestore = false;
  }

  pause(): void {
    this.currentIndex += 1;
    this.running = false;
  }

  pauseForSave(): void {
    this.pause();
    // GAMESAVE 暂停在存档 UI，读档后要从下一条指令继续跑。
    this.resumeOnRestore = true;
  }

  wait(operation: ScriptOperation): void {
    this.currentIndex += 1;
    this.operation = operation;
    this.running = false;
    this.resumeOnRestore = false;
  }

  get busy(): boolean {
    return this.running || this.operation != null;
  }

  get hasOperation(): boolean {
    return this.operation != null;
  }

  createSnapshot(): ScriptProcessSnapshot {
    if (this.operation) throw new Error('脚本操作执行中不能存档');
    return {
      currentIndex: this.currentIndex,
      running: this.resumeOnRestore || this.running,
      timer: this.timer,
      timerCounter: this.timerCounter,
      timerEventId: this.timerEventId,
    };
  }

  restoreSnapshot(snapshot: ScriptProcessSnapshot): void {
    if (snapshot.currentIndex < 0 || snapshot.currentIndex > this.commands.length) {
      throw new Error(`脚本进度越界: ${snapshot.currentIndex}`);
    }
    this.currentIndex = snapshot.currentIndex;
    this.running = snapshot.running;
    this.operation = null;
    this.timer = snapshot.timer;
    this.timerCounter = snapshot.timerCounter;
    this.timerEventId = snapshot.timerEventId;
    this.resumeOnRestore = false;
  }

  step(delta = 0): void {
    if (this.operation) {
      if (this.operation.update(delta)) return;
      this.operation = null;
      this.running = true;
    }

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

  startAtOffset(offset: number): void {
    const target = this.addressIndexMap.get(offset);
    if (target == null) throw new Error(`脚本偏移不存在: ${offset}`);
    this.currentIndex = target;
    this.operation = null;
    this.resumeOnRestore = false;
    this.running = true;
  }

  triggerEvent(eventId: number): boolean {
    if (this.operation) return false;
    if (eventId < 1 || eventId > this.eventIndex.length) return false;

    const target = this.eventIndex[eventId - 1] ?? -1;
    if (target < 0) return false;

    this.currentIndex = target;
    this.running = true;
    return true;
  }

  setTimer(timer: number, eventId: number): void {
    this.timer = timer * 500;
    this.timerCounter = this.timer;
    this.timerEventId = eventId;
  }

  timerStep(delta: number): void {
    if (this.timer <= 0 || this.timerEventId <= 0) return;
    this.timerCounter -= delta;
    if (this.timerCounter > 0) return;
    this.timerCounter += this.timer;
    this.triggerEvent(this.timerEventId);
  }
}
