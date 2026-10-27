// Minimal inline line icons (Lucide-style) to avoid an extra dependency.
type P = { size?: number };
const base = (size = 20) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const IconUsers = ({ size }: P) => <svg {...base(size)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5" /></svg>;
export const IconClock = ({ size }: P) => <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const IconGlobe = ({ size }: P) => <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18" /></svg>;
export const IconLayers = ({ size }: P) => <svg {...base(size)}><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>;
export const IconGear = ({ size }: P) => <svg {...base(size)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
export const IconLogin = ({ size }: P) => <svg {...base(size)}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>;
export const IconChevron = ({ size, dir = 'right' }: P & { dir?: 'left' | 'right' }) => <svg {...base(size)} style={{ transform: dir === 'left' ? 'scaleX(-1)' : undefined }}><path d="m9 6 6 6-6 6" /></svg>;
export const IconDagger = ({ size }: P) => <svg {...base(size)}><path d="M12 2v14M9 16h6M12 16v6M10 4l2-2 2 2" /></svg>;
export const IconCastle = ({ size }: P) => <svg {...base(size)}><path d="M4 21V9h3V6h2v3h2V4h2v5h2V6h2v3h3v12Z" /><path d="M10 21v-4a2 2 0 0 1 4 0v4" /></svg>;
export const IconCards = ({ size }: P) => <svg {...base(size)}><rect x="3" y="5" width="12" height="16" rx="1" /><path d="M8 3h11a1 1 0 0 1 1 1v14" /><path d="M9 11l2 2 2-2-2-2Z" /></svg>;
export const IconCrown = ({ size }: P) => <svg {...base(size)}><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5Z" /></svg>;
export const IconMenu = ({ size }: P) => <svg {...base(size)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const IconCopy = ({ size }: P) => <svg {...base(size)}><rect x="9" y="9" width="12" height="12" rx="1" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>;
export const IconUsersSolid = ({ size }: P) => <svg width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="7.5" r="3.6" /><path d="M2 20c.6-4 3.4-6.4 7-6.4s6.4 2.4 7 6.4Z" /><circle cx="17.2" cy="8.6" r="2.8" /><path d="M16.6 13.4c3 .2 4.9 2.4 5.4 5.6h-4.3c-.3-2.2-.7-4-1.1-5.6Z" /></svg>;
export const IconClockSolid = ({ size }: P) => <svg width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M12 6.5V12l3.6 2.2" stroke="#0b0909" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>;

/** Original crest emblem (curved blades forming an "A" with a central dagger). */
export const Crest = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 124" aria-hidden="true">
    <defs>
      <linearGradient id="crestG" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#e9e1d4" /><stop offset="1" stopColor="#a99e8d" />
      </linearGradient>
    </defs>
    <g fill="url(#crestG)">
      <path d="M50 0 C47 22 36 56 18 92 C12 104 6 112 0 118 C14 116 24 110 30 100 C38 84 45 64 50 46 Z" />
      <path d="M50 0 C53 22 64 56 82 92 C88 104 94 112 100 118 C86 116 76 110 70 100 C62 84 55 64 50 46 Z" />
      <path d="M50 70 L58 92 L50 124 L42 92 Z" />
      <path d="M26 104 C40 96 60 96 74 104 C62 101 38 101 26 104 Z" opacity=".9" />
    </g>
  </svg>
);

export const IconCpu = ({ size }: P) => <svg {...base(size)}><rect x="6" y="6" width="12" height="12" rx="1" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></svg>;
