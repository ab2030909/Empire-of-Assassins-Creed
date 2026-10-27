import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CHARACTER_PROFILE, ROSTER, type Character } from './characterData';
import { CharPortrait } from './Portrait';
import { AbilityIcon } from './AbilityIcon';
import { CardFx } from './CardFx';
import { EIVOR_MAX_PRICE } from '../../shared/data';

const COOLDOWN = (c: Character) => (c.ability.cooldownRounds ? `${c.ability.cooldownRounds} round${c.ability.cooldownRounds > 1 ? 's' : ''}` : 'None');
const USAGE: Record<string, string> = {
  ezio: 'Once per round', eivor: `1 per turn (≤ ${EIVOR_MAX_PRICE} AC)`, bayek: 'Automatic', arno: 'Automatic', basim: 'Automatic',
};
const usage = (c: Character) => USAGE[c.id] ?? (c.ability.kind === 'active' ? 'On demand' : 'Automatic');

const StatIcon = ({ k }: { k: string }) => {
  const d: Record<string, JSX.Element> = {
    influence: <><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></>,
    stealth: <><path d="M12 3C8 3 6 7 6 11v9h12v-9c0-4-2-8-6-8Z" /><path d="M9 13c1 1.5 5 1.5 6 0" /></>,
    economy: <><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3 3 7 3s7-1.3 7-3v-5" /></>,
    strategy: <><path d="M4 20h16M7 20v-3h10v3M9 17l-1-7h8l-1 7M8 10 7 5l3 2 2-3 2 3 3-2-1 5" /></>,
  };
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">{d[k]}</svg>;
};

const Crest = () => (
  <svg viewBox="0 0 100 124" aria-hidden="true"><path d="M50 0C47 22 36 56 18 92 12 104 6 112 0 118c14-2 24-8 30-18 8-16 15-36 20-54ZM50 0c3 22 14 56 32 92 6 12 12 20 18 26-14-2-24-8-30-18-8-16-15-36-20-54Zm0 70 8 22-8 32-8-32Z" fill="currentColor" /></svg>
);

/**
 * Character popup: hero art with scene gallery on the left, full profile on the right.
 * `list` enables prev/next. `onSelect` shows "Select <name>" (lobby selection or homepage → Create Room).
 */
export function CharacterDetailsModal({ c, list, onNavigate, onClose, onSelect, selectLabel, selectDisabled }: {
  c: Character; list?: Character[]; onNavigate?: (c: Character) => void; onClose: () => void;
  onSelect?: () => void; selectLabel?: string; selectDisabled?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const [shot, setShot] = useState(0);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const idx = list ? list.findIndex((x) => x.id === c.id) : -1;
  const prof = CHARACTER_PROFILE[c.id];
  const gallery = [{ src: '', label: 'Portrait' }, ...(prof?.scenes ?? [])];
  const close = () => {
    if (document.body.classList.contains('no-motion')) return onClose();
    setClosing(true); setTimeout(onClose, 220);
  };
  const nav = (d: number) => { if (list && onNavigate && idx >= 0) onNavigate(list[(idx + d + list.length) % list.length]); };
  const step = (d: number) => setShot((s) => (s + d + gallery.length) % gallery.length);
  void step;
  // Faces strip: browse every character from inside the popup
  const faces = list ?? ROSTER;
  const switchTo = (f: Character) => onNavigate?.(f);
  const go = (d: number) => { const n = faces.findIndex((x) => x.id === c.id); switchTo(faces[(n + d + faces.length) % faces.length]); };

  useEffect(() => setShot(0), [c.id]);
  // Preload every popup picture so switching characters shows the new picture instantly
  useEffect(() => {
    ROSTER.forEach((r) => { new Image().src = r.info.art.popup ?? `/characters/portraits/${r.id}-popup.png`; });
  }, []);
  useEffect(() => {
    closeBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') nav(1);
      if (e.key === 'ArrowLeft') nav(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const i = c.info, l = c.lore;
  const scene = shot > 0 ? gallery[shot].src : prof?.scenes[0]?.src;

  // Portal to <body> so the popup sits above the fixed navbar (page sections create their own stacking context).
  return createPortal(
    <div className={`acp-back ${closing ? 'closing' : ''}`} onClick={close}>
      <div className={`acp rarity-${i.rarity.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="acp-name"
        style={{ ['--theme' as string]: i.theme }} onClick={(e) => e.stopPropagation()} key={c.id}>
        <span className="acp-corner tl" /><span className="acp-corner tr" /><span className="acp-corner bl" /><span className="acp-corner br" />
        <button ref={closeBtn} className="acp-close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>

        <div className="acp-left">
          <div className="acp-art">
            {shot === 0 && (true
              ? <img key={c.id} className="acp-popup-img" src={c.info.art.popup ?? `/characters/portraits/${c.id}-popup.png`} alt={c.name}
                  onError={e => { const t = e.currentTarget; t.onerror = null; t.src = c.info.art.src; t.style.objectFit = 'contain'; }} />
              : <CharPortrait c={c} crop="full" className="acp-hero" />)}
            {shot > 0 && <div className="acp-scene-label">{gallery[shot].label}</div>}
            <CardFx type={l.fx} />
          </div>
          <div className="acp-gallery">
            <button className="acp-gnav" onClick={() => go(-1)} aria-label="Previous character">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            </button>
            <div className="acp-faces">
              {[-1, 0, 1, 2].map((d) => faces[(faces.findIndex((x) => x.id === c.id) + d + faces.length) % faces.length]).map((f) => (
                <button key={f.id} className={`acp-thumb ${f.id === c.id ? 'on' : ''}`} onClick={() => switchTo(f)}
                  aria-label={`View ${f.name}`} aria-pressed={f.id === c.id} title={f.name}>
                  <CharPortrait c={f} crop="avatar" />
                </button>
              ))}
            </div>
            <button className="acp-gnav" onClick={() => go(1)} aria-label="Next character">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            </button>
          </div>
        </div>

        <div className="acp-info">
          <header className="acp-head">
            <span className="acp-crest"><Crest /></span>
            <div>
              <h2 id="acp-name">{c.name}</h2>
              <p className="acp-title">{c.title}</p>
            </div>
          </header>
          <div className="acp-chips">
            <span className="acp-chip">{i.family.replace('Early Brotherhood', 'Crusades & Renaissance')}</span>
            <span className="acp-chip red">{i.game.split(' · ')[0]}</span>
            <span className={`acp-chip rare rarity-${i.rarity.toLowerCase()}`}><i />{i.rarity}</span>
          </div>
          {i.quote && <p className="acp-quote">“{i.quote}”</p>}
          {l.bio && <p className="acp-bio">{l.bio}</p>}

          <h4 className="acp-h">Special Ability</h4>
          <div className="acp-ability">
            <span className="acp-ab-icon"><AbilityIcon kind={i.icon} size={24} /></span>
            <div className="acp-ab-main">
              <b>{c.ability.name}</b>
              <p>{c.ability.description}</p>
            </div>
            <dl className="acp-ab-meta">
              <dt>Cooldown</dt><dd>{COOLDOWN(c)}</dd>
              <dt>Usage Limit</dt><dd>{usage(c)}</dd>
            </dl>
          </div>

          {prof && <>
            <h4 className="acp-h">Stats (Gameplay)</h4>
            <div className="acp-stats">
              {(['influence', 'stealth', 'economy', 'strategy'] as const).map((k) => (
                <div key={k} className="acp-stat">
                  <span className="acp-stat-icon"><StatIcon k={k} /></span>
                  <span className="acp-stat-name">{k[0].toUpperCase() + k.slice(1)}</span>
                  <span className="acp-pips" role="img" aria-label={`${prof.stats[k]} of 5`}>
                    {Array.from({ length: 5 }, (_, n) => <i key={n} className={n < prof.stats[k] ? 'on' : ''} style={{ ['--n' as string]: n }} />)}
                  </span>
                </div>
              ))}
            </div>

            <h4 className="acp-h">Historical Details</h4>
            <table className="acp-hist">
              <tbody>
                <tr><th>Birth</th><td>{prof.history.birth}</td></tr>
                <tr><th>Origin</th><td>{prof.history.origin}</td></tr>
                <tr><th>Role</th><td>{prof.history.role}</td></tr>
                <tr><th>Affiliation</th><td>{prof.history.affiliation}</td></tr>
                <tr><th>Board home</th><td>{l.home}</td></tr>
              </tbody>
            </table>
          </>}
          {l.tip && <><h4 className="acp-h">Strategy</h4><p className="acp-bio">{l.tip}</p></>}
          {list && (
            <div className="acp-nav">
              <button className="hp-btn ghost" onClick={() => nav(-1)}>← Prev</button>
              <span>{idx + 1} / {list.length}</span>
              <button className="hp-btn ghost" onClick={() => nav(1)}>Next →</button>
            </div>
          )}
        </div>

        {onSelect && (
          <div className="acp-foot">
            <button className="hp-btn red acp-select" disabled={selectDisabled} onClick={onSelect}>{selectLabel ?? `Select ${c.name}`}</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
