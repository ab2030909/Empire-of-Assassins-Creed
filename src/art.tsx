// Original SVG artwork: insignia, hooded portraits, space glyphs, dice.
import { useState } from 'react';
import type { SpaceKind } from '../shared/data';
import { CHARACTER_INFO } from './characters/characterData';

export function Insignia({ size = 64, color = '#c9a24a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 6 L90 92 L72 92 L50 44 L28 92 L10 92 Z" fill={color} />
      <path d="M50 58 L60 80 L40 80 Z" fill={color} opacity="0.85" />
      <path d="M22 70 Q50 58 78 70" stroke={color} strokeWidth="4" fill="none" opacity="0.5" />
    </svg>
  );
}

export function Portrait({ color, size = 72, label }: { color: string; size?: number | string; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? 'Assassin portrait'}>
      <defs>
        <radialGradient id={`bg${color.slice(1)}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0c0b0d" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg${color.slice(1)})`} />
      <path d="M50 14 C28 14 20 36 22 56 L16 100 L84 100 L78 56 C80 36 72 14 50 14 Z" fill="#141216" stroke={color} strokeWidth="2" />
      <path d="M50 22 L40 44 L50 40 L60 44 Z" fill={color} opacity="0.9" />
      <path d="M34 50 C38 64 62 64 66 50 C62 72 38 72 34 50 Z" fill="#000" />
      <path d="M40 54 L46 56 M54 56 L60 54" stroke="#6fd3ff" strokeWidth="2" opacity="0.8" />
      <path d="M30 82 L50 74 L70 82" stroke={color} strokeWidth="3" fill="none" />
    </svg>
  );
}

/**
 * Character art: uses /characters/<id>.jpg (or .png/.webp) from public/ if you add one,
 * otherwise falls back to the original SVG portrait.
 */
// Crop focus per image so faces (not cover titles) are centered.
const FOCUS: Record<string, string> = {
  ezio: '50% 62%', altair: '45% 58%', eivor: '50% 60%', bayek: '50% 85%', edward: '50% 10%', kassandra: '88% 30%',
};

export function CharacterArt({ id, color, size = 72, label, className }: { id: string; color: string; size?: number | string; label?: string; className?: string }) {
  const exts = ['jpg', 'png', 'webp'];
  const [i, setI] = useState(0);
  const info = CHARACTER_INFO[id];
  const [portraitOk, setPortraitOk] = useState(true);
  if (info && portraitOk) {
    // Roster portraits (characterData.ts) with avatar crop; probe image for failure fallback.
    return (
      <div role="img" aria-label={label ?? id} className={`char-img ${className ?? ''}`}
        style={{ width: size, height: size, backgroundImage: `url("${info.art.src}")`, backgroundSize: info.art.avatar.size, backgroundPosition: info.art.avatar.pos,
          backgroundRepeat: 'no-repeat', backgroundColor: `color-mix(in srgb, ${info.theme} 45%, #0d0b0c)` }}>
        <img src={info.art.src} alt="" hidden onError={() => setPortraitOk(false)} />
      </div>
    );
  }
  if (i >= exts.length) {
    return <div className={className} style={{ width: size, height: size }}><Portrait color={color} size="100%" label={label} /></div>;
  }
  return (
    <img className={`char-img ${className ?? ''}`} src={`/characters/${id}.${exts[i]}`} alt={label ?? id}
      style={{ width: size, height: size, objectPosition: FOCUS[id] ?? '50% 25%' }} onError={() => setI(i + 1)} />
  );
}

export function SpaceGlyph({ kind, size = 26 }: { kind: SpaceKind; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 40 40', 'aria-hidden': true } as const;
  switch (kind) {
    case 'animus':
      return <svg {...s}><polygon points="20,3 37,20 20,37 3,20" fill="none" stroke="#6fd3ff" strokeWidth="2.5" /><circle cx="20" cy="20" r="5" fill="#6fd3ff" /></svg>;
    case 'conspiracy':
      return <svg {...s}><path d="M8 6h24v6H24v22h-8V12H8z" fill="#b3262e" /><path d="M14 16h12" stroke="#000" strokeWidth="2" /></svg>;
    case 'eden':
      return <svg {...s}><circle cx="20" cy="22" r="12" fill="#d4a537" /><path d="M20 10 C22 4 28 4 28 4" stroke="#7aa34a" strokeWidth="2.5" fill="none" /><path d="M14 20 L26 20 M20 14 L20 30" stroke="#fff6" strokeWidth="1.5" /></svg>;
    case 'mission':
      return <svg {...s}><rect x="7" y="6" width="26" height="30" fill="#e8dcc0" /><path d="M12 14h16M12 20h16M12 26h10" stroke="#5a3e1c" strokeWidth="2" /><circle cx="28" cy="30" r="5" fill="#a12a2a" /></svg>;
    case 'brotherhood':
      return <svg {...s}><path d="M6 34 L6 16 L20 6 L34 16 L34 34 Z" fill="none" stroke="#c9a24a" strokeWidth="2.5" /><rect x="16" y="22" width="8" height="12" fill="#c9a24a" /></svg>;
    case 'tax':
      return <svg {...s}><circle cx="20" cy="20" r="14" fill="none" stroke="#c9a24a" strokeWidth="2.5" /><text x="20" y="26" textAnchor="middle" fontSize="16" fill="#c9a24a" fontFamily="Cinzel">AC</text></svg>;
    case 'jail':
      return <svg {...s}><rect x="6" y="6" width="28" height="28" fill="none" stroke="#6fd3ff" strokeWidth="2" /><path d="M13 6v28M20 6v28M27 6v28" stroke="#6fd3ff" strokeWidth="2" /></svg>;
    case 'gotojail':
      return <svg {...s}><path d="M6 34 L20 6 L34 34 Z" fill="#b3262e" /><path d="M14 26 h12" stroke="#000" strokeWidth="3" /></svg>;
    case 'sanctuary':
      return <svg {...s}><path d="M20 4 L34 34 L26 34 L20 20 L14 34 L6 34 Z" fill="#c9a24a" /></svg>;
    case 'start':
      return <svg {...s}><circle cx="20" cy="20" r="15" fill="none" stroke="#6fd3ff" strokeWidth="2.5" /><path d="M14 20 h12 M21 14 l6 6 -6 6" stroke="#6fd3ff" strokeWidth="2.5" fill="none" /></svg>;
    default:
      return null;
  }
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};
export function Die({ value, rolling }: { value: number; rolling?: boolean }) {
  return (
    <svg className={`die ${rolling ? 'rolling' : ''}`} width="52" height="52" viewBox="0 0 100 100" role="img" aria-label={`Die showing ${value}`}>
      <rect x="4" y="4" width="92" height="92" rx="14" fill="#efe4c8" stroke="#c9a24a" strokeWidth="4" />
      {PIPS[value]?.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" fill={value === 1 ? '#a12a2a' : '#1a1416'} />)}
    </svg>
  );
}
