// Simple PC opponent: picks one legal action for a bot player.
import { GameState, Action, PlayerState, abilityReady, ownsFullGroup, upgradeCost, unmortgageCost } from '../shared/engine';
import { BOARD, EIVOR_MAX_PRICE, JAIL_FINE } from '../shared/data';

const owned = (g: GameState, p: PlayerState) =>
  Object.entries(g.props).filter(([, pr]) => pr.owner === p.id).map(([k]) => +k);

/** Returns the bot id that should act now and its action, or null. */
export function botMove(g: GameState, isBot: (id: string) => boolean): { id: string; action: Action; extra?: Action[] } | null {
  if (g.phase === 'gameover') return null;

  if (g.phase === 'auction' && g.auction) {
    const a = g.auction;
    const bot = g.players.find((p) => !p.bankrupt && isBot(p.id) && !a.out.includes(p.id) && a.bidder !== p.id);
    if (!bot) return null;
    const s = BOARD[a.space];
    const limit = Math.min(Math.floor(s.price! * 0.9), bot.cash - 200);
    const next = a.high + 10;
    return { id: bot.id, action: next <= limit ? { type: 'bid', amount: next } : { type: 'pass' } };
  }

  const p = g.players[g.current];
  if (!isBot(p.id) || p.bankrupt) return null;

  switch (g.phase) {
    case 'roll':
      if (p.inJail && p.cash > 400) return { id: p.id, action: { type: 'payFine' }, extra: [{ type: 'roll' }] };
      return { id: p.id, action: { type: 'roll' } };
    case 'buy': {
      const s = BOARD[g.pendingBuy!];
      const raid = p.character === 'eivor' && abilityReady(g, p) && s.price! <= EIVOR_MAX_PRICE;
      const price = raid ? Math.floor(s.price! * 0.8) : s.price!;
      return { id: p.id, action: p.cash - price >= 120 ? { type: 'buy', useAbility: raid } : { type: 'decline' } };
    }
    case 'rent':
      return { id: p.id, action: { type: 'payRent', useAbility: true } };
    case 'debt': {
      if (p.cash >= g.debt!.amount) return { id: p.id, action: { type: 'payDebt' } };
      const mine = owned(g, p);
      const up = mine.find((id) => g.props[id].level > 0);
      if (up != null) return { id: p.id, action: { type: 'sellUpgrade', space: up } };
      const m = mine.find((id) => !g.props[id].mortgaged);
      if (m != null) return { id: p.id, action: { type: 'mortgage', space: m } };
      return { id: p.id, action: { type: 'bankrupt' } };
    }
    case 'end': {
      const extra: Action[] = [];
      let budget = p.cash - 300;
      for (const id of owned(g, p)) {
        const pr = g.props[id];
        if (pr.mortgaged && budget - unmortgageCost(id) > 0) { extra.push({ type: 'unmortgage', space: id }); budget -= unmortgageCost(id); }
      }
      for (const id of owned(g, p)) {
        const pr = g.props[id];
        if (!pr.mortgaged && pr.level < 3 && ownsFullGroup(g, p.id, BOARD[id].group!) && budget - upgradeCost(g, p, id) > 0) {
          extra.push({ type: 'upgrade', space: id }); budget -= upgradeCost(g, p, id);
        }
      }
      return extra.length ? { id: p.id, action: extra[0], extra: [...extra.slice(1), { type: 'endTurn' }] } : { id: p.id, action: { type: 'endTurn' } };
    }
  }
  void JAIL_FINE;
  return null;
}
