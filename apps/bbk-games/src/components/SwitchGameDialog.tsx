import { useEffect, useState, type ChangeEvent } from 'react';
import type { BbkGame, BbkGameLib } from '@/apis/game';
import CloseIcon from '@/assets/icons/close.svg?react';

export interface SelectedGameLib {
  readonly id: string;
  readonly gameId: number;
  readonly gameName: string;
  readonly lib: BbkGameLib;
}

interface SwitchGameDialogProps {
  readonly games: readonly BbkGame[];
  readonly selectedGame: SelectedGameLib | null;
  readonly onClose: () => void;
  readonly onSelectGame: (selected: SelectedGameLib) => void;
  readonly onLocalLibChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function SwitchGameDialog({
  games,
  selectedGame,
  onClose,
  onSelectGame,
  onLocalLibChange,
}: SwitchGameDialogProps) {
  const selectedGameId = selectedGame?.gameId ?? null;
  const [expandedGameIds, setExpandedGameIds] = useState<readonly number[]>(() =>
    selectedGameId === null ? [] : [selectedGameId]
  );

  useEffect(() => {
    if (selectedGameId === null) return;
    setExpandedGameIds([selectedGameId]);
  }, [selectedGameId]);

  const toggleGameGroup = (gameId: number) => {
    setExpandedGameIds(ids => (ids.includes(gameId) ? ids.filter(id => id !== gameId) : [...ids, gameId]));
  };

  return (
    <div
      className="fixed inset-0 z-20 hidden items-center justify-center bg-[#020604]/72 p-3.5 max-[720px]:flex"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(738px,calc(100svh_-_28px))] w-[min(100%,356px)] flex-col overflow-hidden rounded-xl border-2 border-[#b4893f] bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_22%),radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#1a1b18_0%,#10110f_48%,#1b1b17_100%)] text-[#ead6a4] shadow-[0_18px_50px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,232,163,0.13)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex min-h-[55px] items-center justify-between border-b border-[rgba(183,148,83,0.2)] pr-[13px] pl-[18px]">
          <h2 className="m-0 text-center text-[22px] leading-none font-extrabold text-[#d7b866]" id="switch-title">
            切换游戏
          </h2>
          <button
            className="flex size-[38px] items-center justify-center border-0 bg-transparent p-0 text-[#ead6a4]"
            type="button"
            aria-label="关闭切换游戏"
            onClick={onClose}
          >
            <CloseIcon className="size-[30px]" aria-hidden="true" focusable="false" />
          </button>
        </header>

        <div className="min-h-0 overflow-auto p-[12px_14px_10px]">
          {games.length === 0 ? (
            <p className="text-[13px] leading-[1.28] text-[rgba(239,226,189,0.76)] not-italic">游戏列表为空</p>
          ) : null}

          {games.map(game => {
            const expanded = expandedGameIds.includes(game.id);
            return (
              <section className="mt-2 first:mt-0" key={game.id} aria-label={game.name}>
                <button
                  type="button"
                  className="flex h-[43px] w-full items-center gap-2 rounded-lg border border-[rgba(177,142,78,0.34)] bg-[linear-gradient(180deg,rgba(42,43,39,0.82),rgba(17,18,16,0.88))] px-3 text-left text-[17px] font-extrabold text-[#ead6a4]"
                  aria-expanded={expanded}
                  onClick={() => toggleGameGroup(game.id)}
                >
                  <span className="w-4 text-2xl leading-none text-[#ead6a4]" aria-hidden="true">
                    {expanded ? '⌄' : '›'}
                  </span>
                  {game.name}
                </button>
                {expanded ? (
                  <div className="p-[7px_0_2px_17px]">
                    {game.libs.map(lib => {
                      const id = createGameLibSelectId(game.id, lib.id);
                      const meta = formatGameLibMeta(lib);
                      const selected = selectedGame?.id === id;
                      return (
                        <button
                          type="button"
                          key={lib.id}
                          className={`relative mt-[7px] flex min-h-[62px] w-full items-center gap-2.5 rounded-lg border border-[rgba(177,142,78,0.34)] bg-[linear-gradient(180deg,rgba(42,43,39,0.82),rgba(17,18,16,0.88))] p-[10px_42px_10px_12px] text-left text-[#ead6a4] first:mt-0 ${selected ? 'border-[#d39d3c] bg-[linear-gradient(180deg,rgba(67,54,28,0.75),rgba(23,20,15,0.94))] shadow-[inset_0_0_0_1px_rgba(255,217,139,0.2),0_0_0_1px_rgba(211,157,60,0.25)]' : ''}`}
                          onClick={() => onSelectGame({ id, gameId: game.id, gameName: game.name, lib })}
                        >
                          <span className="grid min-w-0 gap-1">
                            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[17px] leading-[1.12] text-[#f2dfad]">
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
                          {selected ? (
                            <span
                              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[25px] leading-none font-black text-[#d9a645]"
                              aria-hidden="true"
                            >
                              ✓
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

        <label className="relative mx-3.5 mb-3.5 flex min-h-[50px] cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-[#c57962] bg-[linear-gradient(180deg,#922f22,#691c16)] text-center text-lg font-extrabold text-[#ffe6bb] shadow-[inset_0_0_0_1px_rgba(255,216,159,0.16)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#d39d3c]">
          <input
            className="pointer-events-none absolute size-px opacity-0"
            name="mobile-local-game"
            type="file"
            accept=".lib,.LIB,.gam,.GAM"
            onChange={onLocalLibChange}
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

function createGameLibSelectId(gameId: number, libId: number): string {
  return `${gameId}:${libId}`;
}

function formatGameLibMeta(lib: BbkGameLib): string {
  const version = lib.version ? (lib.version.startsWith('v') ? lib.version : `v${lib.version}`) : '';
  return [lib.author, version, formatDate(lib.publishedAt)].filter(Boolean).join(' · ');
}

function formatDate(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}
