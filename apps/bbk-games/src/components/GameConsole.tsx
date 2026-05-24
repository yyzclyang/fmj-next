import { useEffect, useRef, useState } from 'react';
import { KeyCode } from '@fmj-next/core';

interface GameConsoleProps {
  readonly onPressKey: (key: KeyCode) => void;
}

const REPEAT_DELAY = 320;
const REPEAT_INTERVAL = 100;
const DIRECTION_KEYS = [KeyCode.Up, KeyCode.Down, KeyCode.Left, KeyCode.Right];

const funcMenuItems = [
  { key: KeyCode.Search, icon: '⌕', label: '搜索' },
  { key: KeyCode.Insert, icon: '▣', label: '插入' },
  { key: KeyCode.Modify, icon: '✎', label: '修改' },
  { key: KeyCode.Delete, icon: '⌫', label: '删除' },
];

export function GameConsole({ onPressKey }: GameConsoleProps) {
  const [functionPanelOpen, setFunctionPanelOpen] = useState(false);
  const pressed = useRef<Record<number, boolean>>({});
  const lastFire = useRef<Record<number, number>>({});

  const setKey = (key: KeyCode, down: boolean) => {
    if (down) {
      pressed.current[key] = true;
      onPressKey(key);
      lastFire.current[key] = performance.now() + REPEAT_DELAY;
      navigator?.vibrate?.(32);
    } else {
      pressed.current[key] = false;
    }
  };

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      for (const key of DIRECTION_KEYS) {
        if (pressed.current[key] && now - lastFire.current[key] >= REPEAT_INTERVAL) {
          onPressKey(key);
          lastFire.current[key] = now;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onPressKey]);

  const handleKeyPress = (key: KeyCode, pattern = 64) => {
    onPressKey(key);
    setFunctionPanelOpen(false);
    navigator?.vibrate?.(pattern);
  };
  const handleFunctionPanelOpen = () => {
    setFunctionPanelOpen(visible => !visible);
    navigator?.vibrate?.(64);
  };

  return (
    <div
      className="relative z-2 mt-auto hidden min-h-[300px] w-full flex-col justify-end gap-[8px] pb-[48px] select-none max-[720px]:flex"
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
                  className="console-btn press-effect flex min-h-[62px] w-[calc(50%-3px)] flex-col items-center justify-center gap-1 rounded-[9px] text-[16px]"
                  type="button"
                  role="menuitem"
                  onClick={() => handleKeyPress(key)}
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
            className={`console-btn press-effect h-[42px] w-[94px] rounded-[14px] text-lg ${functionPanelOpen ? 'border-[#b88c3c] text-[#f0d188] shadow-[inset_0_0_0_2px_#050504,0_0_0_2px_rgba(182,136,54,0.3),0_4px_0_#050504]' : ''}`}
            aria-expanded={functionPanelOpen}
            onClick={handleFunctionPanelOpen}
          >
            功能
          </button>
        </div>
        <div className="flex min-w-0 flex-none gap-[4px]">
          <button
            className="console-btn press-effect h-[34px] w-[56px] rounded-full text-[15px]"
            type="button"
            onClick={() => handleKeyPress(KeyCode.PageUp)}
          >
            上翻
          </button>
          <button
            className="console-btn press-effect h-[34px] w-[56px] rounded-full text-[15px]"
            type="button"
            onClick={() => handleKeyPress(KeyCode.PageDown)}
          >
            下翻
          </button>
        </div>
      </div>

      <div className="mt-[36px] flex items-start justify-between">
        <div
          className="flex size-[144px] flex-[0_0_144px] flex-col items-center justify-center drop-shadow-[0_6px_4px_rgba(0,0,0,0.62)]"
          aria-label="方向键"
        >
          <div className="flex min-h-[36px] items-center justify-center">
            <button
              type="button"
              className="console-dpad-btn press-effect rounded-[10px_10px_5px_5px]"
              aria-label="上"
              onPointerDown={() => setKey(KeyCode.Up, true)}
              onPointerUp={() => setKey(KeyCode.Up, false)}
              onPointerLeave={() => setKey(KeyCode.Up, false)}
              onPointerCancel={() => setKey(KeyCode.Up, false)}
            >
              ▲
            </button>
          </div>
          <div className="flex min-h-[44px] items-center justify-center">
            <button
              type="button"
              className="console-dpad-btn press-effect rounded-[10px_5px_5px_10px]"
              aria-label="左"
              onPointerDown={() => setKey(KeyCode.Left, true)}
              onPointerUp={() => setKey(KeyCode.Left, false)}
              onPointerLeave={() => setKey(KeyCode.Left, false)}
              onPointerCancel={() => setKey(KeyCode.Left, false)}
            >
              ◀
            </button>
            <span
              className="size-[48px] flex-[0_0_48px] rounded-full bg-[radial-gradient(circle_at_42%_36%,#23251f,#050504_70%)] shadow-[inset_0_8px_16px_rgba(255,255,255,0.035)]"
              aria-hidden="true"
            />
            <button
              type="button"
              className="console-dpad-btn press-effect rounded-[5px_10px_10px_5px]"
              aria-label="右"
              onPointerDown={() => setKey(KeyCode.Right, true)}
              onPointerUp={() => setKey(KeyCode.Right, false)}
              onPointerLeave={() => setKey(KeyCode.Right, false)}
              onPointerCancel={() => setKey(KeyCode.Right, false)}
            >
              ▶
            </button>
          </div>
          <div className="flex min-h-[36px] items-center justify-center">
            <button
              type="button"
              className="console-dpad-btn press-effect rounded-[5px_5px_10px_10px]"
              aria-label="下"
              onPointerDown={() => setKey(KeyCode.Down, true)}
              onPointerUp={() => setKey(KeyCode.Down, false)}
              onPointerLeave={() => setKey(KeyCode.Down, false)}
              onPointerCancel={() => setKey(KeyCode.Down, false)}
            >
              ▼
            </button>
          </div>
        </div>

        <div className="-mr-4 ml-auto flex min-w-[94px] items-end justify-center pb-[5px]">
          <button
            type="button"
            className="console-btn press-effect mt-[10px] flex size-[54px] flex-[0_0_54px] touch-manipulation rounded-full text-[15px]"
            onClick={() => handleKeyPress(KeyCode.Repeat)}
          >
            重复
          </button>
        </div>

        <div className="flex w-[120px] flex-col items-end gap-[5px] pb-px">
          <button
            type="button"
            className="console-confirm-btn press-effect flex size-[72px] touch-manipulation items-center justify-center self-end rounded-full p-0 text-[21px] leading-none font-bold text-[#f4dba1]"
            onClick={() => handleKeyPress(KeyCode.Enter, 96)}
          >
            确认
          </button>
          <button
            type="button"
            className="console-btn press-effect flex size-[54px] touch-manipulation self-start rounded-full text-base"
            onClick={() => handleKeyPress(KeyCode.Cancel, 96)}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
