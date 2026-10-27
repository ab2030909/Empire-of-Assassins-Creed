import { useRef, useState } from 'react';
import { FEATURED_LOCATIONS, FeaturedLocation } from './assets';
import { IconChevron } from './icons';
import { Modal } from '../App';
import { BOARD, GROUPS } from '../../shared/data';

export function LocationCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<FeaturedLocation | null>(null);
  const scroll = (dir: number) => {
    const el = track.current; if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: document.body.classList.contains('no-motion') ? 'auto' : 'smooth' });
  };
  return (
    <section className="hp-locations" id="locations" aria-label="Featured locations">
      <div className="hp-loc-intro">
        <h2>Featured<br />Locations</h2>
        <p>From Masyaf to Florence, from Havana to London. Explore the Assassin's Creed universe on a single board.</p>
      </div>
      <button className="hp-arrow" onClick={() => scroll(-1)} aria-label="Previous locations"><IconChevron dir="left" size={30} /></button>
      <div className="hp-loc-track" ref={track} tabIndex={0} aria-label="Location gallery, scroll horizontally">
        {FEATURED_LOCATIONS.map((l) => (
          <button key={l.id} className="hp-loc" onClick={() => setOpen(l)}>
            <div className="hp-loc-img"><img src={l.image} alt={l.name} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} /></div>
            <b>{l.name}</b>
            <span>{l.game}</span>
          </button>
        ))}
      </div>
      <button className="hp-arrow" onClick={() => scroll(1)} aria-label="Next locations"><IconChevron size={30} /></button>
      {open && <LocationModal l={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function LocationModal({ l, onClose }: { l: FeaturedLocation; onClose: () => void }) {
  const space = l.boardSpace != null ? BOARD[l.boardSpace] : null;
  const grp = space?.group ? GROUPS[space.group] : null;
  const groupNames = space?.group ? BOARD.filter((s) => s.group === space.group).map((s) => s.name).join(', ') : '';
  return (
    <Modal title={`${l.name} — ${l.game}`} onClose={onClose}>
      <img className="hp-loc-modal-img" src={l.image} alt={l.name} />
      <p>{l.blurb}</p>
      {space && grp && (
        <table className="rent-table">
          <tbody>
            <tr><td>Board space</td><td>{space.name}</td></tr>
            <tr><td>Region</td><td>{grp.name} · {grp.era}</td></tr>
            <tr><td>Price</td><td>{space.price} AC</td></tr>
            <tr><td>Upgrade cost</td><td>{grp.upgradeCost} AC</td></tr>
            <tr><td>Color group</td><td>{groupNames}</td></tr>
          </tbody>
        </table>
      )}
    </Modal>
  );
}
