// Pure, server-authoritative game rules. No UI or networking here.
import {
  BOARD, GROUPS, GroupId, CHARACTERS, ANIMUS_CARDS, CONSPIRACY_CARDS, EDEN_CARDS, MISSIONS, MAX_MISSIONS,
  START_CASH, START_BONUS, JAIL_FINE, RENT_MULT, UPGRADE_NAMES, EIVOR_MAX_PRICE, JACOB_GROUPS, baseRent, CardDef, Effect, MissionDef,
} from './data';

export type Rng = () => number;
export type Phase = 'roll' | 'buy' | 'rent' | 'auction' | 'debt' | 'end' | 'gameover';

export interface PlayerState {
  id: string;
  name: string;
  character: string;
  color: string;
  cash: number;
  position: number;
  bankrupt: boolean;
  connected: boolean;
  inJail: boolean;
  jailTurns: number;
  abilityLastRound: number; // Ezio / Bayek cooldown tracking
  abilityLastTurn: number;  // Eivor per-turn tracking
  shield: number;
  incomeBlockedUntil: number;
  restrictedUntil: number;
  bureauDiscount: boolean;
  missions: string[];
  missionCount: number;
  completedMissions: string[];
}

export interface PropState { owner: string | null; level: number; mortgaged: boolean }

export interface CardShown { deck: 'animus' | 'conspiracy' | 'eden'; title: string; text: string; player: string; seq: number }

export interface GameState {
  players: PlayerState[];
  props: Record<number, PropState>;
  current: number;
  phase: Phase;
  round: number;
  turnNo: number;
  maxRounds: number;
  doubles: number;
  extraRoll: boolean;
  dice: [number, number] | null;
  rollSeq: number;
  pendingBuy: number | null;
  pendingRent: { space: number; amount: number; owner: string } | null;
  auction: { space: number; high: number; bidder: string | null; out: string[] } | null;
  debt: { amount: number; to: string | null; reason: string } | null;
  card: CardShown | null;
  log: { n: number; msg: string }[];
  winner: string | null;
  standings: { id: string; netWorth: number; cash: number; props: number[] }[] | null;
  decks: { animus: string[]; conspiracy: string[]; eden: string[]; missions: string[] };
  seq: number;
}

export type Action =
  | { type: 'roll' }
  | { type: 'buy'; useAbility?: boolean }
  | { type: 'decline' }
  | { type: 'bid'; amount: number }
  | { type: 'pass' }
  | { type: 'payRent'; useAbility?: boolean }
  | { type: 'upgrade'; space: number }
  | { type: 'sellUpgrade'; space: number }
  | { type: 'mortgage'; space: number }
  | { type: 'unmortgage'; space: number }
  | { type: 'payDebt' }
  | { type: 'payFine' }
  | { type: 'endTurn' }
  | { type: 'bankrupt' };

const COLORS = ['#c9302c', '#d4a537', '#3a9bdc', '#4caf72'];

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(
  players: { id: string; name: string; character: string }[],
  maxRounds: number,
  rng: Rng,
): GameState {
  const props: Record<number, PropState> = {};
  for (const s of BOARD) if (s.kind === 'property') props[s.id] = { owner: null, level: 0, mortgaged: false };
  const g: GameState = {
    players: players.map((p, i) => ({
      id: p.id, name: p.name, character: p.character, color: COLORS[i % COLORS.length],
      cash: START_CASH, position: 0, bankrupt: false, connected: true, inJail: false, jailTurns: 0,
      abilityLastRound: -99, abilityLastTurn: -1, shield: 0, incomeBlockedUntil: 0, restrictedUntil: 0,
      bureauDiscount: false, missions: [], missionCount: 0, completedMissions: [],
    })),
    props, current: 0, phase: 'roll', round: 1, turnNo: 1, maxRounds,
    doubles: 0, extraRoll: false, dice: null, rollSeq: 0,
    pendingBuy: null, pendingRent: null, auction: null, debt: null, card: null,
    log: [], winner: null, standings: null,
    decks: {
      animus: shuffle(ANIMUS_CARDS.map((c) => c.id), rng),
      conspiracy: shuffle(CONSPIRACY_CARDS.map((c) => c.id), rng),
      eden: shuffle(EDEN_CARDS.map((c) => c.id), rng),
      missions: shuffle(MISSIONS.map((m) => m.id), rng),
    },
    seq: 0,
  };
  for (const p of g.players) giveMission(g, p, rng, true);
  log(g, `The Animus synchronizes. Round 1 begins. ${g.players[0].name} moves first.`);
  return g;
}

// ---------- helpers ----------
function log(g: GameState, msg: string) {
  g.log.push({ n: ++g.seq, msg });
  if (g.log.length > 120) g.log.splice(0, g.log.length - 120);
}
const P = (g: GameState, id: string) => g.players.find((p) => p.id === id)!;
const cur = (g: GameState) => g.players[g.current];
const alive = (g: GameState) => g.players.filter((p) => !p.bankrupt);
export const space = (i: number) => BOARD[i];

export function groupSpaces(group: GroupId) {
  return BOARD.filter((s) => s.group === group).map((s) => s.id);
}
export function ownsFullGroup(g: GameState, pid: string, group: GroupId) {
  return groupSpaces(group).every((id) => g.props[id].owner === pid);
}
export function rentFor(g: GameState, spaceId: number): number {
  const s = BOARD[spaceId];
  const pr = g.props[spaceId];
  if (!pr || !pr.owner || pr.mortgaged) return 0;
  const full = ownsFullGroup(g, pr.owner, s.group!);
  const rent = baseRent(s.price!) * (full ? 2 : 1) * RENT_MULT[pr.level];
  const owner = g.players.find((p) => p.id === pr.owner);
  return owner?.character === 'jacob' && JACOB_GROUPS.includes(s.group!) ? Math.round(rent * 1.25) : rent;
}
export function abilityReady(g: GameState, p: PlayerState): boolean {
  const def = CHARACTERS.find((c) => c.id === p.character);
  if (!def) return false;
  if (p.character === 'eivor') return p.abilityLastTurn !== g.turnNo;
  if (def.ability.kind === 'passive') return true;
  return g.round - p.abilityLastRound >= def.ability.cooldownRounds;
}
export function abilityCooldownLeft(g: GameState, p: PlayerState): number {
  const def = CHARACTERS.find((c) => c.id === p.character);
  if (!def || def.ability.kind === 'passive' || p.character === 'eivor') return 0;
  return Math.max(0, def.ability.cooldownRounds - (g.round - p.abilityLastRound));
}
export function netWorth(g: GameState, p: PlayerState): number {
  let w = p.cash;
  for (const [k, pr] of Object.entries(g.props)) {
    if (pr.owner !== p.id) continue;
    const s = BOARD[+k];
    w += pr.mortgaged ? Math.floor(s.price! / 2) : s.price!;
    w += pr.level * GROUPS[s.group!].upgradeCost;
  }
  if (g.debt && cur(g).id === p.id) w -= g.debt.amount;
  return w;
}
export function upgradeCost(g: GameState, p: PlayerState, spaceId: number) {
  const base = GROUPS[BOARD[spaceId].group!].upgradeCost;
  return p.bureauDiscount ? Math.floor(base / 2) : base;
}
export const unmortgageCost = (spaceId: number) => Math.ceil(BOARD[spaceId].price! * 0.55);

function incomeBlocked(g: GameState, p: PlayerState) { return g.round <= p.incomeBlockedUntil; }

function gain(g: GameState, p: PlayerState, amount: number, why: string) {
  if (incomeBlocked(g, p)) { log(g, `${p.name}'s accounts are frozen: ${why} (${amount} AC) withheld.`); return; }
  p.cash += amount;
  log(g, `${p.name} receives ${amount} AC (${why}).`);
}

/** Attempt payment by the current player. Returns false and enters debt phase if funds are short. */
function pay(g: GameState, p: PlayerState, to: PlayerState | null, amount: number, reason: string): boolean {
  if (amount <= 0) return true;
  if (p.cash >= amount) {
    p.cash -= amount;
    if (to) to.cash += amount;
    log(g, `${p.name} pays ${amount} AC ${to ? `to ${to.name}` : 'to the bank'} (${reason}).`);
    return true;
  }
  g.debt = { amount, to: to ? to.id : null, reason };
  g.phase = 'debt';
  log(g, `${p.name} owes ${amount} AC (${reason}) but has only ${p.cash} AC. Raise funds or declare bankruptcy.`);
  return false;
}

function giveMission(g: GameState, p: PlayerState, _rng: Rng, silent = false) {
  if (p.missions.length >= MAX_MISSIONS) { if (!silent) log(g, `${p.name} already holds the maximum number of missions.`); return; }
  const taken = new Set(g.players.flatMap((q) => [...q.missions, ...q.completedMissions.filter(() => q.id === p.id)]));
  const idx = g.decks.missions.findIndex((id) => !taken.has(id));
  if (idx < 0) { if (!silent) log(g, 'No secret missions remain.'); return; }
  const [id] = g.decks.missions.splice(idx, 1);
  p.missions.push(id);
  p.missionCount = p.missions.length;
  if (!silent) log(g, `${p.name} receives a sealed secret mission.`);
}

function missionMet(g: GameState, p: PlayerState, m: MissionDef): boolean {
  const owned = Object.entries(g.props).filter(([, pr]) => pr.owner === p.id).map(([k]) => +k);
  const c = m.cond;
  switch (c.kind) {
    case 'groups': return new Set(owned.map((id) => BOARD[id].group)).size >= c.n;
    case 'fullGroup': return (Object.keys(GROUPS) as GroupId[]).some((gr) => ownsFullGroup(g, p.id, gr));
    case 'reach': return p.position === c.space && g.players[g.current].id === p.id;
    case 'ownCount': return owned.length >= c.n;
    case 'cash': return p.cash >= c.n;
    case 'upgrade': return owned.some((id) => g.props[id].level >= c.level);
  }
}

function checkMissions(g: GameState) {
  for (const p of alive(g)) {
    for (const id of [...p.missions]) {
      const m = MISSIONS.find((x) => x.id === id)!;
      if (missionMet(g, p, m)) {
        p.missions = p.missions.filter((x) => x !== id);
        p.completedMissions.push(id);
        p.missionCount = p.missions.length;
        log(g, `${p.name} completes secret mission "${m.title}".`);
        gain(g, p, m.reward, 'mission reward');
        if (p.character === 'connor') gain(g, p, 100, 'Frontier Resolve');
        g.decks.missions.push(id); // return to bottom of deck for reuse by others
      }
    }
  }
}

function sendToJail(g: GameState, p: PlayerState) {
  p.position = 8;
  p.inJail = true;
  p.jailTurns = 0;
  g.extraRoll = false;
  g.doubles = 0;
  log(g, `${p.name} is desynchronized and sent to Desynchronization.`);
}

function startBonus(g: GameState, p: PlayerState) {
  let amt = START_BONUS;
  if (p.character === 'edward') amt += 50;
  gain(g, p, amt, p.character === 'edward' ? 'Animus Hub + Plunder' : 'Animus Hub');
}

function moveBy(g: GameState, p: PlayerState, steps: number, rng: Rng) {
  const raw = p.position + steps;
  if (steps > 0 && raw >= BOARD.length) startBonus(g, p);
  p.position = ((raw % BOARD.length) + BOARD.length) % BOARD.length;
  log(g, `${p.name} moves to ${BOARD[p.position].name}.`);
  resolveSpace(g, p, rng);
}

function moveTo(g: GameState, p: PlayerState, to: number, rng: Rng) {
  if (to <= p.position) startBonus(g, p);
  p.position = to;
  log(g, `${p.name} travels to ${BOARD[to].name}.`);
  resolveSpace(g, p, rng);
}

function bayekTrigger(g: GameState, p: PlayerState) {
  if (p.character === 'bayek' && abilityReady(g, p)) {
    p.abilityLastRound = g.round;
    log(g, `Medjay Duty: Bayek fulfills his duty.`);
    gain(g, p, 100, 'Medjay Duty');
  }
}

function drawCard(g: GameState, deck: 'animus' | 'conspiracy' | 'eden', rng: Rng): CardDef {
  const src = deck === 'animus' ? ANIMUS_CARDS : deck === 'conspiracy' ? CONSPIRACY_CARDS : EDEN_CARDS;
  if (g.decks[deck].length === 0) g.decks[deck] = shuffle(src.map((c) => c.id), rng);
  const id = g.decks[deck].shift()!;
  return src.find((c) => c.id === id)!;
}

function isHarmful(e: Effect, conspiracy: boolean): boolean {
  if (conspiracy && e.type === 'mission') return false;
  return ['pay', 'payEach', 'maintenance', 'incomeBlock', 'restrict', 'jail'].includes(e.type)
    || (e.type === 'moveBy' && e.steps < 0);
}

function resolveSpace(g: GameState, p: PlayerState, rng: Rng) {
  const s = BOARD[p.position];
  switch (s.kind) {
    case 'property': {
      const pr = g.props[s.id];
      if (!pr.owner) { g.pendingBuy = s.id; g.phase = 'buy'; return; }
      if (pr.owner === p.id) { log(g, `${p.name} rests at their own ${s.name}.`); return; }
      if (pr.mortgaged) { log(g, `${s.name} is mortgaged. No rent due.`); return; }
      const owner = P(g, pr.owner);
      const amount = rentFor(g, s.id);
      if (p.character === 'ezio' && abilityReady(g, p)) {
        g.pendingRent = { space: s.id, amount, owner: owner.id };
        g.phase = 'rent';
        return;
      }
      pay(g, p, owner, amount, `rent at ${s.name}`);
      return;
    }
    case 'tax': {
      let amt = s.amount!;
      if (p.character === 'altair') { amt = Math.floor(amt / 2); log(g, 'Creed of Masyaf halves the tax.'); }
      pay(g, p, null, amt, s.name);
      return;
    }
    case 'animus':
    case 'conspiracy':
    case 'eden': {
      if (s.kind !== 'conspiracy') bayekTrigger(g, p);
      if (g.phase === 'debt') return;
      let card = drawCard(g, s.kind, rng);
      if (p.character === 'basim' && isHarmful(card.effect, s.kind === 'conspiracy') && abilityReady(g, p)) {
        p.abilityLastRound = g.round;
        log(g, `Eagle Sight: Basim foresees "${card.title}" and draws again.`);
        card = drawCard(g, s.kind, rng);
      }
      g.card = { deck: s.kind, title: card.title, text: card.text, player: p.id, seq: g.seq + 1 };
      log(g, `${p.name} draws "${card.title}": ${card.text}`);
      if (s.kind === 'conspiracy' && p.character === 'arno' && abilityReady(g, p)) {
        p.abilityLastRound = g.round;
        log(g, `Phantom Blade: Arno slips past the conspiracy.`);
        return;
      }
      if (s.kind === 'conspiracy' && p.shield > 0) {
        p.shield--;
        log(g, `Brotherhood shield absorbs the conspiracy.`);
        return;
      }
      applyEffect(g, p, card.effect, s.kind === 'conspiracy', rng);
      return;
    }
    case 'mission':
      bayekTrigger(g, p);
      giveMission(g, p, rng);
      return;
    case 'brotherhood':
      p.bureauDiscount = true;
      log(g, `${p.name}'s next Brotherhood upgrade this turn costs half.`);
      return;
    case 'sanctuary':
      gain(g, p, 100, 'Brotherhood stipend');
      return;
    case 'gotojail':
      sendToJail(g, p);
      return;
    default:
      return;
  }
}

function applyEffect(g: GameState, p: PlayerState, e: Effect, penalty: boolean, rng: Rng) {
  const scale = (n: number) => (penalty && p.character === 'kassandra' ? Math.floor(n / 2) : n);
  switch (e.type) {
    case 'gain': gain(g, p, e.amount, 'card'); return;
    case 'pay': pay(g, p, null, scale(e.amount), 'card'); return;
    case 'payEach': {
      const others = alive(g).filter((q) => q.id !== p.id);
      const each = scale(e.amount);
      const total = each * others.length;
      if (p.cash < total) { pay(g, p, null, total, `tribute to rivals`); return; }
      for (const q of others) pay(g, p, q, each, 'card');
      return;
    }
    case 'collectEach': {
      for (const q of alive(g)) {
        if (q.id === p.id) continue;
        const amt = Math.min(q.cash, e.amount);
        q.cash -= amt;
        p.cash += amt;
        log(g, `${q.name} pays ${amt} AC to ${p.name}.`);
      }
      return;
    }
    case 'moveTo': moveTo(g, p, e.to, rng); return;
    case 'moveBy': moveBy(g, p, e.steps, rng); return;
    case 'extraRoll': g.extraRoll = true; log(g, `${p.name} gains an extra roll.`); return;
    case 'shield': p.shield++; log(g, `${p.name} gains a Brotherhood shield.`); return;
    case 'mission': giveMission(g, p, rng); return;
    case 'maintenance': {
      let total = 0;
      for (const pr of Object.values(g.props)) if (pr.owner === p.id) total += e.perProperty + pr.level * e.perUpgrade;
      pay(g, p, null, scale(total), 'property maintenance');
      return;
    }
    case 'incomeBlock': p.incomeBlockedUntil = g.round + e.rounds; log(g, `${p.name}'s income is frozen until round ${g.round + e.rounds + 1}.`); return;
    case 'restrict': p.restrictedUntil = g.round + e.rounds; return;
    case 'jail': sendToJail(g, p); return;
  }
}

/** After a space resolves, decide whether the player rolls again or ends. */
function settle(g: GameState) {
  checkMissions(g);
  if (g.phase === 'buy' || g.phase === 'rent' || g.phase === 'auction' || g.phase === 'debt' || g.phase === 'gameover') return;
  const p = cur(g);
  g.phase = g.extraRoll && !p.inJail ? 'roll' : 'end';
}

function eliminate(g: GameState, p: PlayerState) {
  const creditor = g.debt && cur(g).id === p.id && g.debt.to ? P(g, g.debt.to) : null;
  if (creditor && p.cash > 0) creditor.cash += p.cash;
  p.cash = 0;
  for (const pr of Object.values(g.props)) {
    if (pr.owner !== p.id) continue;
    pr.level = 0;
    if (creditor) pr.owner = creditor.id;
    else { pr.owner = null; pr.mortgaged = false; }
  }
  p.bankrupt = true;
  p.missions = [];
  p.missionCount = 0;
  log(g, `${p.name} is bankrupt and leaves the Brotherhood${creditor ? `; assets pass to ${creditor.name}` : ''}.`);
  if (alive(g).length <= 1) finish(g, 'last');
}

function finish(g: GameState, why: 'last' | 'rounds') {
  const standings = g.players
    .map((p) => ({
      id: p.id,
      netWorth: p.bankrupt ? 0 : netWorth(g, p),
      cash: p.cash,
      props: Object.entries(g.props).filter(([, pr]) => pr.owner === p.id).map(([k]) => +k),
      bankrupt: p.bankrupt,
    }))
    .sort((a, b) => Number(a.bankrupt) - Number(b.bankrupt) || b.netWorth - a.netWorth);
  g.standings = standings.map(({ bankrupt: _b, ...s }) => s);
  g.winner = standings[0].id;
  g.phase = 'gameover';
  g.debt = null; g.auction = null; g.pendingBuy = null; g.pendingRent = null;
  const w = P(g, g.winner);
  log(g, why === 'last'
    ? `${w.name} is the last solvent Assassin and claims the Empire.`
    : `The round limit is reached. ${w.name} wins with a net worth of ${standings[0].netWorth} AC.`);
}

function nextTurn(g: GameState) {
  const prev = cur(g);
  prev.bureauDiscount = false;
  g.doubles = 0; g.extraRoll = false; g.debt = null; g.pendingBuy = null; g.pendingRent = null; g.auction = null;
  let i = g.current;
  let wrapped = false;
  do {
    i = (i + 1) % g.players.length;
    if (i === 0) wrapped = true;
  } while (g.players[i].bankrupt);
  if (wrapped || i <= g.current) {
    g.round++;
    if (g.round > g.maxRounds) { g.round = g.maxRounds; finish(g, 'rounds'); return; }
    log(g, `Round ${g.round} begins.`);
  }
  g.current = i;
  g.turnNo++;
  g.phase = 'roll';
  log(g, `${cur(g).name}'s turn.`);
}

function finishAuctionIfDone(g: GameState) {
  const a = g.auction!;
  const active = alive(g).filter((p) => !a.out.includes(p.id));
  const s = BOARD[a.space];
  if (a.bidder && active.every((p) => p.id === a.bidder)) {
    const w = P(g, a.bidder);
    w.cash -= a.high;
    g.props[a.space].owner = w.id;
    log(g, `${w.name} wins the auction for ${s.name} at ${a.high} AC.`);
  } else if (!a.bidder && active.length === 0) {
    log(g, `No bids. ${s.name} remains unclaimed.`);
  } else return;
  g.auction = null;
  g.phase = 'end';
  settle(g);
}

// ---------- main reducer ----------
/** Applies an action from `pid`. Mutates `g`. Returns an error message or null. */
export function applyAction(g: GameState, pid: string, a: Action, rng: Rng): string | null {
  if (g.phase === 'gameover') return 'The match is over.';
  const me = g.players.find((p) => p.id === pid);
  if (!me || me.bankrupt) return 'You are not an active player.';
  const isTurn = cur(g).id === pid;

  // auction actions can come from any player
  if (a.type === 'bid' || a.type === 'pass') {
    if (g.phase !== 'auction' || !g.auction) return 'No auction in progress.';
    if (g.auction.out.includes(pid)) return 'You already withdrew from this auction.';
    if (a.type === 'pass') {
      if (g.auction.bidder === pid) return 'You hold the high bid.';
      g.auction.out.push(pid);
      log(g, `${me.name} withdraws from the auction.`);
    } else {
      const amt = Math.floor(Number(a.amount));
      if (!Number.isFinite(amt) || amt < 10) return 'Minimum bid is 10 AC.';
      if (amt <= g.auction.high) return 'Bid must exceed the current high bid.';
      if (amt > me.cash) return 'You cannot afford that bid.';
      g.auction.high = amt;
      g.auction.bidder = pid;
      log(g, `${me.name} bids ${amt} AC.`);
    }
    finishAuctionIfDone(g);
    return null;
  }

  if (a.type === 'bankrupt') {
    if (g.auction && !g.auction.out.includes(pid)) g.auction.out.push(pid);
    eliminate(g, me);
    if ((g.phase as Phase) !== 'gameover') {
      if (isTurn) nextTurn(g);
      else if (g.auction) finishAuctionIfDone(g);
    }
    return null;
  }

  // property management: own turn (or debt phase for debtor)
  if (a.type === 'upgrade' || a.type === 'sellUpgrade' || a.type === 'mortgage' || a.type === 'unmortgage') {
    if (!isTurn) return 'You can only manage properties on your turn.';
    if (g.phase === 'auction') return 'Wait for the auction to finish.';
    const s = BOARD[a.space];
    const pr = g.props[a.space];
    if (!s || !pr || pr.owner !== pid) return 'You do not own that property.';
    const gcost = GROUPS[s.group!].upgradeCost;
    if (a.type === 'upgrade') {
      if (g.phase === 'debt') return 'Settle your debt first.';
      if (g.round <= me.restrictedUntil) return 'Martial Law: you cannot build this round.';
      if (!ownsFullGroup(g, pid, s.group!)) return 'You must own the full color group to build.';
      if (groupSpaces(s.group!).some((id) => g.props[id].mortgaged)) return 'Unmortgage the group before building.';
      if (pr.level >= 3) return 'Already a Brotherhood Headquarters.';
      const cost = upgradeCost(g, me, a.space);
      if (me.cash < cost) return 'Not enough AC.';
      me.cash -= cost;
      if (me.bureauDiscount) me.bureauDiscount = false;
      pr.level++;
      log(g, `${me.name} builds a ${UPGRADE_NAMES[pr.level]} in ${s.name} for ${cost} AC.`);
    } else if (a.type === 'sellUpgrade') {
      if (pr.level <= 0) return 'No upgrades to sell.';
      pr.level--;
      const refund = Math.floor(gcost / 2);
      me.cash += refund;
      log(g, `${me.name} sells an upgrade in ${s.name} for ${refund} AC.`);
    } else if (a.type === 'mortgage') {
      if (pr.mortgaged) return 'Already mortgaged.';
      if (groupSpaces(s.group!).some((id) => g.props[id].level > 0)) return 'Sell all upgrades in this group first.';
      pr.mortgaged = true;
      const v = Math.floor(s.price! / 2);
      me.cash += v;
      log(g, `${me.name} mortgages ${s.name} for ${v} AC.`);
    } else {
      if (!pr.mortgaged) return 'Not mortgaged.';
      if (g.phase === 'debt') return 'Settle your debt first.';
      const c = unmortgageCost(a.space);
      if (me.cash < c) return 'Not enough AC.';
      me.cash -= c;
      pr.mortgaged = false;
      log(g, `${me.name} lifts the mortgage on ${s.name} for ${c} AC.`);
    }
    checkMissions(g);
    return null;
  }

  if (!isTurn) return 'It is not your turn.';

  switch (a.type) {
    case 'roll': {
      if (g.phase !== 'roll') return 'You cannot roll now.';
      const d1 = 1 + Math.floor(rng() * 6);
      const d2 = 1 + Math.floor(rng() * 6);
      g.dice = [d1, d2];
      g.rollSeq++;
      g.card = null;
      g.extraRoll = false;
      const dbl = d1 === d2;
      log(g, `${me.name} rolls ${d1} + ${d2}${dbl ? ' (doubles)' : ''}.`);
      if (me.inJail) {
        if (dbl) {
          me.inJail = false; me.jailTurns = 0;
          log(g, `${me.name} resynchronizes with doubles.`);
        } else {
          me.jailTurns++;
          if (me.jailTurns < 3) { g.phase = 'end'; log(g, `${me.name} remains desynchronized.`); return null; }
          me.inJail = false; me.jailTurns = 0;
          if (!pay(g, me, null, JAIL_FINE, 'forced resynchronization fee')) return null;
        }
        moveBy(g, me, d1 + d2, rng);
        settle(g);
        return null;
      }
      if (dbl) {
        g.doubles++;
        if (g.doubles >= 3) { sendToJail(g, me); g.phase = 'end'; return null; }
        g.extraRoll = true;
      }
      moveBy(g, me, d1 + d2, rng);
      if (!dbl && g.phase !== 'roll') { /* extraRoll may have been set by a card */ }
      settle(g);
      return null;
    }
    case 'payFine': {
      if (g.phase !== 'roll' || !me.inJail) return 'You are not desynchronized.';
      if (me.cash < JAIL_FINE) return 'Not enough AC.';
      me.cash -= JAIL_FINE;
      me.inJail = false; me.jailTurns = 0;
      log(g, `${me.name} pays ${JAIL_FINE} AC to resynchronize.`);
      return null;
    }
    case 'buy': {
      if (g.phase !== 'buy' || g.pendingBuy == null) return 'Nothing to buy.';
      const s = BOARD[g.pendingBuy];
      let price = s.price!;
      let used = false;
      if (a.useAbility) {
        if (me.character !== 'eivor') return 'Your character cannot do that.';
        if (!abilityReady(g, me)) return 'Raid already used this turn.';
        if (price > EIVOR_MAX_PRICE) return `Raid only works on properties up to ${EIVOR_MAX_PRICE} AC.`;
        price = Math.floor(price * 0.8);
        used = true;
      }
      if (me.cash < price) return 'Not enough AC.';
      me.cash -= price;
      if (used) { me.abilityLastTurn = g.turnNo; log(g, `Raid! Eivor seizes a 20% discount.`); }
      g.props[s.id].owner = me.id;
      log(g, `${me.name} acquires ${s.name} for ${price} AC.`);
      g.pendingBuy = null;
      g.phase = 'end';
      settle(g);
      return null;
    }
    case 'decline': {
      if (g.phase !== 'buy' || g.pendingBuy == null) return 'Nothing to decline.';
      const id = g.pendingBuy;
      g.pendingBuy = null;
      g.auction = { space: id, high: 0, bidder: null, out: [] };
      g.phase = 'auction';
      log(g, `${me.name} declines. ${BOARD[id].name} goes to auction.`);
      return null;
    }
    case 'payRent': {
      if (g.phase !== 'rent' || !g.pendingRent) return 'No rent pending.';
      const r = g.pendingRent;
      let amount = r.amount;
      if (a.useAbility) {
        if (me.character !== 'ezio' || !abilityReady(g, me)) return 'Ability unavailable.';
        amount = Math.floor(amount / 2);
        me.abilityLastRound = g.round;
        log(g, `Requiescat! Ezio halves the rent.`);
      }
      g.pendingRent = null;
      g.phase = 'end';
      pay(g, me, P(g, r.owner), amount, `rent at ${BOARD[r.space].name}`);
      settle(g);
      return null;
    }
    case 'payDebt': {
      if (g.phase !== 'debt' || !g.debt) return 'No debt.';
      if (me.cash < g.debt.amount) return 'You still lack the funds. Mortgage or sell upgrades.';
      const d = g.debt;
      g.debt = null;
      g.phase = 'end';
      pay(g, me, d.to ? P(g, d.to) : null, d.amount, d.reason);
      settle(g);
      return null;
    }
    case 'endTurn': {
      if (g.phase !== 'end') return 'You cannot end your turn yet.';
      nextTurn(g);
      return null;
    }
  }
  return 'Unknown action.';
}

/** Hide other players' secret missions. */
export function viewFor(g: GameState, pid: string | null): GameState {
  const v: GameState = JSON.parse(JSON.stringify(g));
  v.decks = { animus: [], conspiracy: [], eden: [], missions: [] };
  for (const p of v.players) if (p.id !== pid && v.phase !== 'gameover') p.missions = [];
  return v;
}
