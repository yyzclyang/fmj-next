import type { AudioPort } from '@fmj-next/core';

export const audio: AudioPort = {
  playMusic(id) {
    console.debug('[audio] playMusic', id);
  },
  stopMusic() {
    console.debug('[audio] stopMusic');
  },
  playSfx(id) {
    console.debug('[audio] playSfx', id);
  },
};
