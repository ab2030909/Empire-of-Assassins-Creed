import type { CardFx as Fx } from './characterData';

// Deterministic pseudo-random so particles don't jump between renders.
const rnd = (i: number, s: number) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

const COUNT: Record<Fx, number> = { mist: 3, embers: 14, leaves: 9, waves: 3, rain: 22, smoke: 6, sand: 18, lightning: 2, snow: 18, glint: 3 };

/** Ambient CSS particle layer. Each `type` has its own keyframes in characters.css. */
export function CardFx({ type }: { type: Fx }) {
  return (
    <div className={`fx fx-${type}`} aria-hidden="true">
      {Array.from({ length: COUNT[type] }, (_, i) => (
        <i key={i} style={{
          ['--x' as string]: `${Math.round(rnd(i, 1) * 100)}%`,
          ['--d' as string]: `${(rnd(i, 2) * 6).toFixed(2)}s`,
          ['--t' as string]: `${(3 + rnd(i, 3) * 5).toFixed(2)}s`,
          ['--s' as string]: (0.5 + rnd(i, 4)).toFixed(2),
          ['--w' as string]: `${Math.round((rnd(i, 5) - 0.5) * 60)}px`,
        }} />
      ))}
    </div>
  );
}
