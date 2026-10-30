// Intro video popup: opens 1 s after the homepage loads and plays public/ac.mp4.
// Browsers block autoplay with sound until the visitor interacts with the page, so we try with
// sound first; if blocked, it plays muted and the first click/tap/key anywhere turns sound on.
import { useEffect, useRef, useState } from 'react';
import './introvideo.css';

// phones (narrow or touch-only screens) get the full-screen portrait cut
const isPhone = () => matchMedia('(max-width: 820px), (pointer: coarse) and (max-height: 540px)').matches;

// Videos are served from Cloudinary (compressed, best format per browser) when VITE_CLOUDINARY_CLOUD is set.
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD as string | undefined;
const videoUrl = (name: string, w: number, portrait = false) => (CLOUD
  ? `https://res.cloudinary.com/${CLOUD}/video/upload/q_auto:eco,f_auto,${portrait ? `ar_9:16,c_fill,g_center,w_${w}` : `w_${w},c_limit`}/eoa/${name}`
  : `/${name}.mp4`);

export function IntroVideo() {
  const [phone] = useState(isPhone);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const vid = useRef<HTMLVideoElement>(null);

  useEffect(() => { const t = setTimeout(() => setOpen(true), 1000); return () => clearTimeout(t); }, []);

  const justUnmuted = useRef(false);
  useEffect(() => {
    if (!open) return;
    const v = vid.current!;
    v.muted = false;
    v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}); });
    // first tap/click/key anywhere turns the sound on (that tap does not close or re-mute)
    const unmute = () => {
      if (!v.muted) return;
      v.muted = false; v.volume = 1; setMuted(false); justUnmuted.current = true;
      v.play().catch(() => {});
      setTimeout(() => { justUnmuted.current = false; }, 400);
    };
    const key = (e: KeyboardEvent) => (e.key === 'Escape' ? setOpen(false) : unmute());
    const evs = ['pointerdown', 'touchend', 'click'] as const;
    evs.forEach((ev) => window.addEventListener(ev, unmute, { capture: true }));
    window.addEventListener('keydown', key);
    return () => { evs.forEach((ev) => window.removeEventListener(ev, unmute, { capture: true })); window.removeEventListener('keydown', key); };
  }, [open]);

  // let the background music pause while the video is open
  useEffect(() => { window.dispatchEvent(new CustomEvent('eoa-intro', { detail: open })); }, [open]);

  if (!open) return null;
  const toggleSound = () => { if (justUnmuted.current) return; const v = vid.current!; v.muted = !v.muted; setMuted(v.muted); if (!v.muted) v.play().catch(() => {}); };

  return (
    <div className={`iv-back ${phone ? 'mobile' : ''}`} onClick={() => { if (!justUnmuted.current) setOpen(false); }}>
      <div className="iv-box" role="dialog" aria-modal="true" aria-label="Intro video" onClick={(e) => e.stopPropagation()}>
        <video ref={vid} src={phone ? videoUrl('ac-mobile', 720, true) : videoUrl('ac', 1280)} autoPlay playsInline preload="auto" onEnded={() => setOpen(false)} />
        <button className="iv-x" onClick={() => setOpen(false)} aria-label="Close video">✕</button>
        <button className="iv-sound" onClick={toggleSound} aria-label={muted ? 'Turn sound on' : 'Mute'}>{muted ? '🔇 Tap for sound' : '🔊'}</button>
        {muted && <div className="iv-tap" aria-hidden="true">🔊 Tap anywhere for sound</div>}
      </div>
    </div>
  );
}
