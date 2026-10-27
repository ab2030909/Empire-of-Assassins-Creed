import { useEffect, useRef, useState } from 'react';
import type { RoomView } from '../shared/protocol';
import {
  BOARD, GROUPS, CHARACTERS, MISSIONS, UPGRADE_NAMES, RENT_MULT, EIVOR_MAX_PRICE, JAIL_FINE, baseRent, charById,
} from '../shared/data';
import {
  GameState, PlayerState, Action, rentFor, ownsFullGroup, abilityReady, abilityCooldownLeft, netWorth, upgradeCost, unmortgageCost,
} from '../shared/engine';
import { act, socket } from './net';
import { Die, SpaceGlyph, Insignia, CharacterArt } from './art';
import { CharacterCard } from './CharacterCard';
import { Modal, HowToPlay } from './App';
import { usePhoto, wikiUrl } from './photos';
import Board3D from './game3d/Board3D';
import { characterById } from './characters/characterData';
import { CharPortrait } from './characters/Portrait';
import './game3d/game3d.css';
import { FigurineCard } from './game3d/FigurineCard';

const HAS_WEBGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();

const N = BOARD.length; // 32
const SIDE = N / 4; // 8
function gridPos(i: number): { row: number; col: number } {
  const L = SIDE; // grid is (SIDE+1) x (SIDE+1)
  if (i <= L) return { row: L, col: L - i };
  if (i <= 2 * L) return { row: L - (i - L), col: 0 };
  if (i <= 3 * L) return { row: 0, col: i - 2 * L };
  return { row: i - 3 * L, col: L };
}
const TRACK = `1.55fr repeat(${SIDE - 1}, 1fr) 1.55fr`;

function Tile({ id, g, selected, active, ownerColor, ownerName, currentId, onClick }: {
  id: number; g: GameState; selected: boolean; active: boolean; ownerColor: string; ownerName: string; currentId: string; onClick: () => void;
}) {
  const s = BOARD[id];
  const { row, col } = gridPos(id);
  const pr = g.props[id];
  const grp = s.group ? GROUPS[s.group] : null;
  const photo = usePhoto(s.wiki, 240);
  const here = g.players.filter((p) => !p.bankrupt && p.position === id);
  const side = sideOf(id);
  return (
    <button className={`tile ${side} kind-${s.kind} ${selected ? 'sel' : ''} ${active ? 'active' : ''} ${pr?.owner ? 'owned' : ''}`}
      style={{ gridRow: row + 1, gridColumn: col + 1, ['--grp' as string]: grp?.color ?? 'transparent', ['--own' as string]: pr?.owner ? ownerColor : 'transparent' }}
      onClick={onClick} aria-label={`${s.name}${pr?.owner ? `, owned by ${ownerName}` : ''}`}>
      <div className={`tile-face side-${side}`}>
        {grp && <div className="band" />}
        <div className={s.kind === 'property' ? 'photo' : 'glyph'} style={photo ? { backgroundImage: `url("${photo}")` } : undefined}>
          {s.kind === 'property' && !photo && <div className="photo-fallback" />}
          {s.kind !== 'property' && <SpaceGlyph kind={s.kind} size={id % SIDE === 0 ? 40 : 24} />}
          <div className="label">
            <div className="tname">{s.name}</div>
            {s.price && <div className="tprice">{s.price} AC</div>}
            {s.kind === 'tax' && <div className="tprice">−{s.amount} AC</div>}
          </div>
        </div>
        {pr && pr.level > 0 && <div className="pips">{Array.from({ length: pr.level }, (_, i) => <i key={i} />)}</div>}
        {pr?.mortgaged && <div className="mort">Mortgaged</div>}
        {pr?.owner && <div className="owner-flag" title={`Owned by ${ownerName}`} />}
      </div>
      <div className="tokens">
        {here.map((p, i) => (
          <span key={p.id} className={`pawn ${p.id === currentId ? 'cur' : ''}`} style={{ ['--pc' as string]: p.color, ['--i' as string]: i }} title={p.name}>
            <i className="head" /><i className="body" />
          </span>
        ))}
      </div>
    </button>
  );
}

function sideOf(i: number) { return i % SIDE === 0 ? 'corner' : ['bottom', 'left', 'top', 'right'][Math.floor(i / SIDE)]; }

export default function Game({ view, onLeave }: { view: RoomView; onLeave: () => void }) {
  const live = view.game!;
  // UI waits for the 3D board: dice roll -> pawn walks -> then panels/cards/buttons update.
  const [settled, setSettled] = useState(live.rollSeq);
  const animating = HAS_WEBGL && live.rollSeq !== settled;
  const uiRef = useRef(live);
  if (!animating) uiRef.current = live;
  const g = animating ? uiRef.current : live;
  // safety net: never leave the UI frozen if the 3D board fails to report
  useEffect(() => { if (!animating) return; const t = setTimeout(() => setSettled(live.rollSeq), 8000); return () => clearTimeout(t); }, [animating, live.rollSeq]);
  const me = g.players.find((p) => p.id === view.youId) ?? null;
  const current = g.players[g.current];
  const myTurn = !!me && current.id === me.id && !me.bankrupt;
  const [selected, setSelected] = useState<number | null>(null);
  const [charView, setCharView] = useState<PlayerState | null>(null);
  const [figure, setFigure] = useState<string | null>(null); // player whose figurine card is open
  const [panel, setPanel] = useState(false); // phones: right-side panel as a drawer
  /** Phones: go fullscreen and lock to landscape where the browser allows it (Android Chrome; iOS needs a manual rotate). */
  async function goLandscape() {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* not allowed */ }
    try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'); } catch { /* not supported */ }
  }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [showCard, setShowCard] = useState<number | null>(null);
  const [tilt, setTilt] = useState(() => localStorage.getItem('eoa-tilt') !== 'off');
  useEffect(() => { localStorage.setItem('eoa-tilt', tilt ? 'on' : 'off'); }, [tilt]);

  useEffect(() => { if (g.card) setShowCard(g.card.seq); }, [g.card?.seq]);

  async function run(a: Action) {
    setError('');
    setBusy(true);
    const r = await act(a);
    setBusy(false);
    if (!r.ok) setError(r.error ?? 'Action rejected.');
  }

  const name = (id: string | null | undefined) => g.players.find((p) => p.id === id)?.name ?? 'Bank';
  const pcolor = (id: string | null | undefined) => g.players.find((p) => p.id === id)?.color ?? '#666';

  const modals = (
    <>
      {selected != null && <PropertyModal g={g} id={selected} me={me} myTurn={myTurn} run={run} name={name} onClose={() => setSelected(null)} />}
      {charView && <CharacterModal g={g} p={g.players.find((x) => x.id === charView.id)!} onClose={() => setCharView(null)} />}
      {help && <Modal title="How to Play" wide onClose={() => setHelp(false)}><HowToPlay /></Modal>}
      {confirmResign && (
        <Modal title="Resign the match?" onClose={() => setConfirmResign(false)}>
          <p>You will be declared bankrupt. Your properties return to the bank (or your creditor if you are in debt). This cannot be undone.</p>
          <div className="row gap"><button className="btn danger" onClick={() => { setConfirmResign(false); run({ type: 'bankrupt' }); }}>Declare bankruptcy</button><button className="btn" onClick={() => setConfirmResign(false)}>Cancel</button></div>
        </Modal>
      )}
      {g.phase === 'gameover' && <Victory g={g} view={view} onLeave={onLeave} />}
    </>
  );

  if (HAS_WEBGL) return (
    <div className={`g3 ${panel ? 'panel-open' : ''}`}>
      <div className="g3-rotate" role="alert">
        <div className="phone" aria-hidden="true" />
        <h2>Rotate your phone</h2>
        <p>Empire of Assassins plays in landscape.</p>
        <button onClick={goLandscape}>Play in Landscape</button>
      </div>
      <button className="g3-panel-btn" onClick={() => setPanel(!panel)} aria-expanded={panel} aria-label="Holdings and chronicle">{panel ? '✕' : '☰'}</button>
      <div className="g3-scene"><Board3D g={live} selected={selected} onSelect={setSelected} view3d={tilt} onSettled={setSettled} onPawn={(id) => setFigure(id)} /></div>

      <header className="g3-top">
        <div className="g3-logo"><Insignia size={34} color="#d9b25e" /><span><small>Empire of</small><b>Assassins</b></span></div>
        <div className="g3-round">
          <div className="box"><span>Round</span><b>{g.round}</b><span className="of">/ {g.maxRounds}</span></div>
          <div className="code">Room {view.code}</div>
        </div>
        <div className="g3-tools">
          <button onClick={() => setTilt(!tilt)}>{tilt ? 'Top View' : '3D View'}</button>
          <button className="ic" onClick={() => setHelp(true)} aria-label="Rules" title="Rules">?</button>
          {me && !me.bankrupt && g.phase !== 'gameover' && <button onClick={() => setConfirmResign(true)}>Resign</button>}
          <button className="leave" onClick={onLeave}>Leave Room</button>
        </div>
      </header>

      <aside className="g3-left" aria-label="Players">
        {g.players.map((p) => {
          const ch = characterById(p.character);
          const owned = Object.values(g.props).filter((x) => x.owner === p.id).length;
          const cur = p.id === current.id;
          return (
            <button key={p.id} className={`g3-player ${cur ? 'cur' : ''} ${p.bankrupt ? 'out' : ''}`} style={{ ['--pc' as string]: p.color }} onClick={() => setFigure(p.id)}>
              <span className="av">{ch && <CharPortrait c={ch} crop="avatar" />}</span>
              <span className="tx">
                <b><i className="dot" />{p.name}{p.id === me?.id && <em>You</em>}{cur && <span className="crown">♛</span>}</b>
                <small>{ch?.name}</small>
                <span className="cash">{p.cash.toLocaleString()} <small>AC</small></span>
                <small>{owned} prop{owned === 1 ? '' : 's'} · {p.missionCount} mission{p.missionCount === 1 ? '' : 's'}</small>
                <span className={`st ${p.bankrupt ? 'off' : !p.connected ? 'off' : cur ? 'think' : 'ok'}`}>
                  {p.bankrupt ? 'Bankrupt' : !p.connected ? 'Offline' : cur ? (p.id === me?.id ? 'Your turn' : 'Thinking…') : p.inJail ? 'Desynced' : 'Ready'}
                </span>
              </span>
            </button>
          );
        })}
        {view.hostId === view.youId && view.members.filter((m) => !m.connected && g.players.find((p) => p.id === m.id && !p.bankrupt)).map((m) => (
          <button key={m.id} className="btn ghost small" onClick={() => socket.emit('room:kick', { id: m.id })}>Remove disconnected {m.name}</button>
        ))}
      </aside>

      <aside className="g3-right">
        {me && <MyPanel g={g} me={me} myTurn={myTurn} run={run} onSelect={setSelected} />}
        <div className="panel log"><h3>Chronicle</h3><LogList g={g} /></div>
      </aside>

      <div className="g3-dock">
        <div className="g3-turn"><i style={{ background: current.color }} />{myTurn ? 'Your turn' : `${current.name}'s turn`} · {phaseLabel(g)}{g.dice && ` · rolled ${g.dice[0] + g.dice[1]}`}</div>
        {animating ? <p className="g3-wait">Rolling…</p> : <ActionPanel g={g} me={me} myTurn={myTurn} busy={busy} run={run} name={name} />}
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      {g.card && showCard === g.card.seq && (
        <div className={`event-card g3-card deck-${g.card.deck}`} role="status">
          <div className="deck-name">{g.card.deck === 'animus' ? 'Animus Event' : g.card.deck === 'eden' ? 'Piece of Eden' : 'Templar Conspiracy'}</div>
          <h3>{g.card.title}</h3>
          <p>{g.card.text}</p>
          <div className="small muted">Drawn by {name(g.card.player)}</div>
          <button className="btn small" onClick={() => setShowCard(null)}>Dismiss</button>
        </div>
      )}
      {figure && g.players.find((x) => x.id === figure) && (
        <FigurineCard g={g} p={g.players.find((x) => x.id === figure)!} isMe={figure === me?.id} onClose={() => setFigure(null)} />
      )}
      {modals}
    </div>
  );

  return (
    <div className="game">
      <aside className="col left">
        <div className="panel round-box">
          <div className="small muted">Round</div>
          <div className="big">{g.round}<span className="muted"> / {g.maxRounds}</span></div>
          <div className="small">Room <b>{view.code}</b></div>
        </div>
        {g.players.map((p) => <PlayerCard key={p.id} g={g} p={p} isCurrent={p.id === current.id} isMe={p.id === me?.id} onClick={() => setCharView(p)} />)}
        <div className="row gap">
          <button className="btn ghost small" onClick={() => setHelp(true)}>Rules</button>
          {me && !me.bankrupt && g.phase !== 'gameover' && <button className="btn ghost small" onClick={() => setConfirmResign(true)}>Resign</button>}
          <button className="btn ghost small" onClick={onLeave}>Leave</button>
        </div>
        {view.hostId === view.youId && view.members.filter((m) => !m.connected && g.players.find((p) => p.id === m.id && !p.bankrupt)).map((m) => (
          <button key={m.id} className="btn ghost small" onClick={() => socket.emit('room:kick', { id: m.id })}>Remove disconnected {m.name}</button>
        ))}
      </aside>

      <main className="board-wrap">
        <div className="board-tools">
          <button className="btn ghost small" onClick={() => setTilt(!tilt)}>{tilt ? 'Top view' : 'Tilted view'}</button>
        </div>
        {HAS_WEBGL ? (
          <div className="scene3d"><Board3D g={live} selected={selected} onSelect={setSelected} view3d={tilt} onSettled={setSettled} /></div>
        ) : (
        <div className={`scene ${tilt ? 'tilt' : ''}`}>
          <div className="board" style={{ gridTemplateColumns: TRACK, gridTemplateRows: TRACK }}>
            {BOARD.map((s) => (
              <Tile key={s.id} id={s.id} g={g} selected={selected === s.id} active={current.position === s.id}
                ownerColor={pcolor(g.props[s.id]?.owner)} ownerName={name(g.props[s.id]?.owner)} currentId={current.id} onClick={() => setSelected(s.id)} />
            ))}
            <div className="center" style={{ gridRow: `2 / ${SIDE + 1}`, gridColumn: `2 / ${SIDE + 1}` }}>
              <div className="center-emblem"><Insignia size={120} color="#c9a24a" /></div>
              <div className="center-title">Empire of Assassins</div>
              <div className="dice-row">
                {g.dice ? <><Die key={`a${g.rollSeq}`} value={g.dice[0]} rolling /><Die key={`b${g.rollSeq}`} value={g.dice[1]} rolling /></> : <span className="muted">Awaiting first roll</span>}
              </div>
            </div>
          </div>
        </div>
        )}
        <div className="hud">
          <div className="turn-ind" style={{ borderColor: current.color }}>
            <span className="dot" style={{ background: current.color }} /> {myTurn ? 'Your turn' : `${current.name}'s turn`} · <span className="muted">{phaseLabel(g)}</span>
            {g.dice && <span className="muted"> · rolled {g.dice[0] + g.dice[1]}</span>}
          </div>
          <ActionPanel g={g} me={me} myTurn={myTurn} busy={busy} run={run} name={name} />
          {error && <p className="error" role="alert">{error}</p>}
          {g.card && showCard === g.card.seq && (
            <div className={`event-card deck-${g.card.deck}`} role="status">
              <div className="deck-name">{g.card.deck === 'animus' ? 'Animus Event' : g.card.deck === 'eden' ? 'Piece of Eden' : 'Templar Conspiracy'}</div>
              <h3>{g.card.title}</h3>
              <p>{g.card.text}</p>
              <div className="small muted">Drawn by {name(g.card.player)}</div>
              <button className="btn small" onClick={() => setShowCard(null)}>Dismiss</button>
            </div>
          )}
        </div>
      </main>

      <aside className="col right">
        {me && <MyPanel g={g} me={me} myTurn={myTurn} run={run} onSelect={setSelected} />}
        <div className="panel log">
          <h3>Chronicle</h3>
          <LogList g={g} />
        </div>
      </aside>

      {selected != null && <PropertyModal g={g} id={selected} me={me} myTurn={myTurn} run={run} name={name} onClose={() => setSelected(null)} />}
      {charView && <CharacterModal g={g} p={g.players.find((x) => x.id === charView.id)!} onClose={() => setCharView(null)} />}
      {help && <Modal title="How to Play" wide onClose={() => setHelp(false)}><HowToPlay /></Modal>}
      {confirmResign && (
        <Modal title="Resign the match?" onClose={() => setConfirmResign(false)}>
          <p>You will be declared bankrupt. Your properties return to the bank (or your creditor if you are in debt). This cannot be undone.</p>
          <div className="row gap"><button className="btn danger" onClick={() => { setConfirmResign(false); run({ type: 'bankrupt' }); }}>Declare bankruptcy</button><button className="btn" onClick={() => setConfirmResign(false)}>Cancel</button></div>
        </Modal>
      )}
      {g.phase === 'gameover' && <Victory g={g} view={view} onLeave={onLeave} />}
    </div>
  );
}

function Photo({ wiki, big }: { wiki?: string; big?: boolean }) {
  const src = usePhoto(wiki, big ? 640 : 400);
  if (!wiki) return null;
  return (
    <figure className={`deed-photo ${big ? 'big' : ''}`}>
      {src ? <img src={src} alt={wiki.replace(/_/g, ' ')} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} /> : <div className="photo-fallback" />}
      {big && <figcaption><a href={wikiUrl(wiki)} target="_blank" rel="noreferrer">Photo: Wikimedia Commons via Wikipedia</a></figcaption>}
    </figure>
  );
}

function phaseLabel(g: GameState) {
  return ({ roll: 'rolling', buy: 'deciding purchase', rent: 'paying rent', auction: 'auction', debt: 'in debt', end: 'ending turn', gameover: 'match over' } as const)[g.phase];
}

function PlayerCard({ g, p, isCurrent, isMe, onClick }: { g: GameState; p: PlayerState; isCurrent: boolean; isMe: boolean; onClick: () => void }) {
  const ch = charById(p.character)!;
  const ready = abilityReady(g, p);
  const cd = abilityCooldownLeft(g, p);
  const owned = Object.values(g.props).filter((x) => x.owner === p.id).length;
  return (
    <button className={`player-card panel ${isCurrent ? 'current' : ''} ${p.bankrupt ? 'out' : ''}`} style={{ ['--pc' as string]: p.color }} onClick={onClick}>
      <CharacterArt id={ch.id} color={ch.color} size={60} label={ch.name} className="avatar" />
      <div className="pc-info">
        <div className="pc-name"><span className="dot" style={{ background: p.color }} />{p.name}{isMe && <span className="badge">You</span>}</div>
        <div className="small muted">{ch.name}</div>
        <div className="cash">{p.cash.toLocaleString()} <small>AC</small></div>
        <div className="small">
          {p.bankrupt ? <span className="error">Bankrupt</span> : <>
            {owned} props · {p.missionCount} mission{p.missionCount === 1 ? '' : 's'}
            {p.inJail && <span className="badge red">Desynced</span>}
            {p.shield > 0 && <span className="badge blue">Shield ×{p.shield}</span>}
            {!p.connected && <span className="badge red">Offline</span>}
          </>}
        </div>
        <div className={`small ability ${ready ? 'ok' : 'muted'}`}>{ch.ability.name}: {ch.ability.kind === 'passive' ? 'passive' : ready ? 'ready' : cd ? `${cd} round${cd > 1 ? 's' : ''}` : 'used this turn'}</div>
      </div>
    </button>
  );
}

function ActionPanel({ g, me, myTurn, busy, run, name }: { g: GameState; me: PlayerState | null; myTurn: boolean; busy: boolean; run: (a: Action) => void; name: (id: string | null) => string }) {
  const [bid, setBid] = useState(0);
  const cur = g.players[g.current];
  useEffect(() => { if (g.auction) setBid(Math.max(10, g.auction.high + 10)); }, [g.auction?.high, g.auction?.space]);

  if (g.phase === 'gameover') return null;
  if (!me || me.bankrupt) return <div className="actions"><p className="muted">You are spectating.</p></div>;

  if (g.phase === 'auction' && g.auction) {
    const a = g.auction;
    const s = BOARD[a.space];
    const out = a.out.includes(me.id);
    return (
      <div className="actions">
        <div className="small muted">Auction</div>
        <h3>{s.name} <span className="muted small">list {s.price} AC</span></h3>
        <p>High bid: <b>{a.high} AC</b> {a.bidder && `by ${name(a.bidder)}`}</p>
        {out ? <p className="muted">You withdrew. Waiting for others…</p> : (
          <>
            <div className="row gap center-row">
              {[10, 50, 100].map((inc) => <button key={inc} className="btn small" disabled={busy || a.high + inc > me.cash} onClick={() => run({ type: 'bid', amount: a.high + inc })}>+{inc}</button>)}
            </div>
            <div className="row gap center-row">
              <input type="number" aria-label="Bid amount" min={a.high + 1} max={me.cash} value={bid} onChange={(e) => setBid(+e.target.value)} />
              <button className="btn primary" disabled={busy} onClick={() => run({ type: 'bid', amount: bid })}>Bid</button>
              <button className="btn" disabled={busy || a.bidder === me.id} onClick={() => run({ type: 'pass' })}>Withdraw</button>
            </div>
            {a.bidder === me.id && <p className="small ok">You hold the high bid.</p>}
          </>
        )}
      </div>
    );
  }

  if (!myTurn) return <div className="actions"><p className="muted">Waiting for {cur.name}…</p></div>;

  switch (g.phase) {
    case 'roll':
      return (
        <div className="actions">
          {me.inJail && <p className="small">Desynchronized ({me.jailTurns}/3 turns). Roll doubles to escape or pay {JAIL_FINE} AC.</p>}
          <div className="row gap center-row">
            <button className="btn primary big-btn" disabled={busy} onClick={() => run({ type: 'roll' })}>Roll Dice</button>
            {me.inJail && <button className="btn" disabled={busy || me.cash < JAIL_FINE} onClick={() => run({ type: 'payFine' })}>Pay {JAIL_FINE} AC</button>}
          </div>
        </div>
      );
    case 'buy': {
      const s = BOARD[g.pendingBuy!];
      const grp = GROUPS[s.group!];
      const raidOk = me.character === 'eivor' && abilityReady(g, me) && s.price! <= EIVOR_MAX_PRICE;
      const raidPrice = Math.floor(s.price! * 0.8);
      return (
        <div className="actions">
          <div className="deed-mini" style={{ borderTopColor: grp.color }}>
            <Photo wiki={s.wiki} />
            <div className="small muted">{grp.name} · {grp.era}</div>
            <h3>{s.name}</h3>
            <p className="small">Price <b>{s.price} AC</b> · Base rent {baseRent(s.price!)} AC · You have {me.cash} AC</p>
            <p className="small muted">After purchase: {me.cash - s.price!} AC. Declining sends it to auction.</p>
          </div>
          <div className="row gap center-row">
            <button className="btn primary" disabled={busy || me.cash < s.price!} onClick={() => run({ type: 'buy' })}>Buy for {s.price}</button>
            {raidOk && <button className="btn gold" disabled={busy || me.cash < raidPrice} onClick={() => run({ type: 'buy', useAbility: true })}>Raid: buy for {raidPrice}</button>}
            <button className="btn" disabled={busy} onClick={() => run({ type: 'decline' })}>Auction</button>
          </div>
        </div>
      );
    }
    case 'rent': {
      const r = g.pendingRent!;
      return (
        <div className="actions">
          <p>Rent due at <b>{BOARD[r.space].name}</b> to {name(r.owner)}: <b>{r.amount} AC</b></p>
          <div className="row gap center-row">
            <button className="btn" disabled={busy} onClick={() => run({ type: 'payRent' })}>Pay {r.amount}</button>
            <button className="btn gold" disabled={busy} onClick={() => run({ type: 'payRent', useAbility: true })}>Requiescat: pay {Math.floor(r.amount / 2)}</button>
          </div>
        </div>
      );
    }
    case 'debt': {
      const d = g.debt!;
      return (
        <div className="actions debt">
          <p>You owe <b>{d.amount} AC</b> to {d.to ? name(d.to) : 'the bank'} ({d.reason}). Cash: {me.cash} AC.</p>
          <p className="small muted">Mortgage properties or sell upgrades from your portfolio, then settle.</p>
          <div className="row gap center-row">
            <button className="btn primary" disabled={busy || me.cash < d.amount} onClick={() => run({ type: 'payDebt' })}>Settle debt</button>
            <button className="btn danger" disabled={busy} onClick={() => run({ type: 'bankrupt' })}>Declare bankruptcy</button>
          </div>
        </div>
      );
    }
    case 'end':
      return (
        <div className="actions">
          <p className="small muted">Build, mortgage or manage your holdings, then end your turn.</p>
          <button className="btn primary big-btn" disabled={busy} onClick={() => run({ type: 'endTurn' })}>End Turn</button>
        </div>
      );
  }
  return null;
}

function MyPanel({ g, me, myTurn, run, onSelect }: { g: GameState; me: PlayerState; myTurn: boolean; run: (a: Action) => void; onSelect: (id: number) => void }) {
  const owned = BOARD.filter((s) => g.props[s.id]?.owner === me.id);
  const ch = charById(me.character)!;
  return (
    <>
      <div className="panel mine">
        <h3>Your Holdings <span className="cash">{me.cash.toLocaleString()} AC</span></h3>
        <div className="small muted">Net worth {netWorth(g, me).toLocaleString()} AC{me.bureauDiscount && ' · Bureau discount active'}</div>
        {owned.length === 0 && <p className="muted small">No properties yet. Land on a location to buy it.</p>}
        <ul className="holdings">
          {owned.map((s) => {
            const pr = g.props[s.id];
            return (
              <li key={s.id} style={{ borderLeftColor: GROUPS[s.group!].color }}>
                <button className="link" onClick={() => onSelect(s.id)}>{s.name}</button>
                <span className="small muted">{pr.mortgaged ? 'mortgaged' : `${UPGRADE_NAMES[pr.level]} · rent ${rentFor(g, s.id)}`}</span>
                {myTurn && <PropButtons g={g} me={me} id={s.id} run={run} compact />}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="panel parchment missions">
        <h3>Secret Missions</h3>
        {me.missions.length === 0 && <p className="small">No active missions. Visit Mission Briefing.</p>}
        {me.missions.map((id) => { const m = MISSIONS.find((x) => x.id === id)!; return <div key={id} className="mission"><b>{m.title}</b><span>{m.text}</span><em>Reward {m.reward} AC</em></div>; })}
        {me.completedMissions.length > 0 && <p className="small">Completed: {me.completedMissions.length}</p>}
      </div>
      <div className="panel small-ability">
        <b>{ch.ability.name}</b> <span className="muted small">({ch.ability.kind})</span>
        <p className="small">{ch.ability.description}</p>
      </div>
    </>
  );
}

function PropButtons({ g, me, id, run, compact }: { g: GameState; me: PlayerState; id: number; run: (a: Action) => void; compact?: boolean }) {
  const s = BOARD[id];
  const pr = g.props[id];
  if (!pr || pr.owner !== me.id || g.phase === 'auction' || g.phase === 'gameover') return null;
  const full = ownsFullGroup(g, me.id, s.group!);
  const cost = upgradeCost(g, me, id);
  const debt = g.phase === 'debt';
  const cls = `btn ${compact ? 'tiny' : 'small'}`;
  return (
    <div className="row gap wrap">
      {!pr.mortgaged && pr.level < 3 && full && !debt && <button className={cls} disabled={me.cash < cost} onClick={() => run({ type: 'upgrade', space: id })}>Build {cost}</button>}
      {pr.level > 0 && <button className={cls} onClick={() => run({ type: 'sellUpgrade', space: id })}>Sell +{Math.floor(GROUPS[s.group!].upgradeCost / 2)}</button>}
      {!pr.mortgaged && pr.level === 0 && <button className={cls} onClick={() => run({ type: 'mortgage', space: id })}>Mortgage +{Math.floor(s.price! / 2)}</button>}
      {pr.mortgaged && !debt && <button className={cls} disabled={me.cash < unmortgageCost(id)} onClick={() => run({ type: 'unmortgage', space: id })}>Redeem {unmortgageCost(id)}</button>}
    </div>
  );
}

function PropertyModal({ g, id, me, myTurn, run, name, onClose }: { g: GameState; id: number; me: PlayerState | null; myTurn: boolean; run: (a: Action) => void; name: (id: string | null) => string; onClose: () => void }) {
  const s = BOARD[id];
  const pr = g.props[id];
  const here = g.players.filter((p) => !p.bankrupt && p.position === id);
  if (s.kind !== 'property') {
    const desc: Record<string, string> = {
      start: 'Collect 200 AC each time you pass or land here.',
      animus: 'Draw an Animus Event card: bonuses, movement, shields and missions.',
      conspiracy: 'Draw a Templar Conspiracy card: fines, freezes, restrictions and counter-missions. A shield blocks one.',
      eden: 'Draw a Piece of Eden artifact with a powerful effect.',
      mission: 'Receive a new secret mission (up to 3 at a time).',
      brotherhood: 'Your next Brotherhood upgrade this turn costs half.',
      tax: `Pay ${s.amount} AC to the bank.`,
      jail: `Desynchronization. Roll doubles, pay ${JAIL_FINE} AC, or wait 3 turns to leave.`,
      gotojail: 'Go directly to Desynchronization. No Start bonus.',
      sanctuary: 'Receive a 100 AC Brotherhood stipend.',
    };
    return (
      <Modal title={s.name} onClose={onClose}>
        <div className="row gap"><SpaceGlyph kind={s.kind} size={48} /><p>{desc[s.kind]}</p></div>
        {here.length > 0 && <p className="small">Here: {here.map((p) => p.name).join(', ')}</p>}
      </Modal>
    );
  }
  const grp = GROUPS[s.group!];
  const base = baseRent(s.price!);
  const full = pr.owner ? ownsFullGroup(g, pr.owner, s.group!) : false;
  const groupMembers = BOARD.filter((x) => x.group === s.group);
  return (
    <Modal title={s.name} onClose={onClose}>
      <div className="deed" style={{ borderTopColor: grp.color }}>
        <Photo wiki={s.wiki} big />
        <div className="small muted">{grp.name} · {grp.era}</div>
        <p className="italic">{s.subtitle}</p>
        <table className="rent-table">
          <tbody>
            <tr><td>Price</td><td>{s.price} AC</td></tr>
            <tr><td>Owner</td><td>{pr.owner ? name(pr.owner) : 'Unclaimed'}{pr.mortgaged && ' (mortgaged)'}</td></tr>
            <tr><td>Rent</td><td>{base} AC</td></tr>
            <tr><td>Full group</td><td>{base * 2} AC</td></tr>
            {[1, 2, 3].map((l) => <tr key={l} className={pr.level === l ? 'hl' : ''}><td>{UPGRADE_NAMES[l]}</td><td>{base * 2 * RENT_MULT[l]} AC</td></tr>)}
            <tr><td>Upgrade cost</td><td>{grp.upgradeCost} AC each</td></tr>
            <tr><td>Mortgage value</td><td>{Math.floor(s.price! / 2)} AC</td></tr>
            <tr><td>Current rent</td><td><b>{pr.owner ? rentFor(g, id) : '—'}</b>{full && ' (group bonus)'}</td></tr>
          </tbody>
        </table>
        <p className="small">Group: {groupMembers.map((x) => `${x.name}${g.props[x.id].owner ? ` (${name(g.props[x.id].owner)})` : ''}`).join(', ')}</p>
        {me && myTurn && <PropButtons g={g} me={me} id={id} run={run} />}
        {me && pr.owner === me.id && !full && <p className="small muted">Own every {grp.name} location to build upgrades.</p>}
      </div>
    </Modal>
  );
}

function CharacterModal({ g, p, onClose }: { g: GameState; p: PlayerState; onClose: () => void }) {
  const ch = CHARACTERS.find((c) => c.id === p.character)!;
  const ready = abilityReady(g, p);
  const cd = abilityCooldownLeft(g, p);
  return (
    <Modal title={`${p.name} — ${ch.name}`} onClose={onClose}>
      <div className="row gap char-modal">
        <CharacterCard c={ch} />
        <div>
          <p className={ready ? 'ok' : 'muted'}>{ch.ability.kind === 'passive' ? 'Always active' : ready ? 'Ready' : cd > 0 ? `Cooldown: ${cd} round(s)` : 'Used this turn'}</p>
          <p className="small">Cash {p.cash} AC · Net worth {netWorth(g, p)} AC · Position: {BOARD[p.position].name}</p>
          <p className="small">Missions held: {p.missionCount} · Completed: {p.completedMissions.length}{p.shield ? ` · Shields: ${p.shield}` : ''}</p>
        </div>
      </div>
    </Modal>
  );
}

function LogList({ g }: { g: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [g.log.length, g.seq]);
  return <div className="log-list" ref={ref} aria-live="polite">{g.log.map((l) => <div key={l.n}>{l.msg}</div>)}</div>;
}

function Victory({ g, view, onLeave }: { g: GameState; view: RoomView; onLeave: () => void }) {
  const w = g.players.find((p) => p.id === g.winner)!;
  const ch = charById(w.character)!;
  const isHost = view.hostId === view.youId;
  return (
    <div className="modal-back victory">
      <div className="modal parchment wide" role="dialog" aria-label="Victory">
        <div className="victory-head">
          <CharacterArt id={ch.id} color={ch.color} size={120} label={ch.name} className="avatar" />
          <div>
            <div className="muted">The Empire belongs to</div>
            <h1>{w.name}</h1>
            <div>{ch.name} · Net worth {g.standings?.[0].netWorth.toLocaleString()} AC</div>
          </div>
        </div>
        <table className="rent-table standings">
          <thead><tr><th>#</th><th>Assassin</th><th>Net worth</th><th>Cash</th><th>Portfolio</th></tr></thead>
          <tbody>
            {g.standings?.map((s, i) => {
              const p = g.players.find((x) => x.id === s.id)!;
              return <tr key={s.id}><td>{i + 1}</td><td>{p.name}{p.bankrupt && ' (bankrupt)'}</td><td>{s.netWorth}</td><td>{s.cash}</td><td className="small">{s.props.map((id) => BOARD[id].name).join(', ') || '—'}</td></tr>;
            })}
          </tbody>
        </table>
        <div className="row gap">
          {isHost ? <button className="btn primary" onClick={() => socket.emit('room:playAgain')}>Play Again</button> : <span className="muted">Waiting for host to start a new match…</span>}
          <button className="btn" onClick={onLeave}>Main Menu</button>
        </div>
      </div>
    </div>
  );
}
