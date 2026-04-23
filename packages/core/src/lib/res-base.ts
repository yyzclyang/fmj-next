export abstract class ResBase {
  type = 0;
  index = 0;

  abstract setData(buf: Uint8Array, offset: number): void;
}
