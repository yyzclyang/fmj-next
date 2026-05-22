import type { Ref } from 'react';

interface GameScreenProps {
  readonly canvasRef: Ref<HTMLCanvasElement>;
  readonly title: string;
}

export function GameScreen({ canvasRef, title }: GameScreenProps) {
  return (
    <div className="relative box-content flex h-48 w-80 items-center justify-center border border-(--ink) bg-[#020604] shadow-[0_18px_50px_rgba(18,24,20,0.18),0_0_0_8px_var(--rail)] max-[720px]:z-1 max-[720px]:box-border max-[720px]:aspect-5/3 max-[720px]:h-auto max-[720px]:w-full max-[720px]:rounded-xl max-[720px]:border-[9px] max-[720px]:border-[#080908] max-[720px]:shadow-[0_0_0_2px_rgba(133,105,49,0.78),0_0_0_6px_#1d1f1b,inset_0_0_18px_rgba(0,0,0,0.82)] min-[900px]:h-96 min-[900px]:w-160 min-[1220px]:h-144 min-[1220px]:w-240 min-[1540px]:h-192 min-[1540px]:w-7xl">
      <canvas
        ref={canvasRef}
        className="block h-48 w-80 [image-rendering:pixelated] max-[720px]:rounded min-[900px]:h-96 min-[900px]:w-160 min-[1220px]:h-144 min-[1220px]:w-240 min-[1540px]:h-192 min-[1540px]:w-7xl"
        aria-label={title}
      />
    </div>
  );
}
