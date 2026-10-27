import { useState } from 'react';
import './characters.css';
import { ROSTER, Character } from './characterData';
import { CharacterCarousel } from './CharacterCarousel';
import { CharacterDetailsModal } from './CharacterDetailsModal';
import type { CardState } from './CharacterCard';

/**
 * Playable Characters section. On the homepage it is browse-only; in the lobby pass
 * `stateFor` + `onSelect` to connect it to the room's character selection.
 */
export function CharacterSection({ id, stateFor, onSelect, canSelect, compact }: {
  id?: string;
  stateFor?: (c: Character) => CardState | undefined;
  onSelect?: (c: Character) => void;
  canSelect?: (c: Character) => boolean;
  compact?: boolean;
}) {
  // Deep link: /?character=edward opens that character's popup on the homepage.
  const [open, setOpen] = useState<Character | null>(() => {
    if (compact) return null;
    const q = new URLSearchParams(window.location.search).get('character');
    return ROSTER.find((c) => c.id === q) ?? null;
  });
  return (
    <section className={`ac-section ${compact ? 'compact' : ''}`} id={id} aria-labelledby={`${id ?? 'chars'}-h`}>
      <header className="ac-head">
        <h2 id={`${id ?? 'chars'}-h`}><svg viewBox="0 0 100 124" aria-hidden="true"><path d="M50 0C47 22 36 56 18 92 12 104 6 112 0 118c14-2 24-8 30-18 8-16 15-36 20-54ZM50 0c3 22 14 56 32 92 6 12 12 20 18 26-14-2-24-8-30-18-8-16-15-36-20-54Zm0 70 8 22-8 32-8-32Z" fill="currentColor" /></svg>Playable Characters</h2>
        <span className="ac-head-line" />
        <span className="ac-head-label">Legends from every era</span>
      </header>
      {!compact && <p className="ac-sub"><em>Legends from every era.</em> <span>Explore the Brotherhood</span></p>}
      <CharacterCarousel items={ROSTER} stateFor={stateFor} onOpen={setOpen} />
      {open && (
        <CharacterDetailsModal c={open} list={ROSTER} onNavigate={setOpen} onClose={() => setOpen(null)}
          onSelect={onSelect ? () => { onSelect(open); setOpen(null); } : undefined}
          selectDisabled={canSelect ? !canSelect(open) : false}
          selectLabel={stateFor?.(open)?.takenBy ? `Taken by ${stateFor(open)!.takenBy}` : stateFor?.(open)?.mine ? 'Already your pick' : `Select ${open.name}`} />
      )}
    </section>
  );
}
