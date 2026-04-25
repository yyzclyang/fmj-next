import { ResSrs, type ResSrsData, type SrsFrameHeader } from '../res-srs';
import { parseImageResource } from './parse-image';

export function parseSrsResource(buffer: Uint8Array, offset: number): ResSrs {
  return new ResSrs(parseSrsData(buffer, offset));
}

function parseSrsData(buffer: Uint8Array, offset: number): ResSrsData {
  const frameNum = buffer[offset + 2] ?? 0;
  const imageNum = buffer[offset + 3] ?? 0;
  let cursor = offset + 6;
  const frameHeaders: SrsFrameHeader[] = [];

  for (let i = 0; i < frameNum; i += 1) {
    frameHeaders.push({
      x: buffer[cursor] ?? 0,
      y: buffer[cursor + 1] ?? 0,
      show: buffer[cursor + 2] ?? 0,
      nshow: buffer[cursor + 3] ?? 0,
      imageIndex: buffer[cursor + 4] ?? 0,
    });
    cursor += 5;
  }

  const images = [];
  for (let i = 0; i < imageNum; i += 1) {
    const image = parseImageResource(buffer, cursor);
    images.push(image);
    cursor += image.bytesCount;
  }

  return {
    type: buffer[offset] ?? 0,
    index: buffer[offset + 1] ?? 0,
    frameNum,
    imageNum,
    startFrame: buffer[offset + 4] ?? 0,
    endFrame: buffer[offset + 5] ?? 0,
    frameHeaders,
    images,
  };
}
