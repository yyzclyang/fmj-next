import { createBrowserRuntime } from '@fmj-next/browser';
import { KeyCode, type DebugApi } from '@fmj-next/core';
import { gameProfiles, type GameId } from './game-profiles';
import { loadDatLib } from './load-datlib';
import { webAudioPort } from './web-audio-port';
import { webSaveStore } from './web-save-store';

declare global {
  interface Window {
    fmjDebug?: DebugApi;
  }
}

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
    case 'PageUp':
      return KeyCode.PageUp;
    case 'PageDown':
      return KeyCode.PageDown;
    case 'Enter':
      return KeyCode.Enter;
    case 'Escape':
      return KeyCode.Cancel;
    case 'KeyR':
      return KeyCode.Repeat;
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
    <div style="position:relative;width:322px;height:194px;">
      <canvas id="screen" style="width:320px;height:192px;border:1px solid #111;image-rendering:pixelated;"></canvas>
      <div id="exit-status" style="display:none;position:absolute;inset:1px;align-items:center;justify-content:center;background:rgba(0,0,0,.72);color:#fff;font:16px sans-serif;">
        已退出
      </div>
    </div>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('#screen');
  const exitStatus = root.querySelector<HTMLDivElement>('#exit-status');
  const gameSelect = root.querySelector<HTMLSelectElement>('#game-select');
  const speedSelect = root.querySelector<HTMLSelectElement>('#speed-select');
  if (!canvas || !exitStatus || !gameSelect || !speedSelect) {
    throw new Error('Missing runtime UI');
  }
  const screenCanvas = canvas;
  const statusOverlay = exitStatus;

  let runtime: ReturnType<typeof createBrowserRuntime> | null = null;
  function setExited(exited: boolean): void {
    if (exited) runtime?.dispose();
    screenCanvas.style.opacity = exited ? '0.45' : '1';
    statusOverlay.style.display = exited ? 'flex' : 'none';
  }

  runtime = createBrowserRuntime({
    canvas: screenCanvas,
    saveStore: webSaveStore,
    audio: webAudioPort,
    requestExit: () => setExited(true),
    speed: 1,
  });
  window.fmjDebug = runtime.debug;

  async function start(gameId: GameId): Promise<void> {
    setExited(false);
    const datLib = await loadDatLib(gameId);
    runtime?.start({ datLib, profile: gameProfiles[gameId] });
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
    runtime?.keyDown(key);
    event.preventDefault();
  });

  window.addEventListener('keyup', event => {
    const key = mapKeyboard(event.code);
    if (key == null) return;
    runtime?.keyUp(key);
    event.preventDefault();
  });

  window.addEventListener('beforeunload', () => {
    runtime?.dispose();
  });
}

void bootstrap();
