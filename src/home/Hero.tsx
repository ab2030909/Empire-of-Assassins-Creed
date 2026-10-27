import { useEffect, useRef, useState } from 'react';
import { HERO_BG, HERO_FIGURE, HERO_FIGURE_FALLBACK } from './assets';
import { IconUsersSolid, IconClockSolid, IconGlobe, IconLayers, IconChevron, IconLogin, Crest } from './icons';

const STATS = [
  { icon: <IconUsersSolid />, big: '2 - 4', small: 'Players' },
  { icon: <IconClockSolid />, big: '60 - 90 min', small: 'Playtime' },
  { icon: <IconGlobe />, big: 'Online', small: 'Multiplayer' },
  { icon: <IconLayers />, big: 'All Eras', small: "Assassin's Creed" },
];

export function GameStats() {
  return (
    <ul className="hp-stats">
      {STATS.map((s) => (
        <li key={s.small}><span className="hp-stat-icon">{s.icon}</span><span><b>{s.big}</b><small>{s.small}</small></span></li>
      ))}
    </ul>
  );
}

/** Weathered stone tower behind the Assassin (original SVG). */
function Tower() {
  return (
    <svg className="hp-tower" viewBox="0 0 100 345" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="stone" x1="0" x2="1">
          <stop offset="0" stopColor="#0d0a09" /><stop offset=".55" stopColor="#2a211c" /><stop offset=".85" stopColor="#6b4a32" /><stop offset="1" stopColor="#1a1310" />
        </linearGradient>
        <pattern id="bricks" width="20" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 13.5h20M10 0v7M0 7h20M0 0v7" stroke="#00000066" strokeWidth="1" fill="none" />
        </pattern>
      </defs>
      <path d="M8 0h84v40l-6 6v299H14V46l-6-6Z" fill="url(#stone)" />
      <path d="M8 0h84v40l-6 6v299H14V46l-6-6Z" fill="url(#bricks)" />
      <path d="M30 70 Q50 48 70 70 V140 H30 Z" fill="#070505" opacity=".85" />
      <path d="M4 36h92v8H4z" fill="#3a2a20" />
    </svg>
  );
}

function HeroFigure() {
  const [src, setSrc] = useState(HERO_FIGURE);
  return <img className="hp-figure" src={src} alt="" aria-hidden="true" onError={() => src !== HERO_FIGURE_FALLBACK && setSrc(HERO_FIGURE_FALLBACK)} />;
}

const Eagle = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 120 70" aria-hidden="true">
    <path d="M60 34 C50 14 28 4 2 6 C20 14 34 24 44 36 C34 38 26 44 22 52 C34 46 46 44 56 46 L54 62 L60 56 L66 62 L64 46 C74 44 86 46 98 52 C94 44 86 38 76 36 C86 24 100 14 118 6 C92 4 70 14 60 34 Z" fill="currentColor" />
  </svg>
);

export function Hero({ onCreate, onJoin, connected }: { onCreate: () => void; onJoin: () => void; connected: boolean }) {
  const bg = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => { if (bg.current && !document.body.classList.contains('no-motion')) bg.current.style.transform = `translateY(${window.scrollY * 0.2}px) scale(1.06)`; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <section className="hp-hero" id="top" aria-label="Empire of Assassins">
      <div className="hp-hero-bg" ref={bg} style={{ backgroundImage: `url("${HERO_BG}")` }} />
      <div className="hp-hero-tint" />
      <div className="hp-hero-color" />
      <div className="hp-hero-sky" />
      <Tower />
      <Eagle className="hp-eagle" />
      <Eagle className="hp-bird b1" /><Eagle className="hp-bird b2" /><Eagle className="hp-bird b3" />
      <HeroFigure />
      <div className="hp-ledge" />
      <div className="hp-hero-grade" />

      <div className="hp-hero-content">
        <div className="hp-brand">
          <Crest className="hp-brand-crest" />
          <h1 className="hp-title">
            <span className="hp-t1">Assassin's</span>
            <span className="hp-t2">CREED</span>
            <span className="hp-t3">Empire of Assassins</span>
          </h1>
          <p className="hp-sub">A Strategic Board Game<br />Across Time</p>
        </div>
        <div className="hp-cta">
          <button className="hp-btn red big" onClick={onCreate} disabled={!connected}><IconUsersSolid /> <span>Create Room</span> <IconChevron /></button>
          <button className="hp-btn ghost big" onClick={onJoin} disabled={!connected}><IconLogin /> <span>Join Room</span> <IconChevron /></button>
        </div>
        {!connected && <p className="hp-offline" role="status">Connecting to game server…</p>}
        <GameStats />
      </div>

      <div className="hp-motto"><span>Different Eras</span><span>One Brotherhood</span><i><Crest /></i></div>
    </section>
  );
}
