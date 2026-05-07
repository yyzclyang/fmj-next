import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createBrowserRuntime, type BrowserRuntime } from '@fmj-next/browser';
import { KeyCode, type DebugApi, type GameProfile } from '@fmj-next/core';
import { gameLibManifests, type GameId, type GameLibManifest } from './game-profiles';
import { loadLocalGameLib, loadRemoteGameLib, type LoadedGameLib } from './load-datlib';
import { webAudioPort } from './web-audio-port';
import { webSaveStore } from './web-save-store';
import './App.css';

declare global {
  interface Window {
    fmjDebug?: DebugApi;
  }
}

const runtimeSpeeds = [1, 2, 3] as const;

type RuntimeStatus = 'loading' | 'ready' | 'exited' | 'error';

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BrowserRuntime | null>(null);
  const requestIdRef = useRef(0);
  const [selectedGameId, setSelectedGameId] = useState<GameId>(0);
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<RuntimeStatus>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState(gameLibManifests[0]?.name ?? '未选择');
  const [activeSource, setActiveSource] = useState('内置资源');

  const overlayText = getOverlayText(status, errorText);

  const startLoadedGameLib = useCallback((loaded: LoadedGameLib, source: string) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    webSaveStore.setSaveContext({
      scopeId: loaded.manifest.scopeId,
      sha256: loaded.manifest.sha256,
    });
    runtime.start({
      datLib: loaded.datLib,
      profile: createRuntimeProfile(loaded.manifest),
    });
    setActiveTitle(loaded.manifest.name);
    setActiveSource(source);
    setErrorText(null);
    setStatus('ready');
  }, []);

  const startRemoteGame = useCallback(
    async (gameId: GameId) => {
      const requestId = ++requestIdRef.current;
      const manifest = getGameManifest(gameId);
      setStatus('loading');
      setErrorText(null);
      setActiveTitle(manifest.name);
      setActiveSource('内置资源');
      try {
        const loaded = await loadRemoteGameLib(manifest);
        if (requestId !== requestIdRef.current) return;
        startLoadedGameLib(loaded, '内置资源');
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setStatus('error');
        setErrorText(getErrorMessage(error));
      }
    },
    [startLoadedGameLib]
  );

  const startLocalGame = useCallback(
    async (file: File) => {
      const requestId = ++requestIdRef.current;
      setStatus('loading');
      setErrorText(null);
      setActiveTitle(file.name);
      setActiveSource('本地资源');
      try {
        const loaded = await loadLocalGameLib(file);
        if (requestId !== requestIdRef.current) return;
        startLoadedGameLib(loaded, '本地资源');
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setStatus('error');
        setErrorText(getErrorMessage(error));
      }
    },
    [startLoadedGameLib]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setStatus('error');
      setErrorText('缺少画布');
      return;
    }
    const runtime = createBrowserRuntime({
      canvas,
      saveStore: webSaveStore,
      audio: webAudioPort,
      requestExit: () => {
        runtimeRef.current?.dispose();
        setStatus('exited');
      },
      speed,
    });
    runtimeRef.current = runtime;
    window.fmjDebug = runtime.debug;
    void startRemoteGame(selectedGameId);
    return () => {
      requestIdRef.current++;
      runtime.dispose();
      if (window.fmjDebug === runtime.debug) delete window.fmjDebug;
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = mapKeyboard(event.code);
      if (key == null) return;
      runtimeRef.current?.keyDown(key);
      event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = mapKeyboard(event.code);
      if (key == null) return;
      runtimeRef.current?.keyUp(key);
      event.preventDefault();
    };
    const handleBeforeUnload = () => runtimeRef.current?.dispose();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleGameChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const gameId = Number(event.currentTarget.value);
      getGameManifest(gameId);
      setSelectedGameId(gameId);
      void startRemoteGame(gameId);
    },
    [startRemoteGame]
  );

  const handleSpeedChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSpeed(Number(event.currentTarget.value));
  }, []);

  const handleLocalLibChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      void startLocalGame(file);
    },
    [startLocalGame]
  );

  return (
    <main className="mx-auto grid min-h-svh w-[min(1120px,calc(100vw_-_32px))] grid-rows-[auto_1fr_auto] max-[720px]:w-[min(calc(100vw_-_20px),520px)]">
      <header className="flex min-h-[92px] items-center justify-between gap-6 border-b border-[var(--line)] max-[720px]:min-h-0 max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:py-[18px]">
        <div className="grid gap-1">
          <span className="font-mono text-xs leading-none text-[var(--muted)] uppercase">bbk-games</span>
          <h1 className="m-0 text-[28px] leading-none font-bold text-[var(--ink)]">伏魔记</h1>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2.5 max-[720px]:justify-stretch" aria-label="游戏控制">
          <label className="control-field">
            <span>游戏</span>
            <select value={selectedGameId} onChange={handleGameChange}>
              {gameLibManifests.map((manifest, index) => (
                <option key={manifest.scopeId} value={index}>
                  {manifest.name}
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            <span>倍速</span>
            <select value={speed} onChange={handleSpeedChange}>
              {runtimeSpeeds.map(value => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </label>
          <label className="file-button">
            <input type="file" accept=".lib,.LIB,.dat,.DAT" onChange={handleLocalLibChange} />
            <span>本地 LIB</span>
          </label>
        </div>
      </header>

      <section className="grid min-h-0 place-items-center py-7" aria-label="游戏画面">
        <div className="screen-frame" data-status={status}>
          <canvas ref={canvasRef} className="game-screen" aria-label={activeTitle} />
          {overlayText ? <div className="screen-overlay">{overlayText}</div> : null}
        </div>
      </section>

      <footer className="flex min-h-12 items-center justify-between gap-3 border-t border-[var(--line)] font-mono text-xs text-[var(--muted)]">
        <span>{activeTitle}</span>
        <span>{activeSource}</span>
        <span>{speed}x</span>
      </footer>
    </main>
  );
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

function createRuntimeProfile(manifest: GameLibManifest): GameProfile {
  return {
    id: manifest.scopeId,
    title: manifest.name,
    compat: manifest.compat ?? undefined,
  };
}

function getGameManifest(gameId: GameId): GameLibManifest {
  const manifest = gameLibManifests[gameId];
  if (!manifest) throw new Error(`游戏选择非法: ${gameId}`);
  return manifest;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

function getOverlayText(status: RuntimeStatus, errorText: string | null): string | null {
  if (status === 'loading') return '载入中';
  if (status === 'exited') return '已退出';
  if (status === 'error') return errorText ?? '载入失败';
  return null;
}

export default App;
