import { useCallback, useEffect, useRef, useState, type ChangeEvent, type Ref } from 'react';
import { createBrowserRuntime, type BrowserRuntime } from '@fmj-next/browser';
import { KeyCode, type DebugApi, type GameEngineOptions } from '@fmj-next/core';
import { getBbkGames, type BbkGame, type BbkGameLib } from '@/apis/game';
import { GameConsole } from '@/components/GameConsole';
import { SettingsDialog } from '@/components/SettingsDialog';
import { SwitchConfirmDialog } from '@/components/SwitchConfirmDialog';
import { SwitchGameDialog, type SelectedGameLib } from '@/components/SwitchGameDialog';
import { loadLocalGameLib, loadRemoteGameLib, type LoadedGameLib } from '@/utils/lib';
import { audio } from '@/utils/audio';
import { webSaveStore } from '@/utils/save';
import ExchangeIcon from '@/assets/icons/exchange.svg?react';
import SettingIcon from '@/assets/icons/setting.svg?react';

declare global {
  interface Window {
    fmjDebug?: DebugApi;
  }
}

const localGameId = -1;

type RuntimeStatus = 'loading' | 'ready' | 'exited' | 'error';

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BrowserRuntime | null>(null);
  const localGameRef = useRef<LoadedGameLib | null>(null);
  const requestIdRef = useRef(0);
  const [games, setGames] = useState<readonly BbkGame[]>([]);
  const [localGame, setLocalGame] = useState<LoadedGameLib | null>(null);
  const [selectedGame, setSelectedGame] = useState<SelectedGameLib | null>(null);
  const [speed, setSpeed] = useState(1);
  const [encounterRate, setEncounterRate] = useState(50);
  const [status, setStatus] = useState<RuntimeStatus>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  const switchGames = localGame ? [createLocalGame(localGame.manifest), ...games] : games;
  const overlayText = getOverlayText(status, errorText);
  const gameTitle = selectedGame?.gameName ?? '载入游戏列表';

  const startLoadedGameLib = useCallback((loaded: LoadedGameLib) => {
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
    setErrorText(null);
    setStatus('ready');
  }, []);

  const startRemoteGame = useCallback(
    async (selected: SelectedGameLib) => {
      const requestId = ++requestIdRef.current;
      setStatus('loading');
      setErrorText(null);
      setSelectedGame(selected);
      try {
        const loaded = await loadRemoteGameLib(selected.lib);
        if (requestId !== requestIdRef.current) return;
        startLoadedGameLib(loaded);
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
    try {
      const page = await getBbkGames();
      if (requestId !== requestIdRef.current) return;
      const selected = getFirstGameLib(page.list);
      setGames(page.list);
      void startRemoteGame(selected);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setGames([]);
      setSelectedGame(null);
      setStatus('error');
      setErrorText(getErrorMessage(error));
    }
  }, [startRemoteGame]);

  const startLocalGame = useCallback(
    async (file: File) => {
      const requestId = ++requestIdRef.current;
      setStatus('loading');
      setErrorText(null);
      try {
        const loaded = await loadLocalGameLib(file);
        if (requestId !== requestIdRef.current) return;
        localGameRef.current = loaded;
        setLocalGame(loaded);
        setSelectedGame(createLocalGameLib(loaded.manifest));
        startLoadedGameLib(loaded);
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
    if (status !== 'ready') return;
    runtimeRef.current?.debug.combat.setEncounterRate(encounterRate / 100);
  }, [encounterRate, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = mapKeyboard(event.code);
      if (key === null) return;
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

  const handleSpeedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSpeed(normalizeSpeed(Number(event.currentTarget.value)));
  }, []);

  const handleEncounterRateChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEncounterRate(Number(event.currentTarget.value));
  }, []);

  const handleLocalLibChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      setSwitchOpen(false);
      setSwitchConfirmOpen(false);
      void startLocalGame(file);
    },
    [startLocalGame]
  );

  const pressKey = useCallback((key: KeyCode) => {
    runtimeRef.current?.keyDown(key);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSwitchOpen(false);
    setSwitchConfirmOpen(false);
    setSettingsOpen(true);
  }, []);

  const handleOpenSwitch = useCallback(() => {
    setSettingsOpen(false);
    setSwitchOpen(false);
    if (status === 'ready') {
      setSwitchConfirmOpen(true);
      return;
    }
    setSwitchConfirmOpen(false);
    setSwitchOpen(true);
  }, [status]);

  const handleConfirmSwitch = useCallback(() => {
    setSwitchConfirmOpen(false);
    setSwitchOpen(true);
  }, []);

  const handleSelectGame = useCallback(
    (selected: SelectedGameLib) => {
      if (selectedGame?.id === selected.id) {
        setSwitchOpen(false);
        return;
      }
      setSwitchOpen(false);

      if (isLocalGameSelection(selected)) {
        const loaded = localGameRef.current;
        if (!loaded) return;
        setSelectedGame(selected);
        startLoadedGameLib(loaded);
        return;
      }

      void startRemoteGame(selected);
    },
    [selectedGame?.id, startLoadedGameLib, startRemoteGame]
  );

  return (
    <main className="mx-auto grid min-h-svh w-[min(1440px,calc(100vw_-_32px))] grid-rows-[auto_1fr] gap-5 py-5 max-[720px]:min-h-svh max-[720px]:w-full max-[720px]:grid-rows-[1fr] max-[720px]:gap-0 max-[720px]:bg-[#050504] max-[720px]:p-0">
      <DesktopGameHeader title={gameTitle} onOpenSettings={handleOpenSettings} onOpenSwitch={handleOpenSwitch} />

      <section
        className="relative grid min-h-0 place-items-center overflow-hidden rounded-[18px] border border-[rgba(142,109,50,0.5)] bg-[linear-gradient(135deg,rgba(255,238,174,0.06),transparent_26%),linear-gradient(180deg,#1a1b18_0%,#0d0e0c_100%)] px-8 py-10 shadow-[0_22px_64px_rgba(23,36,29,0.22),inset_0_0_0_1px_rgba(255,226,139,0.12)] before:pointer-events-none before:absolute before:inset-3 before:rounded-[14px] before:border before:border-[rgba(224,184,91,0.22)] before:content-[''] max-[720px]:flex max-[720px]:min-h-svh max-[720px]:w-full max-[720px]:flex-col max-[720px]:rounded-[23px] max-[720px]:border-2 max-[720px]:border-[#9b7a35] max-[720px]:bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_22%),radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#1a1b18_0%,#10110f_48%,#1b1b17_100%)] max-[720px]:p-[13px_13px_17px] max-[720px]:text-[#d4b56a] max-[720px]:shadow-[inset_0_0_0_1px_rgba(255,226,139,0.22),inset_0_0_36px_rgba(0,0,0,0.7),0_20px_56px_rgba(0,0,0,0.52)] max-[720px]:[--confirm-size:clamp(68px,19vw,76px)] max-[720px]:[--dpad-center-size:clamp(38px,11vw,44px)] max-[720px]:[--dpad-key-size:clamp(40px,11.5vw,46px)] max-[720px]:[--dpad-row-size:clamp(34px,9.5vw,38px)] max-[720px]:[--dpad-size:calc(var(--dpad-row-size)_+_var(--dpad-key-size)_+_var(--dpad-row-size))] max-[720px]:[--function-height:clamp(40px,11vw,44px)] max-[720px]:[--function-width:clamp(88px,25vw,98px)] max-[720px]:[--page-key-width:clamp(52px,15vw,60px)] max-[720px]:[--small-round-size:clamp(50px,14vw,57px)] max-[720px]:before:inset-[5px] max-[720px]:before:rounded-[19px] max-[720px]:before:border-[rgba(224,184,91,0.42)] max-[720px]:before:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.72)] max-[720px]:after:pointer-events-none max-[720px]:after:absolute max-[720px]:after:inset-0 max-[720px]:after:bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.035)_1px,transparent_1px)] max-[720px]:after:bg-[length:3px_3px] max-[720px]:after:opacity-25 max-[720px]:after:mix-blend-screen max-[720px]:after:content-['']"
        aria-label="游戏画面"
      >
        <MobileGameHeader title={gameTitle} onOpenSettings={handleOpenSettings} onOpenSwitch={handleOpenSwitch} />
        <GameScreen canvasRef={canvasRef} title={gameTitle} overlayText={overlayText} status={status} />
        <GameConsole onPressKey={pressKey} />
      </section>

      {settingsOpen ? (
        <SettingsDialog
          speedText={formatSpeed(speed)}
          encounterRate={encounterRate}
          onClose={() => setSettingsOpen(false)}
          onSpeedChange={handleSpeedChange}
          onEncounterRateChange={handleEncounterRateChange}
        />
      ) : null}

      {switchConfirmOpen ? (
        <SwitchConfirmDialog onCancel={() => setSwitchConfirmOpen(false)} onConfirm={handleConfirmSwitch} />
      ) : null}

      {switchOpen ? (
        <SwitchGameDialog
          games={switchGames}
          selectedGame={selectedGame}
          onClose={() => setSwitchOpen(false)}
          onSelectGame={handleSelectGame}
          onLocalLibChange={handleLocalLibChange}
        />
      ) : null}
    </main>
  );
}

interface DesktopGameHeaderProps {
  readonly title: string;
  readonly onOpenSettings: () => void;
  readonly onOpenSwitch: () => void;
}

function DesktopGameHeader({ title, onOpenSettings, onOpenSwitch }: DesktopGameHeaderProps) {
  return (
    <header className="flex min-h-[78px] items-center justify-between gap-6 rounded-[18px] border border-[rgba(142,109,50,0.5)] bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_24%),linear-gradient(180deg,#20211d,#0d0e0c)] px-5 text-[#ead6a4] shadow-[0_12px_34px_rgba(23,36,29,0.18),inset_0_0_0_1px_rgba(255,226,139,0.12)] max-[720px]:hidden">
      <div className="min-w-0">
        <h1 className="m-0 overflow-hidden text-[28px] leading-tight font-extrabold text-ellipsis whitespace-nowrap text-[#f1dfb5]">
          {title}
        </h1>
      </div>
      <div className="flex items-center justify-end gap-2.5" aria-label="桌面游戏控制">
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border-2 border-[#8e6d32] bg-[linear-gradient(180deg,#252721,#080908)] px-4 text-sm font-extrabold text-[#ead6a4] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504] transition-colors hover:border-[#b88c3c] hover:text-[#f4dba1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d39d3c]"
          onClick={onOpenSwitch}
        >
          <ExchangeIcon className="size-5 text-[#d7bc75]" aria-hidden="true" focusable="false" />
          切换游戏
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border-2 border-[#8e6d32] bg-[linear-gradient(180deg,#252721,#080908)] px-4 text-sm font-extrabold text-[#ead6a4] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504] transition-colors hover:border-[#b88c3c] hover:text-[#f4dba1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d39d3c]"
          onClick={onOpenSettings}
        >
          <SettingIcon className="size-5 text-[#d7bc75]" aria-hidden="true" focusable="false" />
          设置
        </button>
      </div>
    </header>
  );
}

interface MobileGameHeaderProps {
  readonly title: string;
  readonly onOpenSettings: () => void;
  readonly onOpenSwitch: () => void;
}

function MobileGameHeader({ title, onOpenSettings, onOpenSwitch }: MobileGameHeaderProps) {
  return (
    <div className="relative z-[1] hidden min-h-[58px] w-full items-center justify-between gap-2 px-0.5 pb-2.5 max-[720px]:flex">
      <button
        type="button"
        className="grid size-[42px] touch-manipulation place-items-center rounded-[9px] border-2 border-[#8e6d32] bg-[linear-gradient(180deg,#22231f,#090a09)] p-0 leading-none font-extrabold text-[#d2b56c] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_10px_rgba(255,226,140,0.1),0_3px_0_#050504,0_0_0_1px_rgba(0,0,0,0.72)]"
        aria-label="切换游戏"
        onClick={onOpenSwitch}
      >
        <ExchangeIcon className="size-[32px]" aria-hidden="true" focusable="false" />
      </button>
      <h1 className="m-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[clamp(22px,7vw,28px)] leading-none font-extrabold text-[#cfa95b] [text-shadow:0_1px_0_#050504,0_0_10px_rgba(206,169,91,0.26)]">
        {title}
      </h1>
      <button
        type="button"
        className="grid size-[42px] touch-manipulation place-items-center rounded-full border-2 border-[#8e6d32] bg-[linear-gradient(180deg,#22231f,#090a09)] p-0 leading-none font-extrabold text-[#d2b56c] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_10px_rgba(255,226,140,0.1),0_3px_0_#050504,0_0_0_1px_rgba(0,0,0,0.72)]"
        aria-label="设置"
        onClick={onOpenSettings}
      >
        <SettingIcon className="size-[32px]" aria-hidden="true" focusable="false" />
      </button>
    </div>
  );
}

interface GameScreenProps {
  readonly canvasRef: Ref<HTMLCanvasElement>;
  readonly title: string;
  readonly overlayText: string | null;
  readonly status: RuntimeStatus;
}

function GameScreen({ canvasRef, title, overlayText, status }: GameScreenProps) {
  return (
    <div
      className="relative grid box-content h-48 w-80 border border-[var(--ink)] bg-[#020604] shadow-[0_18px_50px_rgba(18,24,20,0.18),0_0_0_8px_var(--rail)] min-[900px]:h-[384px] min-[900px]:w-[640px] min-[1220px]:h-[576px] min-[1220px]:w-[960px] min-[1540px]:h-[768px] min-[1540px]:w-[1280px] max-[720px]:z-[1] max-[720px]:box-border max-[720px]:aspect-[5/3] max-[720px]:h-auto max-[720px]:w-full max-[720px]:rounded-xl max-[720px]:border-[9px] max-[720px]:border-[#080908] max-[720px]:shadow-[0_0_0_2px_rgba(133,105,49,0.78),0_0_0_6px_#1d1f1b,inset_0_0_18px_rgba(0,0,0,0.82)]"
      data-status={status}
    >
      <canvas
        ref={canvasRef}
        className={`block h-48 w-80 [image-rendering:pixelated] min-[900px]:h-[384px] min-[900px]:w-[640px] min-[1220px]:h-[576px] min-[1220px]:w-[960px] min-[1540px]:h-[768px] min-[1540px]:w-[1280px] max-[720px]:h-full max-[720px]:w-full max-[720px]:rounded ${status === 'exited' || status === 'error' ? 'opacity-[0.44]' : ''}`}
        aria-label={title}
      />
      {overlayText ? (
        <div className="absolute inset-0 grid place-items-center [overflow-wrap:anywhere] bg-[rgba(1,7,4,0.76)] p-6 text-center text-base leading-[1.4] font-semibold text-[#f8f2e4] max-[720px]:bg-black/70 max-[720px]:p-[18px] max-[720px]:text-[15px] max-[720px]:text-[#f1dfb5]">
          {overlayText}
        </div>
      ) : null}
    </div>
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
    if (lib) return { id: createGameLibSelectId(game.id, lib.id), gameId: game.id, gameName: game.name, lib };
  }
  throw new Error('游戏列表为空');
}

function createLocalGame(lib: BbkGameLib): BbkGame {
  return {
    id: localGameId,
    name: lib.name || '本地游戏',
    description: '',
    coverUrl: '',
    libs: [lib],
  };
}

function createLocalGameLib(lib: BbkGameLib): SelectedGameLib {
  return {
    id: createGameLibSelectId(localGameId, lib.id),
    gameId: localGameId,
    gameName: lib.name || '本地游戏',
    lib,
  };
}

function isLocalGameSelection(selected: SelectedGameLib): boolean {
  return selected.gameId === localGameId;
}

function createGameLibSelectId(gameId: number, libId: number): string {
  return `${gameId}:${libId}`;
}

function normalizeSpeed(value: number): number {
  return Number(value.toFixed(1));
}

function formatSpeed(value: number): string {
  return value.toFixed(1);
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
