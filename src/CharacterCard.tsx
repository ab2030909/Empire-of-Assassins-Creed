import type { CharacterDef } from '../shared/data';
import { CharacterArt } from './art';

/** Collectible-style character card. */
export function CharacterCard({ c, status, footer }: { c: CharacterDef; status?: string; footer?: React.ReactNode }) {
  const cd = c.ability.cooldownRounds;
  return (
    <div className="ccard" style={{ ['--cc' as string]: c.color }}>
      <div className="ccard-art">
        <CharacterArt id={c.id} color={c.color} size="100%" label={c.name} />
        <div className="ccard-era">{c.era}</div>
      </div>
      <div className="ccard-name">
        <b>{c.name}</b>
        <span>{c.title}</span>
      </div>
      <div className="ccard-ability">
        <div className="ccard-ab-head">
          <span>{c.ability.name}</span>
          <em>{c.ability.kind}{cd > 0 ? ` · ${cd}-round cooldown` : ''}</em>
        </div>
        <p>{c.ability.description}</p>
      </div>
      {status && <div className="ccard-status">{status}</div>}
      {footer}
    </div>
  );
}
