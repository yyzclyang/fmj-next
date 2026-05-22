import ExchangeIcon from '@/assets/icons/exchange.svg?react';
import SettingIcon from '@/assets/icons/setting.svg?react';

interface MobileGameHeaderProps {
  readonly title: string;
  readonly onOpenSettings: () => void;
  readonly onOpenSwitch: () => void;
}

export function MobileGameHeader({ title, onOpenSettings, onOpenSwitch }: MobileGameHeaderProps) {
  return (
    <div className="relative z-1 hidden min-h-16 w-full items-center justify-between gap-2 px-0.5 pb-2.5 max-[720px]:flex">
      <button
        type="button"
        className="grid size-12 touch-manipulation place-items-center rounded-[9px] border-2 border-[#8e6d32] bg-[linear-gradient(180deg,#22231f,#090a09)] p-0 leading-none font-extrabold text-[#d2b56c] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_10px_rgba(255,226,140,0.1),0_3px_0_#050504,0_0_0_1px_rgba(0,0,0,0.72)]"
        aria-label="切换游戏"
        onClick={onOpenSwitch}
      >
        <ExchangeIcon className="size-8" aria-hidden="true" focusable="false" />
      </button>
      <h1 className="m-0 min-w-0 flex-1 overflow-hidden text-center text-[clamp(22px,7vw,28px)] leading-none font-extrabold text-ellipsis whitespace-nowrap text-[#cfa95b] [text-shadow:0_1px_0_#050504,0_0_10px_rgba(206,169,91,0.26)]">
        {title}
      </h1>
      <button
        type="button"
        className="grid size-12 touch-manipulation place-items-center rounded-full border-2 border-[#8e6d32] bg-[linear-gradient(180deg,#22231f,#090a09)] p-0 leading-none font-extrabold text-[#d2b56c] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_10px_rgba(255,226,140,0.1),0_3px_0_#050504,0_0_0_1px_rgba(0,0,0,0.72)]"
        aria-label="设置"
        onClick={onOpenSettings}
      >
        <SettingIcon className="size-8" aria-hidden="true" focusable="false" />
      </button>
    </div>
  );
}
