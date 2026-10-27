import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character } from './characterData';
import { CharacterCard, CardState } from './CharacterCard';

const reduced = () => document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll-snap carousel: CSS decides cards-per-view responsively (5/4/3/2/1.2),
 * arrows page by the number of fully visible cards, mouse drag + touch swipe supported.
 */
export function CharacterCarousel({ items, stateFor, onOpen, label = 'Playable characters' }: {
  items: Character[]; stateFor?: (c: Character) => CardState | undefined; onOpen: (c: Character) => void; label?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ first: 0, visible: 1, atStart: true, atEnd: false });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const measure = useCallback(() => {
    const el = track.current; if (!el || !el.children.length) return;
    const card = el.children[0] as HTMLElement;
    const step = card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0');
    const first = Math.round(el.scrollLeft / step);
    const gap = parseFloat(getComputedStyle(el).columnGap || '0');
    const visible = Math.max(1, Math.floor((el.clientWidth + gap + 2) / step));
    setPos({ first, visible, atStart: el.scrollLeft < 4, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  // Play the per-card entrance animations the first time the carousel scrolls into view.
  useEffect(() => {
    const el = track.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('ac-inview'); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    measure();
    const el = track.current!;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', measure); };
  }, [measure, items.length]);

  const go = (index: number) => {
    const el = track.current; if (!el) return;
    const card = el.children[Math.max(0, Math.min(items.length - 1, index))] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const page = (dir: number) => go(pos.first + dir * pos.visible);

  const pages = Math.max(1, Math.ceil(items.length / pos.visible));
  const currentPage = pos.atEnd ? pages - 1 : Math.min(pages - 1, Math.floor(pos.first / pos.visible));

  // Mouse drag (touch uses native scrolling)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !track.current) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || !track.current) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) { d.moved = true; track.current.classList.add('dragging'); }
    if (d.moved) track.current.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current; drag.current = null;
    if (!track.current) return;
    track.current.classList.remove('dragging');
    if (d?.moved) {
      // swallow the click that follows a drag, then snap
      const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
      track.current.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => track.current?.removeEventListener('click', stop, { capture: true }), 50);
      measure(); go(Math.round(track.current.scrollLeft / ((track.current.children[0] as HTMLElement).offsetWidth + parseFloat(getComputedStyle(track.current).columnGap || '0'))));
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(pos.first + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(pos.first - 1); }
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    if (e.key === 'End') { e.preventDefault(); go(items.length - 1); }
  };

  return (
    <div className="ac-carousel" role="region" aria-roledescription="carousel" aria-label={label}>
      <button className="ac-arrow left" onClick={() => page(-1)} disabled={pos.atStart} aria-label="Previous characters">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <div className="ac-track" ref={track} tabIndex={0} onKeyDown={onKey}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={() => drag.current && endDrag()}
        aria-label={`${label}: use arrow keys to browse`}>
        {items.map((c, i) => (
          <div className="ac-slide" key={c.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`} style={{ ['--n' as string]: i }}>
            <CharacterCard c={c} state={stateFor?.(c)} onOpen={onOpen} />
          </div>
        ))}
      </div>
      <button className="ac-arrow right" onClick={() => page(1)} disabled={pos.atEnd} aria-label="Next characters">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <div className="ac-progress">
        <span className="ac-count" aria-live="polite">
          {String(Math.min(items.length, pos.first + 1)).padStart(2, '0')}–{String(Math.min(items.length, pos.first + pos.visible)).padStart(2, '0')}
          <em> / {String(items.length).padStart(2, '0')}</em>
        </span>
        <div className="ac-dots">
          {Array.from({ length: pages }, (_, p) => (
            <button key={p} className={p === currentPage ? 'on' : ''} aria-label={`Go to page ${p + 1}`} aria-current={p === currentPage ? 'true' : undefined}
              onClick={() => go(p * pos.visible)} />
          ))}
        </div>
      </div>
    </div>
  );
}
