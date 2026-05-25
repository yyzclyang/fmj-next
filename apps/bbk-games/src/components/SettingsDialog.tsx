import type { ChangeEvent } from 'react';
import CloseIcon from '@/assets/icons/close.svg?react';

interface SettingsDialogProps {
  readonly speed: number;
  readonly encounterRate: number;
  readonly battleRewardMultiplier: number;
  readonly onClose: () => void;
  readonly onSpeedChange: (speed: number) => void;
  readonly onEncounterRateChange: (encounterRate: number) => void;
  readonly onBattleRewardMultiplierChange: (multiplier: number) => void;
  readonly onOpenKeyBindings?: () => void;
}

export function SettingsDialog({
  speed,
  encounterRate,
  battleRewardMultiplier,
  onClose,
  onSpeedChange,
  onEncounterRateChange,
  onBattleRewardMultiplierChange,
  onOpenKeyBindings,
}: SettingsDialogProps) {
  const speedText = speed.toFixed(1);

  const handleSpeedChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSpeedChange(Number(event.currentTarget.value));
  };
  const handleEncounterRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    onEncounterRateChange(Number(event.currentTarget.value));
  };
  const handleBattleRewardMultiplierChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBattleRewardMultiplierChange(Number(event.currentTarget.value));
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#020604]/72 p-6 max-[720px]:p-3.5"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="flex max-h-[calc(100dvh-3rem)] w-[min(100%,420px)] flex-col overflow-hidden rounded-xl border-2 border-[#b4893f] bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_22%),radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#1a1b18_0%,#10110f_48%,#1b1b17_100%)] text-[#ead6a4] shadow-[0_18px_50px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,232,163,0.13)] max-[720px]:max-h-[calc(100dvh-1.75rem)] max-[720px]:w-[min(100%,356px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex min-h-16 items-center justify-between border-b border-[rgba(183,148,83,0.2)] px-4">
          <h2 className="m-0 text-center text-[22px] leading-none font-extrabold text-[#d7b866]" id="settings-title">
            设置
          </h2>
          <button
            className="flex size-8 items-center justify-center border-0 bg-transparent p-0 text-[#ead6a4]"
            type="button"
            aria-label="关闭设置"
            onClick={onClose}
          >
            <CloseIcon className="size-8" aria-hidden="true" focusable="false" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-[17px] font-extrabold text-[#d7b866]">
              <span>速度</span>
              <strong className="min-w-16 rounded-[7px] border border-[#b4893f] bg-black/35 px-2 py-1 text-center text-base text-[#f1dfb5]">
                {speedText}x
              </strong>
            </div>
            <input
              className="my-2 w-full accent-[#c79b42]"
              name="speed"
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={speedText}
              onChange={handleSpeedChange}
            />
            <div className="flex justify-between text-sm text-[#f0e2bd]">
              <span>0.5x</span>
              <span>3x</span>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-[17px] font-extrabold text-[#d7b866]">
              <span>遇敌</span>
              <strong className="min-w-16 rounded-[7px] border border-[#b4893f] bg-black/35 px-2 py-1 text-center text-base text-[#f1dfb5]">
                {encounterRate}%
              </strong>
            </div>
            <input
              className="my-2 w-full accent-[#c79b42]"
              name="encounterRate"
              type="range"
              min="1"
              max="99"
              step="1"
              value={encounterRate}
              onChange={handleEncounterRateChange}
            />
            <div className="flex justify-between text-sm text-[#f0e2bd]">
              <span>1%</span>
              <span>99%</span>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-[17px] font-extrabold text-[#d7b866]">
              <span>战斗收益倍率</span>
              <strong className="min-w-16 rounded-[7px] border border-[#b4893f] bg-black/35 px-2 py-1 text-center text-base text-[#f1dfb5]">
                {battleRewardMultiplier}x
              </strong>
            </div>
            <input
              className="my-2 w-full accent-[#c79b42]"
              name="battleRewardMultiplier"
              type="range"
              min="1"
              max="10"
              step="1"
              value={battleRewardMultiplier}
              onChange={handleBattleRewardMultiplierChange}
            />
            <div className="flex justify-between text-sm text-[#f0e2bd]">
              <span>1x</span>
              <span>10x</span>
            </div>
          </div>
        </div>
        {onOpenKeyBindings ? (
          <div className="flex justify-center px-3 py-2 max-[720px]:hidden">
            <button
              className="rounded-lg border border-[#81632e] bg-transparent px-4 py-1.5 text-sm text-[#d7bc75] hover:border-[#b88c3c] hover:text-[#f0d188]"
              type="button"
              onClick={onOpenKeyBindings}
            >
              按键配置
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
