import { ReactNode } from 'react';
import { FEATURE_ART } from './assets';
import { IconDagger, IconCastle, IconCards, IconUsers } from './icons';

type Art = { src: string; size: string; pos: string };
const FEATURES: { key: string; title: string; text: string; art: Art; icon: ReactNode }[] = [
  { key: 'assassins', title: 'Play as Iconic Assassins', text: 'Ezio, Edward, Bayek, Eivor and more with unique abilities.', art: FEATURE_ART.assassins, icon: <IconDagger /> },
  { key: 'locations', title: 'Own Historic Locations', text: 'Buy, upgrade and control cities across multiple eras.', art: FEATURE_ART.locations, icon: <IconCastle /> },
  { key: 'events', title: 'Discover Powerful Events', text: 'Draw Animus and Templar cards that change the game.', art: FEATURE_ART.events, icon: <IconCards /> },
  { key: 'friends', title: 'Compete with Friends', text: 'Create a room, invite your friends and play online.', art: FEATURE_ART.friends, icon: <IconUsers /> },
];

export function FeatureCards({ onAction }: { onAction: (i: number) => void }) {
  return (
    <section className="hp-features" id="features" aria-label="Features">
      {FEATURES.map((f, i) => (
        <button key={f.key} className={`hp-feature f-${f.key}`} onClick={() => onAction(i)}>
          <div className="hp-feature-art" style={{ backgroundImage: `url("${f.art.src}")`, backgroundSize: f.art.size, backgroundPosition: f.art.pos }} />
          <div className="hp-feature-body">
            <span className="hp-feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        </button>
      ))}
    </section>
  );
}
