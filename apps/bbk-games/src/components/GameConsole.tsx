import { useState } from 'react';
import { KeyCode } from '@fmj-next/core';

interface GameConsoleProps {
  readonly onPressKey: (key: KeyCode) => void;
}

export function GameConsole({ onPressKey }: GameConsoleProps) {
  const [functionPanelOpen, setFunctionPanelOpen] = useState(false);

  return (
    <div
      className="relative z-[2] mt-auto hidden h-[clamp(300px,calc(100svh_-_374px),440px)] min-h-[300px] w-full flex-col justify-end gap-[clamp(8px,2.4vw,10px)] pb-[clamp(56px,11svh,96px)] max-[720px]:flex"
      aria-label="移动端按键"
    >
      <div className="flex items-center justify-end gap-[clamp(8px,3vw,12px)]">
        <div className="relative flex flex-[0_1_var(--function-width)] justify-center">
          {functionPanelOpen ? (
            <div
              className="absolute bottom-[calc(var(--function-height)_+_13px)] left-1/2 flex w-[clamp(156px,44vw,174px)] -translate-x-1/2 flex-wrap gap-[clamp(4px,1.5vw,6px)] rounded-[13px] border-2 border-[#9c7635] bg-[linear-gradient(180deg,rgba(29,31,27,0.98),rgba(11,12,11,0.98))] p-[clamp(7px,2.3vw,9px)] shadow-[0_12px_34px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,226,148,0.12)]"
              role="menu"
              aria-label="功能菜单"
            >
              <button
                className="flex min-h-[clamp(58px,16vw,66px)] w-[calc(50%_-_clamp(2px,0.75vw,3px))] flex-col items-center justify-center gap-1 rounded-[9px] border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-[5px_2px] text-[clamp(15px,4.5vw,17px)] leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
                type="button"
                role="menuitem"
                onClick={() => onPressKey(KeyCode.Search)}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  ⌕
                </span>
                搜索
              </button>
              <button
                className="flex min-h-[clamp(58px,16vw,66px)] w-[calc(50%_-_clamp(2px,0.75vw,3px))] flex-col items-center justify-center gap-1 rounded-[9px] border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-[5px_2px] text-[clamp(15px,4.5vw,17px)] leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
                type="button"
                role="menuitem"
                onClick={() => onPressKey(KeyCode.Insert)}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  ▣
                </span>
                插入
              </button>
              <button
                className="flex min-h-[clamp(58px,16vw,66px)] w-[calc(50%_-_clamp(2px,0.75vw,3px))] flex-col items-center justify-center gap-1 rounded-[9px] border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-[5px_2px] text-[clamp(15px,4.5vw,17px)] leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
                type="button"
                role="menuitem"
                onClick={() => onPressKey(KeyCode.Modify)}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  ✎
                </span>
                修改
              </button>
              <button
                className="flex min-h-[clamp(58px,16vw,66px)] w-[calc(50%_-_clamp(2px,0.75vw,3px))] flex-col items-center justify-center gap-1 rounded-[9px] border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-[5px_2px] text-[clamp(15px,4.5vw,17px)] leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
                type="button"
                role="menuitem"
                onClick={() => onPressKey(KeyCode.Delete)}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  ⌫
                </span>
                删除
              </button>
              <span
                className="pointer-events-none absolute bottom-[-11px] left-1/2 size-[18px] -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-[#9c7635] bg-[#0b0c0b]"
                aria-hidden="true"
              />
            </div>
          ) : null}
          <button
            type="button"
            className={`h-[var(--function-height)] w-[var(--function-width)] rounded-[14px] border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-0 text-lg leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504] ${functionPanelOpen ? 'border-[#b88c3c] text-[#f0d188] shadow-[inset_0_0_0_2px_#050504,0_0_0_2px_rgba(182,136,54,0.3),0_4px_0_#050504]' : ''}`}
            aria-expanded={functionPanelOpen}
            onClick={() => setFunctionPanelOpen(open => !open)}
          >
            功能
          </button>
        </div>
        <div className="flex min-w-0 flex-none gap-[clamp(4px,1.2vw,5px)]">
          <button
            className="h-[clamp(32px,9vw,35px)] w-[var(--page-key-width)] rounded-full border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-0 text-[15px] leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
            type="button"
            onClick={() => onPressKey(KeyCode.PageUp)}
          >
            上翻
          </button>
          <button
            className="h-[clamp(32px,9vw,35px)] w-[var(--page-key-width)] rounded-full border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-0 text-[15px] leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
            type="button"
            onClick={() => onPressKey(KeyCode.PageDown)}
          >
            下翻
          </button>
        </div>
      </div>

      <div className="mt-[clamp(30px,8svh,48px)] flex items-start justify-between gap-[clamp(6px,2.4vw,10px)]">
        <div
          className="flex size-[var(--dpad-size)] flex-[0_0_var(--dpad-size)] flex-col items-center justify-center drop-shadow-[0_6px_4px_rgba(0,0,0,0.62)]"
          aria-label="方向键"
        >
          <div className="flex min-h-[var(--dpad-row-size)] items-center justify-center">
            <button
              type="button"
              className="flex size-[var(--dpad-key-size)] items-center justify-center rounded-[10px_10px_5px_5px] border-2 border-[#80622e] bg-[linear-gradient(180deg,#252721,#080908)] p-0 text-[clamp(16px,4.6vw,18px)] leading-none text-[#9d8655] shadow-[inset_0_0_0_2px_#050504,inset_0_10px_18px_rgba(255,255,255,0.035)]"
              aria-label="上"
              onClick={() => onPressKey(KeyCode.Up)}
            >
              ▲
            </button>
          </div>
          <div className="flex min-h-[var(--dpad-key-size)] items-center justify-center">
            <button
              type="button"
              className="flex size-[var(--dpad-key-size)] items-center justify-center rounded-[10px_5px_5px_10px] border-2 border-[#80622e] bg-[linear-gradient(180deg,#252721,#080908)] p-0 text-[clamp(16px,4.6vw,18px)] leading-none text-[#9d8655] shadow-[inset_0_0_0_2px_#050504,inset_0_10px_18px_rgba(255,255,255,0.035)]"
              aria-label="左"
              onClick={() => onPressKey(KeyCode.Left)}
            >
              ◀
            </button>
            <span
              className="mx-[-2px] size-[var(--dpad-center-size)] flex-[0_0_var(--dpad-center-size)] rounded-full bg-[radial-gradient(circle_at_42%_36%,#23251f,#050504_70%)] shadow-[inset_0_8px_16px_rgba(255,255,255,0.035)]"
              aria-hidden="true"
            />
            <button
              type="button"
              className="flex size-[var(--dpad-key-size)] items-center justify-center rounded-[5px_10px_10px_5px] border-2 border-[#80622e] bg-[linear-gradient(180deg,#252721,#080908)] p-0 text-[clamp(16px,4.6vw,18px)] leading-none text-[#9d8655] shadow-[inset_0_0_0_2px_#050504,inset_0_10px_18px_rgba(255,255,255,0.035)]"
              aria-label="右"
              onClick={() => onPressKey(KeyCode.Right)}
            >
              ▶
            </button>
          </div>
          <div className="flex min-h-[var(--dpad-row-size)] items-center justify-center">
            <button
              type="button"
              className="flex size-[var(--dpad-key-size)] items-center justify-center rounded-[5px_5px_10px_10px] border-2 border-[#80622e] bg-[linear-gradient(180deg,#252721,#080908)] p-0 text-[clamp(16px,4.6vw,18px)] leading-none text-[#9d8655] shadow-[inset_0_0_0_2px_#050504,inset_0_10px_18px_rgba(255,255,255,0.035)]"
              aria-label="下"
              onClick={() => onPressKey(KeyCode.Down)}
            >
              ▼
            </button>
          </div>
        </div>

        <div className="ml-auto flex min-w-[min(24vw,var(--function-width))] flex-1 items-end justify-center pb-[5px]">
          <button
            type="button"
            className="mt-[clamp(8px,3.5vw,14px)] flex size-[var(--small-round-size)] flex-[0_0_var(--small-round-size)] touch-manipulation items-center justify-center rounded-full border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-0 text-[15px] leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
            onClick={() => onPressKey(KeyCode.Repeat)}
          >
            重复
          </button>
        </div>

        <div className="flex flex-[0_1_clamp(112px,34vw,144px)] flex-col items-end gap-[clamp(4px,1.6vw,6px)] pb-px">
          <button
            type="button"
            className="flex size-[var(--confirm-size)] touch-manipulation items-center justify-center self-end rounded-full border-2 border-[#6f2c22] bg-[radial-gradient(circle_at_35%_28%,#b95035,#6f1d16_72%)] p-0 text-[21px] leading-none font-bold text-[#f4dba1] shadow-[inset_0_0_0_3px_#42100d,inset_0_13px_18px_rgba(255,214,164,0.12),0_5px_0_#050504,0_0_0_2px_rgba(131,96,45,0.75)]"
            onClick={() => onPressKey(KeyCode.Enter)}
          >
            确认
          </button>
          <button
            type="button"
            className="flex size-[var(--small-round-size)] touch-manipulation items-center justify-center self-start rounded-full border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-0 text-base leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]"
            onClick={() => onPressKey(KeyCode.Cancel)}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
