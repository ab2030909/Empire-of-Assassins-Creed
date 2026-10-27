import type { Character } from './characterData';
import { CharPortrait } from './Portrait';
import { AbilityIcon } from './AbilityIcon';
import { CardFx } from './CardFx';

export interface CardState { selected?: boolean; takenBy?: string; mine?: boolean }

/** Premium collectible character card. Click / Enter opens details. */
export function CharacterCard({ c, state, onOpen }: { c: Character; state?: CardState; onOpen: (c: Character) => void }) {
  const i = c.info;
  return (
    <article className={`ac-card rarity-${i.rarity.toLowerCase()} card-${c.lore.fx} ${state?.selected ? 'is-selected' : ''} ${state?.takenBy ? 'is-taken' : ''}`}
      style={{ ['--theme' as string]: i.theme }}>
      <button className="ac-card-hit" onClick={() => onOpen(c)} aria-label={`${c.name}, ${c.title}. View details`} />
      <div className="ac-card-portrait">
        <CharPortrait c={c} crop="card" />
        <CardFx type={c.lore.fx} />
        <span className="ac-rarity" title={`${i.rarity} rarity`}><i />{i.rarity}</span>
        {state?.selected && <span className="ac-flag">{state.mine ? 'Your pick' : 'Selected'}</span>}
        {state?.takenBy && <span className="ac-flag taken">Taken · {state.takenBy}</span>}
      </div>
      <div className="ac-card-body">
        <h3 className="ac-name">{c.name}</h3>
        <p className="ac-game">{i.game.split(' · ')[0]}</p>
        <p className="ac-role">{c.title}</p>
        <span className="ac-ability-icon"><AbilityIcon kind={i.icon} /></span>
        <p className="ac-ability-name">{c.ability.name}</p>
        <p className="ac-ability-text">{c.ability.description}</p>
        <span className="ac-details" aria-hidden="true">View Details <span>→</span></span>
      </div>
    </article>
  );
}
