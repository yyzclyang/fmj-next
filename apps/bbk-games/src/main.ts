import { createBrowserRuntime } from '@fmj-next/browser';
import { KeyCode } from '@fmj-next/core';
import { gameProfiles, type GameId } from './game-profiles';
import { loadDatLib } from './load-datlib';
import { webAudioPort } from './web-audio-port';
import { webSaveStore } from './web-save-store';

function mapKeyboard(code: string): KeyCode | null {
  switch (code) {
    case 'ArrowUp':
      return KeyCode.Up;
    case 'ArrowDown':
      return KeyCode.Down;
    case 'ArrowLeft':
      return KeyCode.Left;
    case 'ArrowRight':
      return KeyCode.Right;
    case 'Enter':
      return KeyCode.Enter;
    case 'Escape':
      return KeyCode.Cancel;
    default:
      return null;
  }
}

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('Missing #app root');
  }

  const gameOptions = Object.entries(gameProfiles)
    .map(([id, profile]) => `<option value="${id}">${profile.title}</option>`)
    .join('');

  root.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
      <label>游戏：
        <select id="game-select">
          ${gameOptions}
        </select>
      </label>
      <label>倍速：
        <select id="speed-select">
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="3">3x</option>
        </select>
      </label>
    </div>
    <canvas id="screen" style="width:480px;height:288px;border:1px solid #111;image-rendering:pixelated;"></canvas>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('#screen');
  const gameSelect = root.querySelector<HTMLSelectElement>('#game-select');
  const speedSelect = root.querySelector<HTMLSelectElement>('#speed-select');
  if (!canvas || !gameSelect || !speedSelect) {
    throw new Error('Missing runtime UI');
  }

  const runtime = createBrowserRuntime({
    canvas,
    saveStore: webSaveStore,
    audio: webAudioPort,
    speed: 1,
  });

  async function start(gameId: GameId): Promise<void> {
    const datLib = await loadDatLib(gameId);
    runtime.start({ datLib });
  }

  await start(gameSelect.value as GameId);

  gameSelect.addEventListener('change', async () => {
    await start(gameSelect.value as GameId);
  });

  speedSelect.addEventListener('change', () => {
    runtime.setSpeed(Number(speedSelect.value));
  });

  window.addEventListener('keydown', event => {
    const key = mapKeyboard(event.code);
    if (key == null) return;
    runtime.keyDown(key);
    event.preventDefault();
  });

  window.addEventListener('keyup', event => {
    const key = mapKeyboard(event.code);
    if (key == null) return;
    runtime.keyUp(key);
    event.preventDefault();
  });

  window.addEventListener('beforeunload', () => {
    runtime.dispose();
  });
}

void bootstrap();
