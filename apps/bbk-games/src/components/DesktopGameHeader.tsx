import ExchangeIcon from '@/assets/icons/exchange.svg?react';
import SettingIcon from '@/assets/icons/setting.svg?react';

interface DesktopGameHeaderProps {
  readonly title: string;
  readonly onOpenSettings: () => void;
  readonly onOpenSwitch: () => void;
}

export function DesktopGameHeader({ title, onOpenSettings, onOpenSwitch }: DesktopGameHeaderProps) {
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
