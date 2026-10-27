import { useEffect, useState } from 'react';
import type { Character } from './characterData';
import { Portrait as SvgPortrait } from '../art';

/** Cropped character artwork with SVG fallback when the image is missing or fails. */
export function CharPortrait({ c, crop = 'card', className }: { c: Character; crop?: 'card' | 'avatar' | 'full'; className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!c.info.art.src) { setOk(false); return; }
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = c.info.art.src;
  }, [c.info.art.src]);
  if (ok === false) return <div className={`cp-fallback ${className ?? ''}`}><SvgPortrait color={c.color} size="100%" label={c.name} /></div>;
  const fit = crop === 'full' ? { size: 'contain', pos: '50% 0%' } : c.info.art[crop];
  return (
    <div role="img" aria-label={c.name} className={`cp-art ${className ?? ''}`}
      style={{ backgroundImage: ok ? `url("${c.info.art.src}")` : undefined, backgroundSize: fit.size, backgroundPosition: fit.pos }} />
  );
}
