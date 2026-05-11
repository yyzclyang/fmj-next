import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createBrowserRuntime, type BrowserRuntime } from '@fmj-next/browser';
import { KeyCode, type DebugApi, type GameEngineOptions } from '@fmj-next/core';
import { getBbkGames, type BbkGame, type BbkGameLib } from '@/apis/game';
import { loadLocalGameLib, loadRemoteGameLib, type LoadedGameLib } from '@/utils/lib';
import { audio } from '@/utils/audio';
import { webSaveStore } from '@/utils/save';
import './App.css';

declare global {
  interface Window {
    fmjDebug?: DebugApi;
  }
}

const runtimeSpeeds = [1, 2, 3] as const;

type RuntimeStatus = 'loading' | 'ready' | 'exited' | 'error';

interface SelectedGameLib {
  readonly id: string;
  readonly lib: BbkGameLib;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BrowserRuntime | null>(null);
  const requestIdRef = useRef(0);
  const [games, setGames] = useState<readonly BbkGame[]>([]);
  const [selectedGameLibId, setSelectedGameLibId] = useState('');
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<RuntimeStatus>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('载入游戏列表');
  const [activeSource, setActiveSource] = useState('接口资源');

  const overlayText = getOverlayText(status, errorText);

  const startLoadedGameLib = useCallback((loaded: LoadedGameLib, source: string) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    webSaveStore.setSaveContext({
      scopeId: loaded.manifest.scopeId,
      sha256: loaded.manifest.sha256,
    });
    runtime.start({
      lib: loaded.lib,
      engineOptions: parseEngineOptions(loaded.manifest.engineOptions) ?? {},
    });
    setActiveTitle(loaded.manifest.name);
    setActiveSource(source);
    setErrorText(null);
    setStatus('ready');
  }, []);

  const startRemoteGame = useCallback(
    async (gameLib: BbkGameLib) => {
      const requestId = ++requestIdRef.current;
      setStatus('loading');
      setErrorText(null);
      setActiveTitle(gameLib.name);
      setActiveSource('远程资源');
      try {
        const loaded = await loadRemoteGameLib(gameLib);
        if (requestId !== requestIdRef.current) return;
        startLoadedGameLib(loaded, '远程资源');
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setStatus('error');
        setErrorText(getErrorMessage(error));
      }
    },
    [startLoadedGameLib]
  );

  const loadRemoteGameList = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    setErrorText(null);
    setActiveTitle('载入游戏列表');
    setActiveSource('接口资源');
    try {
      const page = await getBbkGames();
      if (requestId !== requestIdRef.current) return;
      const selected = getFirstGameLib(page.list);
      setGames(page.list);
      setSelectedGameLibId(selected.id);
      void startRemoteGame(selected.lib);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setGames([]);
      setSelectedGameLibId('');
      setStatus('error');
      setErrorText(getErrorMessage(error));
    }
  }, [startRemoteGame]);

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
      audio: audio,
      requestExit: () => {
        runtimeRef.current?.dispose();
        setStatus('exited');
      },
      speed,
    });
    runtimeRef.current = runtime;
    window.fmjDebug = runtime.debug;
    void loadRemoteGameList();
    return () => {
      requestIdRef.current++;
      runtime.dispose();
      if (window.fmjDebug === runtime.debug) delete window.fmjDebug;
      runtimeRef.current = null;
    };
  }, [loadRemoteGameList]);

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
    const handleBeforeUnload = () => runtimeRef.current?.dispose();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleGameChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const id = event.currentTarget.value;
      const lib = getGameLib(games, id);
      setSelectedGameLibId(id);
      void startRemoteGame(lib);
    },
    [games, startRemoteGame]
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
            <select value={selectedGameLibId} onChange={handleGameChange} disabled={games.length === 0}>
              {games.map(game => (
                <optgroup key={game.id} label={game.name}>
                  {game.libs.map(lib => (
                    <option key={lib.id} value={createGameLibSelectId(game.id, lib.id)}>
                      {lib.name}
                    </option>
                  ))}
                </optgroup>
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
            <input type="file" accept=".lib,.LIB,.gam,.GAM" onChange={handleLocalLibChange} />
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
    case 'Digit1':
    case 'Numpad1':
      return KeyCode.Search;
    case 'Digit2':
    case 'Numpad2':
      return KeyCode.Insert;
    case 'Digit3':
    case 'Numpad3':
      return KeyCode.Modify;
    case 'Digit4':
    case 'Numpad4':
      return KeyCode.Delete;
    default:
      return null;
  }
}

function parseEngineOptions(value: string): GameEngineOptions | null {
  if (!value) return null;
  return JSON.parse(value) as GameEngineOptions;
}

function getFirstGameLib(games: readonly BbkGame[]): SelectedGameLib {
  for (const game of games) {
    const lib = game.libs[0];
    if (lib) return { id: createGameLibSelectId(game.id, lib.id), lib };
  }
  throw new Error('游戏列表为空');
}

function getGameLib(games: readonly BbkGame[], id: string): BbkGameLib {
  for (const game of games) {
    const lib = game.libs.find(item => createGameLibSelectId(game.id, item.id) === id);
    if (lib) return lib;
  }
  throw new Error(`游戏选择非法: ${id}`);
}

function createGameLibSelectId(gameId: number, libId: number): string {
  return `${gameId}:${libId}`;
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
