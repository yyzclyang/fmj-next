import { readGbkString, readUint16, readUint32 } from '@/lib/resource-utils';

export interface ScriptCString {
  readonly byteLength: number;
  readonly text: string;
}

export class ScriptReader {
  constructor(
    private readonly scriptData: Uint8Array,
    readonly commandOffset: number
  ) {}

  readUint8(parameterOffset = 0): number {
    this.ensureAvailable(parameterOffset, 1);
    return this.scriptData[this.absoluteParameterOffset(parameterOffset)] ?? 0;
  }

  readUint16(parameterOffset = 0): number {
    this.ensureAvailable(parameterOffset, 2);
    return readUint16(this.scriptData, this.absoluteParameterOffset(parameterOffset));
  }

  readUint32(parameterOffset = 0): number {
    this.ensureAvailable(parameterOffset, 4);
    return readUint32(this.scriptData, this.absoluteParameterOffset(parameterOffset));
  }

  readCString(parameterOffset = 0): ScriptCString {
    const start = this.absoluteParameterOffset(parameterOffset);
    this.ensureAvailable(parameterOffset, 1);

    const byteLength = this.readNullTerminatedByteLength(parameterOffset);

    return {
      byteLength,
      text: readGbkString(this.scriptData, start),
    };
  }

  readNullTerminatedByteLength(parameterOffset = 0): number {
    const start = this.absoluteParameterOffset(parameterOffset);
    this.ensureAvailable(parameterOffset, 1);

    let end = start;
    while (end < this.scriptData.length && this.scriptData[end] !== 0) {
      end += 1;
    }

    if (end >= this.scriptData.length) {
      throw new Error(`脚本参数未终止 offset=${start}`);
    }

    return end - start + 1;
  }

  private absoluteParameterOffset(parameterOffset: number): number {
    return this.commandOffset + 1 + parameterOffset;
  }

  private ensureAvailable(parameterOffset: number, byteLength: number): void {
    if (parameterOffset < 0) {
      throw new Error(`脚本参数偏移不能为负数 parameterOffset=${parameterOffset}`);
    }
    const start = this.absoluteParameterOffset(parameterOffset);
    if (start < 0 || start + byteLength > this.scriptData.length) {
      throw new Error(`脚本参数越界 offset=${start}, byteLength=${byteLength}, scriptLength=${this.scriptData.length}`);
    }
  }
}
