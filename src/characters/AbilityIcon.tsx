import type { AbilityIcon as Kind } from './characterData';

const PATHS: Record<Kind, JSX.Element> = {
  eagle: <path d="M12 7c-2-3-6-4-10-3 3 1 5 3 6 5-2 0-3 1-4 3 2-1 4-1 6-1l-1 5 3-2 3 2-1-5c2 0 4 0 6 1-1-2-2-3-4-3 1-2 3-4 6-5-4-1-8 0-10 3Z" />,
  blade: <><path d="M12 2l2.5 9-2.5 11-2.5-11Z" /><path d="M7 12h10" /></>,
  wheel: <><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19" /></>,
  eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /><path d="M9 18l-1.5 4M15 18l1 4" /></>,
  spear: <><path d="M12 2l3 6h-6Z" /><path d="M12 8v14M8 13h8" /></>,
  axe: <><path d="M9 3v19" /><path d="M9 4c5 0 9 3 9 7s-4 7-9 7" /></>,
  bow: <><path d="M6 3c8 3 8 15 0 18" /><path d="M6 3v18M4 12h16M17 9l3 3-3 3" /></>,
  mask: <><path d="M3 8c3-2 15-2 18 0 0 6-4 10-9 10S3 14 3 8Z" /><path d="M7 11l3 1M17 11l-3 1" /></>,
  crown: <><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5Z" /><path d="M5 19h14" /></>,
  hood: <><path d="M12 2C7 2 5 7 5 12v9h14v-9c0-5-2-10-7-10Z" /><path d="M9 13c1 2 5 2 6 0" /><path d="M12 5l-2 4h4Z" /></>,
};

export function AbilityIcon({ kind, size = 22 }: { kind: Kind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {PATHS[kind]}
    </svg>
  );
}
