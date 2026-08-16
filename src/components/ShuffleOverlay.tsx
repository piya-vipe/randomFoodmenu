"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Slot-machine style build-up shown while the pick is being revealed.
 * Cycles through candidate names with an accelerating-then-slowing cadence,
 * then calls onDone() so the parent can swap in the real result.
 */
export default function ShuffleOverlay({
  reel,
  scopeLabel,
  scopeEmoji,
  onDone,
}: {
  reel: string[];
  scopeLabel: string;
  scopeEmoji: string;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const onDoneRef = useRef(onDone);

  // Keep the callback ref current without writing to it during render.
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (reel.length === 0) {
      onDoneRef.current();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    // Ease-out cadence: quick flicks up front, slowing down toward the winner.
    for (let i = 1; i < reel.length; i++) {
      const progress = i / reel.length;
      const delay = 55 + Math.pow(progress, 2.2) * 260;
      elapsed += delay;
      timers.push(setTimeout(() => setIndex(i), elapsed));
    }

    timers.push(setTimeout(() => onDoneRef.current(), elapsed + 420));

    return () => timers.forEach(clearTimeout);
  }, [reel]);

  const current = reel[index] ?? "";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 text-center shadow-xl">
        <div className="mb-4 inline-block text-5xl animate-shake">🍲</div>
        <p className="text-sm text-muted-foreground">
          {scopeEmoji} กำลังสุ่มจาก {scopeLabel}
        </p>

        <div className="mt-4 flex h-20 items-center justify-center overflow-hidden rounded-2xl bg-surface-muted px-3">
          <p
            key={index}
            className="animate-reel-flick text-xl font-bold text-primary"
          >
            {current}
          </p>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">วันนี้จะได้กินอะไรนะ...</p>
      </div>
    </div>
  );
}
