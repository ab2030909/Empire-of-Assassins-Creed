// Create / Join room screens. These talk to the real Socket.IO backend (server/index.ts).
import { useEffect, useRef, useState } from 'react';
import { Modal } from '../App';
import { emit, session } from '../net';
import { ROSTER } from '../characters/characterData';
import { CharPortrait } from '../characters/Portrait';
import { Crest, IconChevron, IconClock, IconGear, IconUsers } from './icons';
import './createroom.css';

const savedName = () => localStorage.getItem('eoa-name') ?? '';

const PICK_ORDER = ['ezio', 'altair', 'edward', 'kassandra', 'bayek', 'arno', 'connor', 'jacob', 'eivor', 'basim'];
const PICKS = PICK_ORDER.map((id) => ROSTER.find((r) => r.id === id)).filter(Boolean) as typeof ROSTER;
const ERA: Record<string, string> = {
  ezio: 'Renaissance', altair: 'Holy Land', edward: 'Golden Age', kassandra: 'Ancient Greece', bayek: 'Ptolemaic Egypt',
  arno: 'French Revolution', connor: 'American Revolution', jacob: 'Victorian London', eivor: 'Viking Age', basim: 'Golden Age of Baghdad',
};
const cardName = (n: string) => (/^Alta/.test(n) ? 'Altaïr' : /^(Kassandra|Bayek|Arno|Basim|Eivor|Connor)/.test(n) ? n.split(' ')[0] : n);

/** Standalone "Create Room" page matching the reference design. */
export function CreateRoomModal({ onClose, onJoin, initialCharacter }: { onClose: () => void; onJoin?: () => void; initialCharacter?: string }) {
  const [name, setName] = useState(savedName);
  const [character, setCharacter] = useState(initialCharacter ?? 'ezio');
  const [mode, setMode] = useState<'friends' | 'pc'>('friends');
  const [opps, setOpps] = useState<string[]>(['altair']); // PC opponents' assassins
  const [editing, setEditing] = useState<number | null>(null);
  const freeFor = (list = opps, mine = character) => PICKS.find((c) => c.id !== mine && !list.includes(c.id))?.id;
  // keep PC picks from clashing with the player's own assassin
  useEffect(() => { if (opps.includes(character)) setOpps((o) => o.map((x) => (x === character ? freeFor(o.filter((y) => y !== x)) ?? x : x))); }, [character]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rounds, setRounds] = useState(20);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = 'Create Room · Empire of Assassins'; return () => { document.title = 'Empire of Assassins'; }; }, []);
  useEffect(() => { track.current?.querySelector<HTMLElement>('.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, []);

  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.6, behavior: 'smooth' });

  async function create() {
    setErr('');
    if (!name.trim()) { nameRef.current?.focus(); return setErr('Enter your Assassin name (top right).'); }
    setBusy(true);
    localStorage.setItem('eoa-name', name.trim());
    const r = await emit('room:create', { name, character, maxRounds: rounds, botChars: mode === 'pc' ? opps : [] });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? 'Could not create room.');
    history.replaceState(null, '', '/lobby'); // lobby is its own page
    session.set(r.code!, r.token!);
  }

  const me = PICKS.find((c) => c.id === character) ?? PICKS[0];

  return (
    <main className="cr2">
      <span className="cr2-right" aria-hidden="true" />
      <span className="cr2-flag" aria-hidden="true" />

      <header className="cr2-top">
        <button className="cr2-logo" onClick={onClose} aria-label="Empire of Assassins home">
          <Crest className="cr2-logo-crest" />
          <span><small>Empire of</small><b>Assassins</b></span>
        </button>
        <nav className="cr2-nav" aria-label="Main">
          <button className="on" onClick={onClose}><span className="ring"><Crest className="ic" /></span>Lobby</button>
          <button type="button" disabled title="Coming soon"><IconUserSm />Profile</button>
          <button type="button" disabled title="Coming soon"><span className="ring sm">♛</span>Leaderboard</button>
          <button type="button" onClick={onClose}><IconGear size={16} />Settings</button>
        </nav>
        <label className="cr2-user">
          <span className="av"><CharPortrait c={me} crop="avatar" /></span>
          <input ref={nameRef} value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" />
          <em>Host</em>
          <IconChevron size={16} dir="right" />
        </label>
      </header>

      <aside className="cr2-side" aria-label="Rooms">
        <button className="on"><IconPlusRing />Create Room</button>
        <button onClick={onJoin}><IconDoor />Join Room</button>
        <button disabled title="Coming soon"><IconScroll />My Rooms</button>
        <button disabled title="Coming soon"><IconUsers size={18} />Friends</button>
        <Crest className="cr2-side-crest" />
      </aside>

      <div className="cr2-main">
        <section className="cr2-hero">
          <div className="txt">
            <span className="mark"><Crest className="ic" /></span>
            <h1>Create a Room</h1>
            <p>Set up your game and choose your assassin.</p>
          </div>
          <em className="quote">“Different eras.<br />One brotherhood.”</em>
        </section>

        <section className="cr2-box">
          <h2><span className="ring"><IconPlus /></span>Choose Your Assassin</h2>
          <div className="cr2-cards-wrap">
            <div className="cr2-cards" ref={track} role="radiogroup" aria-label="Assassin">
              {PICKS.map((c) => {
                const on = c.id === character;
                return (
                  <div key={c.id} className={`cr2-card ${on ? 'on' : ''}`} onClick={() => setCharacter(c.id)}>
                    <span className="ph"><CharPortrait c={c} crop="card" /></span>
                    {on && <span className="tick" aria-hidden="true">✓</span>}
                    <b>{cardName(c.name)}</b>
                    <small>{ERA[c.id] ?? c.info.family}</small>
                    <Crest className="crest" />
                    <button type="button" role="radio" aria-checked={on} aria-label={`Select ${c.name}`} onClick={(e) => { e.stopPropagation(); setCharacter(c.id); }}>Select</button>
                  </div>
                );
              })}
            </div>
            <button className="cr2-arrow l" onClick={() => scroll(-1)} aria-label="Previous assassins"><IconChevron size={18} dir="left" /></button>
            <button className="cr2-arrow r" onClick={() => scroll(1)} aria-label="More assassins"><IconChevron size={18} /></button>
          </div>
        </section>

        <section className="cr2-box cfg">
          <h2><span className="ring"><IconGear size={15} /></span>Match Configuration</h2>
          <div className="cr2-cfg">
            <div className="cr2-modes" role="radiogroup" aria-label="Opponents">
              <button role="radio" aria-checked={mode === 'friends'} className={mode === 'friends' ? 'on' : ''} onClick={() => setMode('friends')}><IconUsers size={18} />With Friends</button>
              <button role="radio" aria-checked={mode === 'pc'} className={mode === 'pc' ? 'on' : ''} onClick={() => setMode('pc')}><IconTarget />Vs PC</button>
            </div>
            <label className="cr2-field">
              <span className="lbl">Round Limit</span>
              <span className="sel"><IconClock size={16} />
                <select value={rounds} onChange={(e) => setRounds(+e.target.value)}>
                  {[10, 15, 20, 25, 30, 40].map((n) => <option key={n} value={n}>{n} rounds</option>)}
                </select>
              </span>
            </label>
            <label className="cr2-field">
              <span className="lbl">Room Privacy</span>
              <span className="sel"><IconLock />
                <select value={privacy} onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </span>
            </label>
          </div>

          {mode === 'pc' && (
            <div className="cr2-opps">
              <span className="lbl">◆ PC Opponents ({opps.length}/3) · click a slot to choose its assassin</span>
              <div className="row">
                {opps.map((id, i) => {
                  const c = PICKS.find((p) => p.id === id)!;
                  return (
                    <div key={i} className={`cr2-opp ${editing === i ? 'on' : ''}`}>
                      <button className="face" onClick={() => setEditing(editing === i ? null : i)} aria-label={`PC ${i + 1}: ${c.name}. Change assassin`}>
                        <span className="ph"><CharPortrait c={c} crop="avatar" /></span>
                        <span className="tx"><b>PC {i + 1}</b><small>{c.name}</small></span>
                      </button>
                      {opps.length > 1 && <button className="rm" onClick={() => { setOpps(opps.filter((_, j) => j !== i)); setEditing(null); }} aria-label={`Remove PC ${i + 1}`}>✕</button>}
                    </div>
                  );
                })}
                {opps.length < 3 && (
                  <button className="cr2-opp add" onClick={() => { const f = freeFor(); if (f) { setOpps([...opps, f]); setEditing(opps.length); } }}>+ Add Opponent</button>
                )}
              </div>
              {editing !== null && opps[editing] && (
                <div className="cr2-opp-pick" role="radiogroup" aria-label={`Assassin for PC ${editing + 1}`}>
                  {PICKS.map((c) => {
                    const used = c.id === character || opps.some((o, j) => o === c.id && j !== editing);
                    return (
                      <button key={c.id} role="radio" aria-checked={opps[editing] === c.id} disabled={used}
                        className={opps[editing] === c.id ? 'on' : ''} title={used ? 'Already taken' : c.name}
                        onClick={() => setOpps(opps.map((o, j) => (j === editing ? c.id : o)))}>
                        <span className="ph"><CharPortrait c={c} crop="avatar" /></span><small>{c.name.split(' ')[0]}</small>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {err && <p className="cr2-err" role="alert">{err}</p>}
        <button className="cr2-go" disabled={busy} onClick={create}>
          <Crest className="ic" /><span>{busy ? 'Creating…' : 'Create Room'}</span>
        </button>
      </div>
    </main>
  );
}

const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true } as const;
const IconUserSm = () => <svg {...sv} width="16" height="16"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>;
const IconPlus = () => <svg {...sv} width="14" height="14"><path d="M12 5v14M5 12h14" /></svg>;
const IconPlusRing = () => <svg {...sv} width="20" height="20"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
const IconDoor = () => <svg {...sv} width="20" height="20"><path d="M5 21V4h10v17M15 6h4v15M11 12h1M3 21h18" /></svg>;
const IconScroll = () => <svg {...sv} width="20" height="20"><path d="M7 4h11a2 2 0 0 1 0 4H7M7 4a2 2 0 0 0 0 4v10a2 2 0 0 0 2 2h9a2 2 0 0 0 0-4H9" /></svg>;
const IconTarget = () => <svg {...sv} width="18" height="18"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>;
const IconLock = () => <svg {...sv} width="16" height="16"><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

export function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setMsg(null);
    if (!name.trim()) return setMsg({ ok: false, text: 'Enter your Assassin name.' });
    if (!code.trim()) return setMsg({ ok: false, text: 'Enter a room code.' });
    if (code.trim().length !== 5) return setMsg({ ok: false, text: 'Room codes have 5 characters.' });
    setBusy(true);
    localStorage.setItem('eoa-name', name.trim());
    const r = await emit('room:join', { name, code });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? 'Could not join.' });
    setMsg({ ok: true, text: `Joined room ${r.code}. Entering lobby…` });
    session.set(r.code!, r.token!);
  }

  return (
    <Modal title="Join Room" onClose={onClose}>
      <form className="hp-form" onSubmit={(e) => { e.preventDefault(); join(); }}>
        <label className="field"><span>Your name</span><input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Room code</span>
          <input className="hp-code-input" autoFocus value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABCDE" aria-invalid={msg ? !msg.ok : undefined} />
        </label>
        {msg && <p className={msg.ok ? 'ok' : 'error'} role="alert">{msg.text}</p>}
        <button className="hp-btn red big" type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join Room'}</button>
      </form>
    </Modal>
  );
}
