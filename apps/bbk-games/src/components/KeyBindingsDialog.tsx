import { useEffect, useRef, useState } from 'react';
import { type KeyCode as KeyCodeType } from '@fmj-next/core';
import { DefaultKeyBindings, formatKeyCode, KeyCodeLabels, type KeyBindings } from '@/utils/key-bindings';
import CloseIcon from '@/assets/icons/close.svg?react';

interface KeyBindingsDialogProps {
  readonly bindings: KeyBindings;
  readonly onClose: () => void;
  readonly onChange: (bindings: KeyBindings) => void;
}

type ListeningTarget = { action: KeyCodeType; index: number };

export function KeyBindingsDialog({ bindings, onClose, onChange }: KeyBindingsDialogProps) {
  const [local, setLocal] = useState<KeyBindings>(() => structuredClone(bindings));
  const [listening, setListening] = useState<ListeningTarget | null>(null);
  const listeningRef = useRef<ListeningTarget | null>(null);
  listeningRef.current = listening;
  const localRef = useRef(local);
  localRef.current = local;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      const target = listeningRef.current;
      if (!target) return;
      e.preventDefault();
      if (e.code === 'Escape') {
        setListening(null);
        return;
      }
      setLocal(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next).map(Number) as KeyCodeType[]) {
          next[k] = next[k].filter(c => c !== e.code);
        }
        const codes = [...next[target.action]];
        codes[target.index] = e.code;
        next[target.action] = codes;
        return next;
      });
      setListening(null);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleClose = () => {
    const cleaned = {} as KeyBindings;
    for (const [k, v] of Object.entries(localRef.current)) {
      cleaned[Number(k) as KeyCodeType] = v.filter(c => c !== '');
    }
    onChange(cleaned);
    onClose();
  };

  const handleRemove = (action: KeyCodeType, index: number) => {
    setLocal(prev => ({ ...prev, [action]: prev[action].filter((_, i) => i !== index) }));
  };

  const handleAdd = (action: KeyCodeType) => {
    const index = localRef.current[action].length;
    setLocal(prev => ({ ...prev, [action]: [...prev[action], ''] }));
    setListening({ action, index });
  };

  const actions = Object.keys(KeyCodeLabels).map(Number) as KeyCodeType[];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#020604]/72 p-6"
      role="presentation"
      onClick={handleClose}
    >
      <section
        className="w-[min(100%,420px)] rounded-xl border-2 border-[#b4893f] bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_22%),linear-gradient(180deg,#1a1b18,#10110f_48%,#1b1b17_100%)] pb-4 text-[#ead6a4] shadow-[0_18px_50px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,232,163,0.13)]"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex min-h-16 items-center justify-between border-b border-[rgba(183,148,83,0.2)] px-4">
          <h2 className="m-0 text-[22px] leading-none font-extrabold text-[#d7b866]">按键配置</h2>
          <button
            className="flex size-8 items-center justify-center border-0 bg-transparent p-0 text-[#ead6a4]"
            type="button"
            aria-label="关闭"
            onClick={handleClose}
          >
            <CloseIcon className="size-8" />
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
          {actions.map(action => (
            <div
              key={action}
              className="flex items-center gap-2 border-b border-[rgba(183,148,83,0.1)] py-2 last:border-0"
            >
              <span className="w-16 flex-none text-sm font-bold text-[#d7b866]">{KeyCodeLabels[action]}</span>
              <div className="flex flex-wrap gap-1.5">
                {local[action].map((code, i) => {
                  const isActive = listening?.action === action && listening?.index === i;
                  return (
                    <span key={i} className="relative">
                      <button
                        className={`h-8 min-w-8 rounded border px-2 text-sm ${isActive ? 'animate-pulse border-[#f0d188] bg-[#f0d188]/20 text-[#f0d188]' : 'border-[#81632e] bg-[#1a1b18] text-[#d7bc75] hover:border-[#b88c3c]'}`}
                        type="button"
                        onClick={() => setListening({ action, index: i })}
                      >
                        {isActive ? '...' : code ? formatKeyCode(code) : '???'}
                      </button>
                      {local[action].length > 1 && !isActive && (
                        <button
                          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border-0 bg-[#81632e] text-[10px] leading-none text-white"
                          type="button"
                          aria-label="移除"
                          onClick={() => handleRemove(action, i)}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
                {local[action].length < 3 && (
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-[#81632e]/50 text-[#81632e] hover:border-[#b88c3c] hover:text-[#b88c3c]"
                    type="button"
                    onClick={() => handleAdd(action)}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center px-3 pt-2">
          <button
            className="rounded-lg border border-[#81632e] bg-transparent px-4 py-1.5 text-sm text-[#d7bc75] hover:border-[#b88c3c] hover:text-[#f0d188]"
            type="button"
            onClick={() => {
              setLocal(structuredClone(DefaultKeyBindings));
              setListening(null);
            }}
          >
            恢复默认
          </button>
        </div>
      </section>
    </div>
  );
}
