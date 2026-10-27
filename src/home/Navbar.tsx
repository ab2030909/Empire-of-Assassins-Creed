import { useEffect, useState } from 'react';
import { IconGear, IconMenu, Crest } from './icons';

export const NAV = [
  { id: 'top', label: 'Home' },
  { id: 'how', label: 'How to Play' },
  { id: 'characters', label: 'Characters' },
  { id: 'locations', label: 'Locations' },
  { id: 'features', label: 'Features' },
];

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  const smooth = !document.body.classList.contains('no-motion');
  if (id === 'top' || !el) window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  else el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

export function Navbar({ onCreate, onJoin, onSettings }: { onCreate: () => void; onJoin: () => void; onSettings: () => void }) {
  const [active, setActive] = useState('top');
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > 40);
      let cur = 'top';
      for (const n of NAV.slice(1)) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = n.id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => { setOpen(false); scrollToId(id); };

  return (
    <header className={`hp-nav ${solid ? 'solid' : ''}`}>
      <button className="hp-logo" onClick={() => go('top')} aria-label="Empire of Assassins home"><Crest /></button>
      <nav className={`hp-links ${open ? 'open' : ''}`} aria-label="Primary">
        {NAV.map((n) => (
          <button key={n.id} className={active === n.id ? 'active' : ''} aria-current={active === n.id ? 'true' : undefined} onClick={() => go(n.id)}>{n.label}</button>
        ))}
        <div className="hp-links-mobile-actions">
          <button className="hp-btn ghost" onClick={() => { setOpen(false); onJoin(); }}>Join with Code</button>
          <button className="hp-btn red" onClick={() => { setOpen(false); onCreate(); }}>Create Room</button>
        </div>
      </nav>
      <div className="hp-nav-actions">
        <button className="hp-icon-btn" onClick={onSettings} aria-label="Settings"><IconGear size={18} /></button>
        <button className="hp-btn ghost hide-sm" onClick={onJoin}>Join with Code</button>
        <button className="hp-btn red hide-sm" onClick={onCreate}>Create Room</button>
        <button className="hp-icon-btn show-sm" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}><IconMenu size={20} /></button>
      </div>
    </header>
  );
}
