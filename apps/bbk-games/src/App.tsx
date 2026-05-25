import { useEffect, useRef, useState } from 'react';
import { createBrowserRuntime, type BrowserRuntime } from '@fmj-next/browser';
import { KeyCode } from '@fmj-next/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { getBbkGamesApi, type BbkGame } from '@/apis/game';
import { db } from '@/utils/database';
import { DesktopGameHeader } from '@/components/DesktopGameHeader';
import { GameConsole } from '@/components/GameConsole';
import { GameScreen } from '@/components/GameScreen';
import { MobileGameHeader } from '@/components/MobileGameHeader';
import { SettingsDialog } from '@/components/SettingsDialog';
import { SwitchConfirmDialog } from '@/components/SwitchConfirmDialog';
import { SwitchGameDialog } from '@/components/SwitchGameDialog';
import { type LoadedGameLib, loadGameLib } from '@/utils/lib';
import { audio } from '@/utils/audio';
import { loadLastGameMeta, saveLastGameMeta, WebSaveStore } from '@/utils/web-save-store';
import { parseEngineOptions } from '@/utils/utils';
import { loadKeyBindings, lookupKeyCode, saveKeyBindings } from '@/utils/key-bindings';
import { KeyBindingsDialog } from '@/components/KeyBindingsDialog';

type OpenDialog = 'settings' | 'switchConfirm' | 'switch' | 'keybindings' | null;

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BrowserRuntime | null>(null);
  const keyBindingsRef = useRef(loadKeyBindings());
  const saveStore = useRef<WebSaveStore | null>(null);
  const [remoteGames, setRemoteGames] = useState<readonly BbkGame[]>([]);
  const localGames =
    useLiveQuery(async () => {
      const libs = await db.lib.toArray();
      return [{ id: -1, name: '本地游戏', description: '', coverUrl: '', libs }];
    }) ?? [];
  const totalGames = [...localGames, ...remoteGames].filter(g => g.libs.length);
  const [loadedGameLib, setLoadedGameLib] = useState<LoadedGameLib | null>(null);
  const gameTitle = loadedGameLib?.manifest.name ?? '';
  const [speed, setSpeed] = useState(1);
  const [encounterRate, setEncounterRate] = useState(4);
  const [battleRewardMultiplier, setBattleRewardMultiplier] = useState(1);
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const loadRemoteGames = async () => {
    return getBbkGamesApi().then(({ list }) => {
      setRemoteGames(list);
      return list;
    });
  };

  const startLoadedGameLib = async (loaded: LoadedGameLib) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    saveStore.current = new WebSaveStore({
      source: loaded.source,
      scopeId: loaded.manifest.scopeId,
      libId: loaded.manifest.id,
    });
    await saveStore.current.preload();
    runtime.start({
      lib: new Uint8Array(loaded.buffer),
      engineOptions: parseEngineOptions(loaded.manifest.engineOptions) ?? {},
    });
    handleSpeedChange(1);
    handleEncounterRateChange(0.4);
    handleBattleRewardMultiplierChange(1);
  };

  const handleGameSelect = async (loaded: LoadedGameLib) => {
    setLoadedGameLib(loaded);
    saveLastGameMeta({
      source: loaded.source,
      libId: loaded.manifest.id,
    });
    await startLoadedGameLib(loaded);
  };

  const handleKeyPress = (key: KeyCode) => {
    runtimeRef.current?.keyDown(key);
  };

  const handleOpenSwitch = () => {
    setOpenDialog(loadedGameLib !== null ? 'switchConfirm' : 'switch');
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    runtimeRef.current?.setSpeed(value);
  };

  const handleEncounterRateChange = (value: number) => {
    setEncounterRate(value);
    if (loadedGameLib !== null) runtimeRef.current?.cheat.combat.setEncounterRate(value / 100);
  };

  const handleBattleRewardMultiplierChange = (value: number) => {
    setBattleRewardMultiplier(value);
    if (loadedGameLib !== null) {
      runtimeRef.current?.cheat.combat.setExpMultiplier(value);
      runtimeRef.current?.cheat.combat.setMoneyMultiplier(value);
      runtimeRef.current?.cheat.combat.setGoodsMultiplier(value);
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

    const lastMeta = loadLastGameMeta();
    loadRemoteGames().then(async remoteGames => {
      if (!lastMeta) return;
      const lib =
        lastMeta.source === 'local'
          ? await db.lib.get(lastMeta.libId)
          : remoteGames.flatMap(g => g.libs).find(l => l.id === lastMeta.libId);
      if (!lib) return;
      const loaded = await loadGameLib(lib, lastMeta.source);
      setLoadedGameLib(loaded);
      await startLoadedGameLib(loaded);
    });

    return () => {
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      const key = lookupKeyCode(keyBindingsRef.current, event.code);
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
          battleRewardMultiplier={battleRewardMultiplier}
          onClose={() => setOpenDialog(null)}
          onSpeedChange={handleSpeedChange}
          onEncounterRateChange={handleEncounterRateChange}
          onBattleRewardMultiplierChange={handleBattleRewardMultiplierChange}
          onOpenKeyBindings={() => setOpenDialog('keybindings')}
        />
      ) : null}

      {openDialog === 'switchConfirm' ? (
        <SwitchConfirmDialog onCancel={() => setOpenDialog(null)} onConfirm={() => setOpenDialog('switch')} />
      ) : null}

      {openDialog === 'switch' ? (
        <SwitchGameDialog
          games={totalGames}
          selectedLib={loadedGameLib}
          onClose={() => setOpenDialog(null)}
          onGameSelect={handleGameSelect}
        />
      ) : null}

      {openDialog === 'keybindings' ? (
        <KeyBindingsDialog
          bindings={keyBindingsRef.current}
          onClose={() => setOpenDialog(null)}
          onChange={bindings => {
            keyBindingsRef.current = bindings;
            saveKeyBindings(bindings);
          }}
        />
      ) : null}
    </main>
  );
}

export default App;
