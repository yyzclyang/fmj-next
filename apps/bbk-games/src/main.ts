import { createBrowserRuntime } from '@fmj-next/browser';
import { KeyCode, type DebugApi, type GameProfile } from '@fmj-next/core';
import { gameLibManifests, type GameId, type GameLibManifest } from './game-profiles';
import { loadLocalGameLib, loadRemoteGameLib, type LoadedGameLib } from './load-datlib';
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

  root.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
      <label>游戏：
        <select id="game-select">
        </select>
      </label>
      <label>倍速：
        <select id="speed-select">
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="3">3x</option>
        </select>
      </label>
      <label>本地 LIB：
        <input id="local-lib-input" type="file" accept=".lib,.LIB,.dat,.DAT" />
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
  const localLibInput = root.querySelector<HTMLInputElement>('#local-lib-input');
  if (!canvas || !exitStatus || !gameSelect || !speedSelect || !localLibInput) {
    throw new Error('Missing runtime UI');
  }
  const screenCanvas = canvas;
  const statusOverlay = exitStatus;
  const gameControl = gameSelect;
  renderGameOptions(gameControl);

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

  let startRequestId = 0;

  async function start(gameId: GameId): Promise<void> {
    const requestId = ++startRequestId;
    setExited(false);
    const loaded = await loadRemoteGameLib(gameLibManifests[gameId]);
    if (requestId !== startRequestId) return;
    startLoadedGameLib(loaded);
  }

  async function startLocal(file: File): Promise<void> {
    const requestId = ++startRequestId;
    setExited(false);
    const loaded = await loadLocalGameLib(file);
    if (requestId !== startRequestId) return;
    startLoadedGameLib(loaded);
  }

  function startLoadedGameLib(loaded: LoadedGameLib): void {
    webSaveStore.setSaveContext({
      scopeId: loaded.manifest.scopeId,
      sha256: loaded.manifest.sha256,
    });
    runtime?.start({
      datLib: loaded.datLib,
      profile: createRuntimeProfile(loaded.manifest),
    });
  }

  function createRuntimeProfile(manifest: GameLibManifest): GameProfile {
    return {
      id: manifest.scopeId,
      title: manifest.name,
      compat: manifest.compat ?? undefined,
    };
  }

  function renderGameOptions(select: HTMLSelectElement): void {
    select.replaceChildren(
      ...gameLibManifests.map((manifest, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = manifest.name;
        return option;
      })
    );
  }

  function getSelectedGameId(): GameId {
    const gameId = Number(gameControl.value);
    if (!Number.isInteger(gameId) || gameId < 0 || gameId >= gameLibManifests.length) {
      throw new Error(`游戏选择非法: ${gameControl.value}`);
    }
    return gameId;
  }

  await start(getSelectedGameId());

  gameSelect.addEventListener('change', async () => {
    await start(getSelectedGameId());
  });

  localLibInput.addEventListener('change', async () => {
    const file = localLibInput.files?.[0];
    if (!file) return;
    await startLocal(file);
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
