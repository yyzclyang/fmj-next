import { useState } from 'react';
import { KeyCode } from '@fmj-next/core';

interface GameConsoleProps {
  readonly onPressKey: (key: KeyCode) => void;
}

const btnClass =
  'flex items-center justify-center border-2 border-[#81632e] bg-[linear-gradient(180deg,#20221d,#080908)] p-0 leading-none font-bold text-[#d7bc75] shadow-[inset_0_0_0_2px_#050504,inset_0_1px_12px_rgba(255,229,158,0.08),0_4px_0_#050504]';
const dpadBtnClass =
  'flex size-[44px] items-center justify-center border-2 border-[#80622e] bg-[linear-gradient(180deg,#252721,#080908)] p-0 text-[17px] leading-none text-[#9d8655] shadow-[inset_0_0_0_2px_#050504,inset_0_10px_18px_rgba(255,255,255,0.035)]';

const funcMenuItems = [
  { key: KeyCode.Search, icon: '⌕', label: '搜索' },
  { key: KeyCode.Insert, icon: '▣', label: '插入' },
  { key: KeyCode.Modify, icon: '✎', label: '修改' },
  { key: KeyCode.Delete, icon: '⌫', label: '删除' },
];

export function GameConsole({ onPressKey }: GameConsoleProps) {
  const [functionPanelOpen, setFunctionPanelOpen] = useState(false);

  return (
    <div
      className="relative z-2 mt-auto hidden min-h-[300px] w-full flex-col justify-end gap-[8px] pb-[70px] max-[720px]:flex"
      aria-label="移动端按键"
    >
      <div className="flex items-center justify-end gap-[10px]">
        <div className="relative flex flex-[0_1_94px] justify-center">
          {functionPanelOpen ? (
            <div
              className="absolute bottom-[55px] left-1/2 flex w-[160px] -translate-x-1/2 flex-wrap gap-[5px] rounded-[13px] border-2 border-[#9c7635] bg-[linear-gradient(180deg,rgba(29,31,27,0.98),rgba(11,12,11,0.98))] p-[8px] shadow-[0_12px_34px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,226,148,0.12)]"
              role="menu"
              aria-label="功能菜单"
            >
              {funcMenuItems.map(({ key, icon, label }) => (
                <button
                  key={key}
                  className={`flex min-h-[62px] w-[calc(50%-3px)] flex-col items-center justify-center gap-1 rounded-[9px] text-[16px] ${btnClass}`}
                  type="button"
                  role="menuitem"
                  onClick={() => onPressKey(key)}
                >
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
              <span
                className="pointer-events-none absolute bottom-[-11px] left-1/2 size-[18px] -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-[#9c7635] bg-[#0b0c0b]"
                aria-hidden="true"
              />
            </div>
          ) : null}
          <button
            type="button"
            className={`h-[42px] w-[94px] rounded-[14px] text-lg ${btnClass} ${functionPanelOpen ? 'border-[#b88c3c] text-[#f0d188] shadow-[inset_0_0_0_2px_#050504,0_0_0_2px_rgba(182,136,54,0.3),0_4px_0_#050504]' : ''}`}
            aria-expanded={functionPanelOpen}
            onClick={() => setFunctionPanelOpen(open => !open)}
          >
            功能
          </button>
        </div>
        <div className="flex min-w-0 flex-none gap-[4px]">
          <button
            className={`h-[34px] w-[56px] rounded-full text-[15px] ${btnClass}`}
            type="button"
            onClick={() => onPressKey(KeyCode.PageUp)}
          >
            上翻
          </button>
          <button
            className={`h-[34px] w-[56px] rounded-full text-[15px] ${btnClass}`}
            type="button"
            onClick={() => onPressKey(KeyCode.PageDown)}
          >
            下翻
          </button>
        </div>
      </div>

      <div className="mt-[36px] flex items-start justify-between gap-[8px]">
        <div
          className="flex size-[116px] flex-[0_0_116px] flex-col items-center justify-center drop-shadow-[0_6px_4px_rgba(0,0,0,0.62)]"
          aria-label="方向键"
        >
          <div className="flex min-h-[36px] items-center justify-center">
            <button
              type="button"
              className={`rounded-[10px_10px_5px_5px] ${dpadBtnClass}`}
              aria-label="上"
              onClick={() => onPressKey(KeyCode.Up)}
            >
              ▲
            </button>
          </div>
          <div className="flex min-h-[44px] items-center justify-center">
            <button
              type="button"
              className={`rounded-[10px_5px_5px_10px] ${dpadBtnClass}`}
              aria-label="左"
              onClick={() => onPressKey(KeyCode.Left)}
            >
              ◀
            </button>
            <span
              className="mx-[-2px] size-[42px] flex-[0_0_42px] rounded-full bg-[radial-gradient(circle_at_42%_36%,#23251f,#050504_70%)] shadow-[inset_0_8px_16px_rgba(255,255,255,0.035)]"
              aria-hidden="true"
            />
            <button
              type="button"
              className={`rounded-[5px_10px_10px_5px] ${dpadBtnClass}`}
              aria-label="右"
              onClick={() => onPressKey(KeyCode.Right)}
            >
              ▶
            </button>
          </div>
          <div className="flex min-h-[36px] items-center justify-center">
            <button
              type="button"
              className={`rounded-[5px_5px_10px_10px] ${dpadBtnClass}`}
              aria-label="下"
              onClick={() => onPressKey(KeyCode.Down)}
            >
              ▼
            </button>
          </div>
        </div>

        <div className="ml-auto flex min-w-[94px] flex-1 items-end justify-center pb-[5px]">
          <button
            type="button"
            className={`mt-[10px] flex size-[54px] flex-[0_0_54px] touch-manipulation rounded-full text-[15px] ${btnClass}`}
            onClick={() => onPressKey(KeyCode.Repeat)}
          >
            重复
          </button>
        </div>

        <div className="flex w-[120px] flex-col items-end gap-[5px] pb-px">
          <button
            type="button"
            className="flex size-[72px] touch-manipulation items-center justify-center self-end rounded-full border-2 border-[#6f2c22] bg-[radial-gradient(circle_at_35%_28%,#b95035,#6f1d16_72%)] p-0 text-[21px] leading-none font-bold text-[#f4dba1] shadow-[inset_0_0_0_3px_#42100d,inset_0_13px_18px_rgba(255,214,164,0.12),0_5px_0_#050504,0_0_0_2px_rgba(131,96,45,0.75)]"
            onClick={() => onPressKey(KeyCode.Enter)}
          >
            确认
          </button>
          <button
            type="button"
            className={`flex size-[54px] touch-manipulation self-start rounded-full text-base ${btnClass}`}
            onClick={() => onPressKey(KeyCode.Cancel)}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
