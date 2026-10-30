// Background music for the whole site (public/ac3.mp3), looping at low volume.
// Browsers block audio until the visitor interacts, so it starts on the first click/tap/key.
// Pauses while the intro video plays (IntroVideo sends 'eoa-intro' events). Mute choice is remembered.
import { useEffect, useRef, useState } from 'react';

const KEY = 'eoa-music';

export function BgMusic() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(() => localStorage.getItem(KEY) !== 'off');
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    const a = new Audio('/ac3.mp3'); a.loop = true; a.volume = 1; a.preload = 'auto';
    audio.current = a;
    // muffled and quiet: route through a low-pass filter (like music heard through a wall)
    try {
      const c = new AudioContext();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
      const g = c.createGain(); g.gain.value = 0.18;
      c.createMediaElementSource(a).connect(lp).connect(g).connect(c.destination);
      a.addEventListener('play', () => { c.resume().catch(() => {}); });
    } catch { a.volume = 0.15; } // fallback: just quieter
    const onIntro = (e: Event) => setIntro((e as CustomEvent<boolean>).detail);
    window.addEventListener('eoa-intro', onIntro);
    return () => { a.pause(); window.removeEventListener('eoa-intro', onIntro); };
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, on ? 'on' : 'off');
    const a = audio.current!;
    if (!on || intro) { a.pause(); return; }
    const start = () => { a.play().catch(() => {}); };
    start();
    // retry on first interaction if autoplay was blocked
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => { window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start); };
  }, [on, intro]);

  return (
    <button className="bgm-btn" onClick={() => setOn(!on)} aria-pressed={on} aria-label={on ? 'Mute background music' : 'Play background music'} title={on ? 'Mute music' : 'Play music'}>
      {on ? '♫' : '🔇'}
    </button>
  );
}
