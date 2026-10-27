// Room lobby page (/lobby). Shown after creating or joining a room, until the host starts the match.
import { useEffect, useMemo, useRef, useState } from 'react';
import { socket, emit } from '../net';
import type { RoomView } from '../../shared/protocol';
import { ROSTER, Character } from '../characters/characterData';
import { CharPortrait } from '../characters/Portrait';
import { CharacterDetailsModal } from '../characters/CharacterDetailsModal';
import { Crest, IconChevron, IconClock, IconCopy, IconGear, IconCrown } from '../home/icons';
import './lobby.css';

const ERA: Record<string, string> = {
  ezio: 'Renaissance', altair: 'Holy Land', edward: 'Golden Age', kassandra: 'Ancient Greece', bayek: 'Ptolemaic Egypt',
  arno: 'French Revolution', connor: 'The Patriot', jacob: 'Industrial Era', eivor: 'Viking Age', basim: 'Baghdad',
};
const ORDER = ['altair', 'ezio', 'edward', 'kassandra', 'bayek', 'connor', 'arno', 'jacob', 'basim', 'eivor'];
const PICKS = ORDER.map((id) => ROSTER.find((r) => r.id === id)).filter(Boolean) as Character[];
const MAPS: Record<string, { label: string; img: string }> = {
  random: { label: 'Random', img: '/places/Notre-Dame_de_Paris.jpg' },
  classic: { label: 'Classic', img: '/places/Masyaf_Castle.jpg' },
  renaissance: { label: 'Renaissance', img: '/places/Florence_Cathedral.jpg' },
  colonial: { label: 'Colonial', img: '/places/Boston.jpg' },
  ancient: { label: 'Ancient', img: '/places/Giza_pyramid_complex.jpg' },
};
const byId = (id: string | null) => ROSTER.find((r) => r.id === id);
const FAV_KEY = 'eoa-favs';

export function LobbyPage({ view, onLeave }: { view: RoomView; onLeave: () => void }) {
  const me = view.members.find((m) => m.id === view.youId)!;
  const isHost = view.hostId === view.youId;
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'Legendary' | 'Epic' | 'fav'>('all');
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]'); } catch { return []; } });
  const [tab, setTab] = useState<'chat' | 'system'>('chat');
  const [msg, setMsg] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [adding, setAdding] = useState(false); // PC opponent picker
  const [info, setInfo] = useState<string | null>(null); // character id shown in the popup
  const track = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const canStart = view.members.length >= 2 && view.members.every((m) => m.ready && m.character && m.connected);
  const map = MAPS[view.map] ?? MAPS.random;

  useEffect(() => {
    document.title = `Lobby ${view.code} · Empire of Assassins`;
    if (location.pathname !== '/lobby') history.replaceState(null, '', '/lobby');
    return () => { document.title = 'Empire of Assassins'; };
  }, [view.code]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [view.chat.length, tab]);
  useEffect(() => { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); }, [favs]);

  const list = useMemo(() => PICKS.filter((c) =>
    (filter === 'all' || (filter === 'fav' ? favs.includes(c.id) : c.info.rarity === filter)) &&
    (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()))), [filter, q, favs]);

  const lines = view.chat.filter((l) => (tab === 'system' ? !l.from : true));

  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(''), 1500); }).catch(() => {});
  }
  async function start() {
    setErr('');
    const r = await emit('room:start');
    if (!r.ok) setErr(r.error ?? 'Could not start.');
  }
  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    socket.emit('room:chat', { text: msg });
    setMsg('');
  }
  const pick = (c: Character) => { if (!view.members.some((m) => m.character === c.id && m.id !== me.id)) socket.emit('room:character', { character: c.id }); };
  const status = (m: RoomView['members'][number]) => (!m.connected ? 'off' : m.ready ? 'ready' : 'sel');
  const statusText = { off: 'Disconnected', ready: 'Ready', sel: 'Selecting…' } as const;
  const setting = (k: 'maxRounds' | 'privacy' | 'map', v: string) =>
    k === 'maxRounds' ? socket.emit('room:settings', { maxRounds: +v }) : socket.emit('room:prefs', { [k]: v });

  return (
    <main className="lb" onClick={() => setMenu(null)}>
      <header className="lb-top">
        <div className="lb-logo"><Crest className="lb-crest" /><span><small>Empire of</small><b>Assassins</b></span></div>
        <nav className="lb-nav" aria-label="Main">
          <span className="on"><span className="ring"><Crest className="ic" /></span>Lobby</span>
          <span className="off"><IconUserSm />Profile</span>
          <span className="off"><span className="ring"><IconCrown size={11} /></span>Leaderboard</span>
          <span className="off"><IconGear size={16} />Settings</span>
        </nav>
        <button className="lb-leave" onClick={onLeave}><IconExit />Leave Room</button>
      </header>

      <section className="lb-info">
        <button className="lb-chip code" onClick={() => copy(view.code, 'code')} title="Copy room code">
          <span className="lbl">◆ Room Code</span><b>{view.code}</b><span className="cp" aria-label="Copy"><IconCopy size={15} /></span>
          {copied === 'code' && <i className="tip">Copied</i>}
        </button>
        <div className="lb-chip"><span className="lbl">Round Limit</span><span className="val"><IconClock size={15} />{view.maxRounds} rounds</span></div>
        <div className="lb-chip"><span className="lbl">Room Privacy</span><span className="val"><IconLock />{view.privacy === 'public' ? 'Public' : 'Private'}</span></div>
        <div className="lb-map" style={{ backgroundImage: `url(${map.img})` }}><span><small>Map</small><b><IconShuffle />{map.label}</b></span></div>
      </section>

      <section className="lb-slots" aria-label="Players">
        {[0, 1, 2, 3].map((i) => {
          const m = view.members[i];
          if (!m) return (
            isHost && !view.game
              ? <button key={i} className="lb-slot empty add" onClick={(e) => { e.stopPropagation(); setAdding(true); }}><span className="plus">+</span><small>Waiting for player</small><em>Add PC Opponent</em></button>
              : <div key={i} className="lb-slot empty"><span className="plus">+</span><small>Waiting for player</small></div>
          );
          const ch = byId(m.character);
          return (
            <div key={m.id} role="button" tabIndex={ch ? 0 : -1} aria-label={ch ? `View ${ch.name}` : undefined} onClick={() => ch && setInfo(ch.id)} onKeyDown={(e) => ch && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setInfo(ch.id))} className={`lb-slot ${m.id === me.id ? 'me' : ''} ${ch ? '' : 'nochar'}`}>
              <span className="ph">{ch ? <CharPortrait c={ch} crop="card" /> : <span className="q">?</span>}</span>
              {m.id === view.hostId && <span className="crown"><IconCrown size={18} /></span>}
              <b>{m.name}{m.id === view.hostId && <em>Host</em>}{m.bot && <em>PC</em>}</b>
              <small>{ch?.name ?? 'No assassin yet'}</small>
              <span className={`st ${status(m)}`}><i />{statusText[status(m)]}</span>
            </div>
          );
        })}
      </section>

      <aside className="lb-players" aria-label="Player list">
        <h2>Players ({view.members.length}/4)</h2>
        <ul>
          {view.members.map((m) => {
            const ch = byId(m.character);
            const canKick = isHost && m.id !== me.id && (m.bot || !m.connected);
            return (
              <li key={m.id} className={ch ? 'click' : ''} onClick={() => ch && setInfo(ch.id)}>
                <span className="av">{ch && <CharPortrait c={ch} crop="avatar" />}</span>
                <span className="nm"><b>{m.name}{m.id === view.hostId && <em>Host</em>}</b><small>{ch?.name ?? '—'}</small></span>
                {m.id === view.hostId && <span className="crown"><IconCrown size={14} /></span>}
                <span className={`st ${status(m)}`}><i />{statusText[status(m)]}</span>
                <span className="more">
                  <button aria-label={`Options for ${m.name}`} disabled={!canKick} onClick={(e) => { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); }}>⋮</button>
                  {menu === m.id && <span className="pop"><button onClick={() => socket.emit('room:kick', { id: m.id })}>Remove {m.bot ? 'PC' : 'player'}</button></span>}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="lb-invite">
          {isHost && view.members.length < 4 && <button className="ghost" onClick={(e) => { e.stopPropagation(); setAdding(true); }}><IconCpu />Add PC Player</button>}
          <button onClick={() => copy(`Join my Empire of Assassins room: ${view.code} at ${location.origin}`, 'invite')}><IconInvite />{copied === 'invite' ? 'Invite copied' : 'Invite Players'}</button>
        </div>
      </aside>

      <section className="lb-choose">
        <div className="lb-choose-head">
          <h2><Crest className="ic" />Choose Your Assassin<span className="dia">◆</span></h2>
          <div className="lb-filters" role="tablist">
            {([['all', 'All'], ['Legendary', 'Legendary'], ['Epic', 'Epic'], ['fav', 'Favorites']] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <label className="lb-search"><IconSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assassin..." aria-label="Search assassin" /></label>
        </div>
        <div className="lb-cards-wrap">
          <button className="lb-arrow" onClick={() => track.current?.scrollBy({ left: -300, behavior: 'smooth' })} aria-label="Previous"><IconChevron size={16} dir="left" /></button>
          <div className="lb-cards" ref={track} role="radiogroup" aria-label="Assassin">
            {list.length === 0 && <p className="lb-none">{filter === 'fav' ? 'No favorites yet. Double-click a card to add one.' : 'No assassin found.'}</p>}
            {list.map((c) => {
              const taken = view.members.find((m) => m.character === c.id && m.id !== me.id);
              const mine = me.character === c.id;
              return (
                <button key={c.id} role="radio" aria-checked={mine} disabled={!!taken}
                  className={`lb-card ${mine ? 'on' : ''} ${taken ? 'taken' : ''}`} onClick={() => pick(c)}
                  onDoubleClick={() => setFavs((f) => (f.includes(c.id) ? f.filter((x) => x !== c.id) : [...f, c.id]))}
                  title={taken ? `Taken by ${taken.name}` : 'Click to choose · double-click to favorite'}>
                  <span className="ph"><CharPortrait c={c} crop="card" /></span>
                  {favs.includes(c.id) && <span className="fav" aria-label="Favorite">★</span>}
                  {taken && <span className="tk">{taken.name}</span>}
                  <b>{c.name.replace(/^Alta.r.*/, 'Altaïr')}</b>
                  <small>{ERA[c.id] ?? c.info.family}</small>
                  <span className="badge"><Crest className="ic" /></span>
                </button>
              );
            })}
          </div>
          <button className="lb-arrow" onClick={() => track.current?.scrollBy({ left: 300, behavior: 'smooth' })} aria-label="Next"><IconChevron size={16} /></button>
        </div>
      </section>

      <section className="lb-chat">
        <div className="lb-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'chat'} className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>Lobby Chat</button>
          <button role="tab" aria-selected={tab === 'system'} className={tab === 'system' ? 'on' : ''} onClick={() => setTab('system')}>System</button>
        </div>
        <div className="lb-log" ref={log} aria-live="polite">
          {lines.map((l, i) => <p key={i} className={l.from ? 'u' : 's'}>{l.from ? <b>{l.from}:</b> : <span>[System]</span>} {l.text}</p>)}
        </div>
        <form className="lb-send" onSubmit={send}>
          <input value={msg} maxLength={200} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message..." aria-label="Chat message" />
          <button type="submit" aria-label="Send">➤</button>
        </form>
      </section>

      <section className="lb-settings">
        <h2><IconGear size={16} />Game Settings</h2>
        <div className="lb-set-row">
          <label><span>Round Limit</span>
            <select value={view.maxRounds} disabled={!isHost} onChange={(e) => setting('maxRounds', e.target.value)}>
              {[10, 15, 20, 25, 30, 40].map((n) => <option key={n} value={n}>{n} rounds</option>)}
            </select></label>
          <label><span>Map</span>
            <select value={view.map} disabled={!isHost} onChange={(e) => setting('map', e.target.value)}>
              {Object.entries(MAPS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></label>
          <label><span>Room Privacy</span>
            <select value={view.privacy} disabled={!isHost} onChange={(e) => setting('privacy', e.target.value)}>
              <option value="public">Public</option><option value="private">Private</option>
            </select></label>
        </div>
        <div className="lb-actions">
          <button className={`lb-ready ${me.ready ? 'on' : ''}`} disabled={!me.character} onClick={() => socket.emit('room:ready', { ready: !me.ready })}>
            {me.ready ? '✓ Ready' : me.character ? 'Ready Up' : 'Pick an assassin'}
          </button>
          {isHost
            ? <button className="lb-start" disabled={!canStart} onClick={start} title={canStart ? '' : 'Needs 2–4 players, all ready'}><span className="tri">▶</span>Start Match</button>
            : <span className="lb-wait">Waiting for host to start…</span>}
        </div>
        {err && <p className="lb-err" role="alert">{err}</p>}
      </section>
      {adding && view.members.length < 4 && (
        <div className="lb-pick-back" onClick={() => setAdding(false)}>
          <div className="lb-pick" role="dialog" aria-modal="true" aria-label="Add PC opponent" onClick={(e) => e.stopPropagation()}>
            <h2>Add PC Opponent</h2>
            <p>Choose which assassin the PC plays. Taken assassins are greyed out.</p>
            <div className="lb-pick-grid">
              {PICKS.map((c) => {
                const taken = view.members.find((m) => m.character === c.id);
                return (
                  <button key={c.id} className="lb-card" disabled={!!taken} title={taken ? `Taken by ${taken.name}` : `Add PC as ${c.name}`}
                    onClick={() => { socket.emit('room:addBot', { character: c.id }); setAdding(false); }}>
                    <span className="ph" style={taken ? { filter: 'grayscale(1)', opacity: .4 } : undefined}><CharPortrait c={c} crop="card" /></span>
                    <b>{c.name}</b><small>{taken ? `Taken · ${taken.name}` : ERA[c.id]}</small>
                  </button>
                );
              })}
            </div>
            <div className="lb-pick-foot">
              <button onClick={() => { socket.emit('room:addBot'); setAdding(false); }}>Random Assassin</button>
              <button onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {info && byId(info) && (() => {
        const c = byId(info)!; const taken = view.members.find((m) => m.character === c.id && m.id !== me.id);
        return <CharacterDetailsModal c={c} onClose={() => setInfo(null)}
          onSelect={() => { pick(c); setInfo(null); }} selectDisabled={!!taken || me.character === c.id}
          selectLabel={me.character === c.id ? 'Your Assassin' : taken ? `Taken by ${taken.name}` : `Choose ${c.name}`} />;
      })()}
    </main>
  );
}

const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true } as const;
const IconUserSm = () => <svg {...sv} width="16" height="16"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>;
const IconExit = () => <svg {...sv} width="18" height="18"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" /></svg>;
const IconLock = () => <svg {...sv} width="15" height="15"><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
const IconShuffle = () => <svg {...sv} width="15" height="15"><path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3" /></svg>;
const IconSearch = () => <svg {...sv} width="15" height="15"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>;
const IconInvite = () => <svg {...sv} width="18" height="18"><circle cx="10" cy="8" r="4" /><path d="M3 21c1-4 3.5-6 7-6s6 2 7 6M19 8v6M16 11h6" /></svg>;
const IconCpu = () => <svg {...sv} width="16" height="16"><rect x="6" y="6" width="12" height="12" rx="1" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></svg>;
