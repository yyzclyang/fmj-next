import type { AudioPort } from '@fmj-next/core';

export const webAudioPort: AudioPort = {
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
