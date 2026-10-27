// Local, persisted user settings + tiny WebAudio sound engine (no audio files needed).
import { useEffect, useState } from 'react';

export interface Settings { sound: boolean; music: boolean; reduceMotion: boolean }
const KEY = 'eoa-settings';
const defaults: Settings = { sound: true, music: false, reduceMotion: localStorage.getItem('eoa-motion') === 'off' };
let current: Settings = (() => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return defaults; } })();
const subs = new Set<(s: Settings) => void>();

function apply(s: Settings) {
  document.body.classList.toggle('no-motion', s.reduceMotion);
  if (s.music) startMusic(); else stopMusic();
}

export function setSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  localStorage.setItem(KEY, JSON.stringify(current));
  apply(current);
  subs.forEach((f) => f(current));
}
export function useSettings(): [Settings, (p: Partial<Settings>) => void] {
  const [s, set] = useState(current);
  useEffect(() => { subs.add(set); return () => { subs.delete(set); }; }, []);
  return [s, setSettings];
}

let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

/** Short metallic UI click. */
export function playClick() {
  if (!current.sound) return;
  try {
    const a = ac(); const o = a.createOscillator(); const g = a.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(880, a.currentTime); o.frequency.exponentialRampToValueAtTime(440, a.currentTime + 0.08);
    g.gain.setValueAtTime(0.06, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.12);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.13);
  } catch { /* audio unavailable */ }
}

let music: { stop: () => void } | null = null;
function startMusic() {
  if (music) return;
  try {
    const a = ac(); a.resume();
    const out = a.createGain(); out.gain.value = 0.0001; out.gain.exponentialRampToValueAtTime(0.035, a.currentTime + 2);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    lp.connect(out).connect(a.destination);
    // Ambient drone in D minor
    const oscs = [146.83, 220, 174.61, 73.42].map((f, i) => {
      const o = a.createOscillator(); o.type = i === 3 ? 'sine' : 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6;
      const g = a.createGain(); g.gain.value = i === 3 ? 0.6 : 0.18; o.connect(g).connect(lp); o.start(); return o;
    });
    const lfo = a.createOscillator(); const lg = a.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 300;
    lfo.connect(lg).connect(lp.frequency); lfo.start();
    music = { stop: () => { out.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8); setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); }, 900); } };
  } catch { music = null; }
}
function stopMusic() { music?.stop(); music = null; }

apply({ ...current, music: false }); // music needs a user gesture; started on first toggle/click

// Resume music on first user gesture if it was left on.
window.addEventListener('pointerdown', () => { if (current.music) startMusic(); }, { once: true });
document.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) playClick(); });
