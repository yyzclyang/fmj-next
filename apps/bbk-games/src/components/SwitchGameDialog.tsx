import { type ChangeEvent, useState } from 'react';
import dayjs from 'dayjs';
import type { BbkGame, BbkGameLib } from '@/apis/game';
import { saveLocalBbkGameLibApi } from '@/apis/game';
import type { GameSource } from '@/utils/database';
import { loadGameLib, parseLocalGameFile, type LoadedGameLib } from '@/utils/lib';
import ArrowIcon from '@/assets/icons/arrow.svg?react';
import CloseIcon from '@/assets/icons/close.svg?react';
import DeleteIcon from '@/assets/icons/delete.svg?react';
import LoadingIcon from '@/assets/icons/loading.svg?react';

interface SwitchGameDialogProps {
  readonly games: readonly BbkGame[];
  readonly selectedLib: LoadedGameLib | null;
  readonly onClose: () => void;
  readonly onGameSelect: (loaded: LoadedGameLib) => void;
  readonly onDeleteLib: (libId: number) => void;
}

export function SwitchGameDialog({ games, selectedLib, onClose, onGameSelect, onDeleteLib }: SwitchGameDialogProps) {
  const selectedGameId = findGameIdByLibId(games, selectedLib);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(selectedGameId);
  const [loadingLibId, setLoadingLibId] = useState<number | null>(null);

  const toggleGameGroup = (gameId: number) => {
    setExpandedGameId(id => (id === gameId ? null : gameId));
  };

  const handleLibSelect = (lib: BbkGameLib, source: GameSource) => {
    if (selectedLib?.source === source && selectedLib.manifest.id === lib.id) return;
    if (loadingLibId !== null) return;
    setLoadingLibId(lib.id);
    loadGameLib(lib, source)
      .then(loaded => {
        onClose();
        onGameSelect(loaded);
      })
      .finally(() => setLoadingLibId(null));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || loadingLibId !== null) return;
    setLoadingLibId(Infinity);
    parseLocalGameFile(file)
      .then(([lib, buffer]) => {
        const localLibs = games.find(g => g.id === -1)?.libs ?? [];
        const existingLib = localLibs.find(l => l.sha256 === lib.sha256);
        if (existingLib) {
          loadGameLib(existingLib, 'local').then(loaded => onGameSelect(loaded));
          onClose();
          return;
        }
        return saveLocalBbkGameLibApi(lib, buffer).then(savedLib => {
          onGameSelect({ source: 'local', manifest: savedLib, buffer });
          onClose();
        });
      })
      .finally(() => setLoadingLibId(null));
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#020604]/72 p-6 max-[720px]:p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="flex max-h-192 w-[min(100%,520px)] flex-col overflow-hidden rounded-xl border-2 border-[#b4893f] bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_22%),radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#1a1b18_0%,#10110f_48%,#1b1b17_100%)] text-[#ead6a4] shadow-[0_18px_50px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,232,163,0.13)] max-[720px]:max-h-184 max-[720px]:w-[min(100%,356px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex min-h-16 items-center justify-between border-b border-[rgba(183,148,83,0.2)] px-4">
          <h2 className="m-0 text-center text-[22px] leading-none font-extrabold text-[#d7b866]" id="switch-title">
            切换游戏
          </h2>
          <button
            className="flex size-8 items-center justify-center border-0 bg-transparent p-0 text-[#ead6a4]"
            type="button"
            aria-label="关闭切换游戏"
            onClick={onClose}
          >
            <CloseIcon className="size-8" aria-hidden="true" focusable="false" />
          </button>
        </header>

        <div className="min-h-0 overflow-auto p-[12px_14px_10px]">
          {games.length === 0 ? (
            <p className="text-[13px] leading-[1.28] text-[rgba(239,226,189,0.76)] not-italic">游戏列表为空</p>
          ) : null}

          {games.map(game => {
            const expanded = expandedGameId === game.id;
            const libSource = game.id === -1 ? 'local' : 'remote';
            return (
              <section className="mt-2 first:mt-0" key={game.id} aria-label={game.name}>
                <button
                  type="button"
                  className="flex h-12 w-full items-center gap-2 rounded-lg border border-[rgba(177,142,78,0.34)] bg-[linear-gradient(180deg,rgba(42,43,39,0.82),rgba(17,18,16,0.88))] px-3 text-left text-[17px] font-extrabold text-[#ead6a4]"
                  aria-expanded={expanded}
                  onClick={() => toggleGameGroup(game.id)}
                >
                  <ArrowIcon
                    className={`size-5 shrink-0 text-[#d7bc75] transition-transform ${expanded ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                    focusable="false"
                  />
                  {game.name}
                </button>
                {expanded ? (
                  <div className="p-[7px_0_2px_17px]">
                    {game.libs.map(lib => {
                      const meta = formatGameLibMeta(lib);
                      const selected = selectedLib?.source === libSource && selectedLib.manifest.id === lib.id;
                      const isLoading = loadingLibId === lib.id;
                      const deletable = libSource === 'local' && !selected && !isLoading;
                      return (
                        <button
                          type="button"
                          key={lib.id}
                          className={`relative mt-2 flex min-h-16 w-full items-center gap-2.5 rounded-lg border border-[rgba(177,142,78,0.34)] bg-[linear-gradient(180deg,rgba(42,43,39,0.82),rgba(17,18,16,0.88))] p-[10px_42px_10px_12px] text-left text-[#ead6a4] first:mt-0 ${selected ? 'border-[#d39d3c] bg-[linear-gradient(180deg,rgba(67,54,28,0.75),rgba(23,20,15,0.94))] shadow-[inset_0_0_0_1px_rgba(255,217,139,0.2),0_0_0_1px_rgba(211,157,60,0.25)]' : ''} ${deletable || isLoading ? 'p-[10px_64px_10px_12px]' : ''}`}
                          onClick={() => handleLibSelect(lib, libSource)}
                        >
                          <span className="grid min-w-0 gap-1">
                            <strong className="overflow-hidden text-[17px] leading-[1.12] text-ellipsis whitespace-nowrap text-[#f2dfad]">
                              {lib.name}
                            </strong>
                            {meta ? (
                              <small className="text-[13px] leading-[1.28] text-[rgba(239,226,189,0.76)] not-italic">
                                {meta}
                              </small>
                            ) : null}
                            {lib.description ? (
                              <em className="line-clamp-2 text-[13px] leading-[1.28] text-[rgba(239,226,189,0.76)] not-italic">
                                {lib.description}
                              </em>
                            ) : null}
                          </span>
                          {selected && !isLoading ? (
                            <span
                              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[25px] leading-none font-black text-[#d9a645]"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          ) : null}
                          {isLoading ? (
                            <LoadingIcon
                              className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-[#d7bc75]"
                              aria-hidden="true"
                            />
                          ) : null}
                          {deletable ? (
                            <span
                              className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[rgba(239,226,189,0.5)] hover:bg-[rgba(239,226,189,0.08)] hover:text-[#e07050] active:text-[#c05040]"
                              role="button"
                              aria-label={`删除 ${lib.name}`}
                              onClick={e => {
                                e.stopPropagation();
                                onDeleteLib(lib.id);
                              }}
                            >
                              <DeleteIcon className="size-4.5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <label className="relative m-4 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#c57962] bg-[linear-gradient(180deg,#922f22,#691c16)] text-center text-lg font-extrabold text-[#ffe6bb] shadow-[inset_0_0_0_1px_rgba(255,216,159,0.16)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#d39d3c]">
          <input
            className="pointer-events-none absolute size-px opacity-0"
            name="mobile-local-game"
            type="file"
            accept=".lib,.LIB,.gam,.GAM"
            onChange={handleFileChange}
          />
          <span className="text-2xl leading-none" aria-hidden="true">
            ⇧
          </span>
          加载本地文件
        </label>
      </section>
    </div>
  );
}

function findGameIdByLibId(games: readonly BbkGame[], selectedLib: LoadedGameLib | null): number | null {
  if (!selectedLib) return null;
  if (selectedLib.source === 'local') return -1;
  for (const game of games) {
    if (game.libs.some(lib => lib.id === selectedLib.manifest.id)) return game.id;
  }
  return null;
}

function formatGameLibMeta(lib: BbkGameLib): string {
  return [lib.author, lib.version, formatDate(lib.publishedAt)].filter(Boolean).join(' · ');
}

function formatDate(value: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD') : '';
}
