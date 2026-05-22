import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createBrowserRuntime, type BrowserRuntime } from '@fmj-next/browser';
import { KeyCode } from '@fmj-next/core';
import { getBbkGames, type BbkGame, type BbkGameLib } from '@/apis/game';
import { DesktopGameHeader } from '@/components/DesktopGameHeader';
import { GameConsole } from '@/components/GameConsole';
import { GameScreen } from '@/components/GameScreen';
import { MobileGameHeader } from '@/components/MobileGameHeader';
import { SettingsDialog } from '@/components/SettingsDialog';
import { SwitchConfirmDialog } from '@/components/SwitchConfirmDialog';
import { SwitchGameDialog } from '@/components/SwitchGameDialog';
import { loadLocalGame, loadRemoteGameLib, type LoadedGameLib, type LoadedLocalGame } from '@/utils/lib';
import { audio } from '@/utils/audio';
import { WebSaveStore } from '@/utils/save';
import { parseEngineOptions } from '@/utils/utils';

type OpenDialog = 'settings' | 'switchConfirm' | 'switch' | null;

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BrowserRuntime | null>(null);
  const saveStore = useRef<WebSaveStore | null>(null);
  const [games, setGames] = useState<readonly BbkGame[]>([]);
  const [localGame, setLocalGame] = useState<LoadedLocalGame | null>(null);
  const totalGames: readonly BbkGame[] = localGame ? [localGame.game, ...games] : games;
  const [selectedLibId, setSelectedLibId] = useState<number | null>(null);
  const gameTitle = totalGames.find(game => game.libs.some(lib => lib.id === selectedLibId))?.name ?? '载入游戏列表';
  const [speed, setSpeed] = useState(1);
  const [encounterRate, setEncounterRate] = useState(5);
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const startLoadedGameLib = (loaded: LoadedGameLib) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    saveStore.current = new WebSaveStore({
      scopeId: loaded.manifest.scopeId,
      sha256: loaded.manifest.sha256,
    });
    runtime.start({
      lib: loaded.lib,
      engineOptions: parseEngineOptions(loaded.manifest.engineOptions) ?? {},
    });
    runtime.setSpeed(speed);
    runtime.debug.combat.setEncounterRate(encounterRate / 100);
  };

  const startRemoteGame = (lib: BbkGameLib) => {
    setSelectedLibId(lib.id);
    loadRemoteGameLib(lib).then(loaded => {
      startLoadedGameLib(loaded);
    });
  };

  const startLocalGame = (file: File) => {
    loadLocalGame(file).then(loaded => {
      setLocalGame(loaded);
      setSelectedLibId(loaded.loadedGameLib.manifest.id);
      startLoadedGameLib(loaded.loadedGameLib);
    });
  };

  const handleLocalLibChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setOpenDialog(null);
    startLocalGame(file);
  };

  const handleKeyPress = (key: KeyCode) => {
    runtimeRef.current?.keyDown(key);
  };

  const handleOpenSwitch = () => {
    setOpenDialog(selectedLibId !== null ? 'switchConfirm' : 'switch');
  };

  const handleSelectGame = (lib: BbkGameLib) => {
    setOpenDialog(null);
    if (selectedLibId === lib.id) return;

    if (lib.id === -1) {
      if (!localGame) return;
      setSelectedLibId(lib.id);
      startLoadedGameLib(localGame.loadedGameLib);
      return;
    }
    startRemoteGame(lib);
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    runtimeRef.current?.setSpeed(value);
  };

  const handleEncounterRateChange = (value: number) => {
    setEncounterRate(value);
    if (selectedLibId !== null) {
      runtimeRef.current?.debug.combat.setEncounterRate(value / 100);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const runtime = createBrowserRuntime({
      canvas,
      saveStore: {
        read: slot => saveStore.current?.read(slot) ?? null,
        write: (slot, value) => saveStore.current?.write(slot, value),
      },
      audio,
      requestExit: () => runtimeRef.current?.dispose(),
      speed: 1,
    });
    runtimeRef.current = runtime;
    getBbkGames().then(r => setGames(r.list));

    return () => {
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      const key = mapKeyboard(event.code);
      if (key === null) return;
      runtimeRef.current?.keyDown(key);
      event.preventDefault();
    };
    window.addEventListener('keydown', keyDownHandler);
    return () => window.removeEventListener('keydown', keyDownHandler);
  }, []);

  return (
    <main className="mx-auto grid min-h-svh w-full grid-rows-[auto_1fr] gap-5 py-5 max-[720px]:min-h-svh max-[720px]:w-full max-[720px]:grid-rows-[1fr] max-[720px]:gap-0 max-[720px]:bg-[#050504] max-[720px]:p-0">
      <DesktopGameHeader
        title={gameTitle}
        onOpenSettings={() => setOpenDialog('settings')}
        onOpenSwitch={handleOpenSwitch}
      />

      <section
        className="relative grid min-h-0 place-items-center overflow-hidden rounded-[18px] border border-[rgba(142,109,50,0.5)] bg-[linear-gradient(135deg,rgba(255,238,174,0.06),transparent_26%),linear-gradient(180deg,#1a1b18_0%,#0d0e0c_100%)] px-8 py-10 shadow-[0_22px_64px_rgba(23,36,29,0.22),inset_0_0_0_1px_rgba(255,226,139,0.12)] before:pointer-events-none before:absolute before:inset-3 before:rounded-[14px] before:border before:border-[rgba(224,184,91,0.22)] before:content-[''] max-[720px]:flex max-[720px]:min-h-svh max-[720px]:w-full max-[720px]:flex-col max-[720px]:rounded-[23px] max-[720px]:border-2 max-[720px]:border-[#9b7a35] max-[720px]:bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_22%),radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#1a1b18_0%,#10110f_48%,#1b1b17_100%)] max-[720px]:p-[13px_13px_17px] max-[720px]:text-[#d4b56a] max-[720px]:shadow-[inset_0_0_0_1px_rgba(255,226,139,0.22),inset_0_0_36px_rgba(0,0,0,0.7),0_20px_56px_rgba(0,0,0,0.52)] max-[720px]:before:inset-[5px] max-[720px]:before:rounded-[19px] max-[720px]:before:border-[rgba(224,184,91,0.42)] max-[720px]:before:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.72)] max-[720px]:after:pointer-events-none max-[720px]:after:absolute max-[720px]:after:inset-0 max-[720px]:after:bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.035)_1px,transparent_1px)] max-[720px]:after:bg-[length:3px_3px] max-[720px]:after:opacity-25 max-[720px]:after:mix-blend-screen max-[720px]:after:content-['']"
        aria-label="游戏画面"
      >
        <MobileGameHeader
          title={gameTitle}
          onOpenSettings={() => setOpenDialog('settings')}
          onOpenSwitch={handleOpenSwitch}
        />
        <GameScreen canvasRef={canvasRef} title={gameTitle} />
        <GameConsole onPressKey={handleKeyPress} />
      </section>

      {openDialog === 'settings' ? (
        <SettingsDialog
          speed={speed}
          encounterRate={encounterRate}
          onClose={() => setOpenDialog(null)}
          onSpeedChange={handleSpeedChange}
          onEncounterRateChange={handleEncounterRateChange}
        />
      ) : null}

      {openDialog === 'switchConfirm' ? (
        <SwitchConfirmDialog onCancel={() => setOpenDialog(null)} onConfirm={() => setOpenDialog('switch')} />
      ) : null}

      {openDialog === 'switch' ? (
        <SwitchGameDialog
          games={totalGames}
          selectedLibId={selectedLibId}
          onClose={() => setOpenDialog(null)}
          onSelectGame={handleSelectGame}
          onLocalLibChange={handleLocalLibChange}
        />
      ) : null}
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

export default App;
