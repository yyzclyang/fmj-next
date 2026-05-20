interface SwitchConfirmDialogProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function SwitchConfirmDialog({ onCancel, onConfirm }: SwitchConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-20 hidden items-center justify-center bg-[#020604]/72 p-3.5 max-[720px]:flex"
      role="presentation"
      onClick={onCancel}
    >
      <section
        className="w-[min(100%,314px)] rounded-xl border-2 border-[#b4893f] bg-[linear-gradient(135deg,rgba(255,238,174,0.08),transparent_22%),radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#1a1b18_0%,#10110f_48%,#1b1b17_100%)] pb-[22px] text-[#ead6a4] shadow-[0_18px_50px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,232,163,0.13)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-confirm-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex min-h-[62px] items-center justify-center border-b border-[rgba(183,148,83,0.2)] px-5">
          <h2
            className="m-0 text-center text-[22px] leading-none font-extrabold text-[#d7b866]"
            id="switch-confirm-title"
          >
            切换游戏
          </h2>
        </header>
        <p className="mx-[22px] mt-5 mb-[23px] text-center text-[17px] leading-[1.7] font-bold text-[#f3e6c6]">
          切换游戏会丢失当前进度，
          <br />
          是否继续？
        </p>
        <div className="grid grid-cols-2 gap-3.5 px-[22px]">
          <button
            type="button"
            className="h-12 rounded-lg border border-[rgba(220,207,176,0.46)] bg-[linear-gradient(180deg,#30312e,#191a18)] text-lg font-extrabold text-[#f0e2bd]"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="h-12 rounded-lg border border-[#c57962] bg-[linear-gradient(180deg,#922f22,#691c16)] text-lg font-extrabold text-[#ffe6bb] shadow-[inset_0_0_0_1px_rgba(255,216,159,0.16)]"
            onClick={onConfirm}
          >
            继续
          </button>
        </div>
      </section>
    </div>
  );
}
