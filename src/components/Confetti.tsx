"use client";

import { useMemo } from "react";

const COLORS = ["#ea580c", "#fbbf24", "#16a34a", "#3b82f6", "#ec4899"];

/** Deterministic 0..1 pseudo-random from two integers — keeps render pure
 *  (no Math.random) and avoids server/client hydration mismatches. */
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Hash an arbitrary string into a stable integer seed. */
function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 10000;
}

/**
 * Purely decorative burst behind the result card. `seed` varies the layout
 * per dish while staying deterministic for a given result.
 */
export default function Confetti({
  pieces = 28,
  seed = "confetti",
}: {
  pieces?: number;
  seed?: string;
}) {
  const bits = useMemo(() => {
    const s = hashSeed(seed);
    return Array.from({ length: pieces }, (_, i) => ({
      id: i,
      left: rand(s + i, 1) * 100,
      delay: rand(s + i, 2) * 0.5,
      duration: 1.8 + rand(s + i, 3) * 1.4,
      color: COLORS[i % COLORS.length],
      size: 6 + rand(s + i, 4) * 6,
    }));
  }, [pieces, seed]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.id}
          className="absolute top-0 block animate-confetti rounded-[2px]"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size * 1.6}px`,
            backgroundColor: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
