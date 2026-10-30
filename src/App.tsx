import { useEffect, useState, ReactNode } from 'react';
import { socket, emit, session } from './net';
import type { RoomView } from '../shared/protocol';
import { CHARACTERS } from '../shared/data';
import { Insignia, Portrait, CharacterArt } from './art';
import Game from './Game';
import Home from './home/Home';
import { CharacterSection } from './characters/CharacterSection';
import { LobbyPage } from './lobby/LobbyPage';
import { BgMusic } from './BgMusic';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal parchment ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function HowToPlay() {
  return (
    <div className="howto">
      <p>2–4 Assassins travel clockwise through the Animus across ten historical eras. Everyone starts with 1,500 Animus Credits (AC).</p>
      <h3>Your turn</h3>
      <ul>
        <li>Roll two dice and move. Doubles grant another roll; three doubles in a row desynchronize you.</li>
        <li>Unowned location: buy it, or decline and it goes to auction among all players.</li>
        <li>Rival location: pay rent. Owning a full color group doubles rent.</li>
        <li>Passing the Animus Hub pays 200 AC.</li>
      </ul>
      <h3>Brotherhood upgrades</h3>
      <p>With a full color group, build Hideout → Brotherhood Bureau → Headquarters. Rent multiplies ×3, ×6, ×10. The Brotherhood Bureau space halves your next upgrade that turn.</p>
      <h3>Spaces</h3>
      <ul>
        <li>Animus Event, Templar Conspiracy and Piece of Eden draw cards with real effects.</li>
        <li>Mission Briefing grants a secret mission (max 3). Missions pay rewards when completed.</li>
        <li>Templar Arrest sends you to Desynchronization. Escape with doubles, pay 50 AC, or wait 3 turns.</li>
      </ul>
      <h3>Debt and victory</h3>
      <p>If you cannot pay, mortgage properties (half price) or sell upgrades (half cost), then settle. Otherwise you go bankrupt. The last solvent Assassin wins, or the highest net worth when the round limit is reached.</p>
    </div>
  );
}

function Credits() {
  return (
    <div className="howto">
      <p><b>Empire of Assassins</b> is a fan-made, non-commercial board game inspired by the Assassin's Creed franchise.</p>
      <p>Assassin's Creed and its characters are trademarks of Ubisoft Entertainment. This project is not affiliated with or endorsed by Ubisoft. All artwork here is original SVG drawn in code; all game rules and abilities are original designs.</p>
      <p>Names and content live in <code>shared/data.ts</code> so they can be replaced with original or licensed material for any public release.</p>
      <p>Location photos are loaded live from Wikipedia / Wikimedia Commons and remain under their authors' free licenses (CC BY-SA and similar). Open any property and follow the photo link for author and license details.</p>
      <p>Fonts: Cinzel and EB Garamond (SIL Open Font License) via Google Fonts.</p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<RoomView | null>(null);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onState = (v: RoomView) => setView(v);
    const onConnect = async () => {
      setConnected(true);
      const s = session.get();
      if (s) {
        const r = await emit('room:resume', s);
        if (!r.ok) { session.clear(); setView(null); }
      }
    };
    const onDisconnect = () => setConnected(false);
    socket.on('room:state', onState);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    return () => { socket.off('room:state', onState); socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, []);

  function leaveRoom() {
    socket.emit('room:leave');
    session.clear();
    setView(null);
    history.replaceState(null, '', '/');
  }

  const banner = !connected && (
    <div className="banner" role="status">Connection to the Animus lost. Reconnecting…</div>
  );

  const music = <BgMusic />;
  if (view?.game) return <>{banner}{music}<GamePage view={view} onLeave={leaveRoom} /></>;
  if (view) return <>{banner}{music}<LobbyPage view={view} onLeave={leaveRoom} /></>;

  return <>{banner}{music}<Home connected={connected} credits={<Credits />} /></>;
}

export function LegacyLobby({ view, onLeave }: { view: RoomView; onLeave: () => void }) {
  const me = view.members.find((m) => m.id === view.youId)!;
  const isHost = view.hostId === view.youId;
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const canStart = view.members.length >= 2 && view.members.every((m) => m.ready && m.character && m.connected);

  async function start() {
    setErr('');
    const r = await emit('room:start');
    if (!r.ok) setErr(r.error ?? 'Could not start.');
  }
  function copy() {
    navigator.clipboard?.writeText(view.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div><Insignia size={40} /></div>
        <div>
          <p className="muted small">Private room code</p>
          <button className="room-code" onClick={copy} title="Copy invite code">{view.code}<span>{copied ? 'Copied' : 'Copy'}</span></button>
        </div>
        <button className="btn ghost" onClick={onLeave}>Leave</button>
      </header>

      <section className="slots">
        {[0, 1, 2, 3].map((i) => {
          const m = view.members[i];
          const ch = CHARACTERS.find((c) => c.id === m?.character);
          return (
            <div key={i} className={`slot panel ${m ? '' : 'empty'}`}>
              {m ? (
                <>
                  {ch ? <CharacterArt id={ch.id} color={ch.color} size={64} label={ch.name} className="avatar" /> : <Portrait color="#555" size={64} />}
                  <div>
                    <b>{m.name}</b>{m.id === view.hostId && <span className="badge gold">Host</span>}{m.id === view.youId && <span className="badge">You</span>}{m.bot && <span className="badge blue">PC</span>}
                    {m.bot && isHost && <button className="link small" style={{ marginLeft: 8 }} onClick={() => socket.emit('room:kick', { id: m.id })}>Remove</button>}
                    <div className="muted small">{ch ? ch.name : 'Choosing…'}</div>
                    <div className={`small ${m.connected ? (m.ready ? 'ok' : 'muted') : 'error'}`}>{!m.connected ? 'Disconnected' : m.ready ? 'Ready' : 'Not ready'}</div>
                  </div>
                </>
              ) : isHost
                ? <button className="btn small" onClick={() => socket.emit('room:addBot')}>+ Add PC player</button>
                : <span className="muted">Waiting for Assassin…</span>}
            </div>
          );
        })}
      </section>

      <p className="muted small">Choose your Assassin: open a card and press “Choose this Assassin”. Each character can only be taken by one player.</p>
      <CharacterSection compact
        stateFor={(c) => {
          const takenBy = view.members.find((m) => m.character === c.id && m.id !== me.id);
          if (takenBy) return { takenBy: takenBy.name };
          if (me.character === c.id) return { selected: true, mine: true };
          return undefined;
        }}
        canSelect={(c) => !view.members.some((m) => m.character === c.id)}
        onSelect={(c) => socket.emit('room:character', { character: c.id })} />

      <footer className="lobby-foot panel">
        <label className="field inline">
          <span>Round limit</span>
          <select value={view.maxRounds} disabled={!isHost} onChange={(e) => socket.emit('room:settings', { maxRounds: +e.target.value })}>
            {[10, 15, 20, 25, 30, 40].map((n) => <option key={n} value={n}>{n} rounds</option>)}
          </select>
        </label>
        <button className={`btn ${me.ready ? '' : 'primary'}`} disabled={!me.character} onClick={() => socket.emit('room:ready', { ready: !me.ready })}>
          {me.ready ? 'Not ready' : me.character ? 'Ready' : 'Pick a character'}
        </button>
        {isHost ? (
          <button className="btn primary" disabled={!canStart} onClick={start}>Start Match</button>
        ) : <span className="muted">Waiting for host to start…</span>}
        {isHost && view.members.filter((m) => !m.connected).map((m) => (
          <button key={m.id} className="btn ghost" onClick={() => socket.emit('room:kick', { id: m.id })}>Remove {m.name}</button>
        ))}
        {err && <p className="error">{err}</p>}
        {!canStart && isHost && <p className="muted small">Needs 2–4 connected players, each with a character and ready.</p>}
      </footer>
    </div>
  );
}

/** The match is its own page at /game (the lobby lives at /lobby). */
function GamePage({ view, onLeave }: { view: RoomView; onLeave: () => void }) {
  useEffect(() => {
    if (location.pathname !== '/game') history.pushState(null, '', '/game');
    document.title = `Match ${view.code} · Empire of Assassins`;
    window.scrollTo(0, 0);
    return () => { document.title = 'Empire of Assassins'; };
  }, [view.code]);
  return <Game view={view} onLeave={onLeave} />;
}
