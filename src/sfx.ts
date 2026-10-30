// Assassin's Creed–style sound effects.
// If you drop a real recording in public/sfx/<name>.mp3 (click, confirm, back, popup, dice, step, land),
// it is used instead; otherwise the effect is synthesized: blade unsheathes, temple bells, parchment,
// stone and wood. Respects the site's sound toggle (localStorage 'eoa-music' = 'off').
let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());
const muted = () => localStorage.getItem('eoa-music') === 'off';

// ---------- optional recorded files ----------
const files = new Map<string, AudioBuffer | null>();
async function loadFile(name: string) {
  if (files.has(name)) return;
  files.set(name, null);
  try {
    const r = await fetch(`/sfx/${name}.mp3`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('audio')) return;
    files.set(name, await ac().decodeAudioData(await r.arrayBuffer()));
  } catch { /* no file: synth fallback */ }
}
function playFile(name: string, vol = 0.6) {
  const b = files.get(name); if (!b) return false;
  const c = ac(); const s = c.createBufferSource(); const g = c.createGain(); g.gain.value = vol;
  s.buffer = b; s.connect(g).connect(out()); s.start(); return true;
}

// ---------- synth building blocks ----------
let master: GainNode | null = null; let verb: ConvolverNode | null = null;
/** master bus with a stone-hall reverb */
function out() {
  const c = ac();
  if (!master) {
    master = c.createGain(); master.gain.value = 0.9;
    verb = c.createConvolver();
    const len = c.sampleRate * 1.8; const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.28;
    master.connect(c.destination); master.connect(verb).connect(wet).connect(c.destination);
  }
  return master;
}
const env = (g: GainNode, t: number, a: number, peak: number, d: number) => {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
};
function noiseBuf(dur: number) {
  const c = ac(); const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
/** filtered noise burst; sweep = frequency at the end */
function hiss(dur: number, vol: number, type: BiquadFilterType, from: number, to = from, q = 1, delay = 0) {
  const c = ac(); const t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuf(dur);
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain(); env(g, t, 0.005, vol, dur);
  s.connect(f).connect(g).connect(out()); s.start(t); s.stop(t + dur + 0.05);
}
/** metallic / bell partials (inharmonic ratios ring like struck metal) */
function bell(base: number, dur: number, vol: number, ratios = [1, 2.76, 5.4, 8.93], delay = 0) {
  const c = ac(); const t = c.currentTime + delay;
  ratios.forEach((r, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = base * r;
    const g = c.createGain(); env(g, t, 0.003, vol / (i + 1), dur / (1 + i * 0.6));
    o.connect(g).connect(out()); o.start(t); o.stop(t + dur + 0.1);
  });
}
/** low body thump (wood, stone, drum) */
function thump(freq: number, dur: number, vol: number, delay = 0) {
  const c = ac(); const t = c.currentTime + delay;
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 2.2, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
  const g = c.createGain(); env(g, t, 0.002, vol, dur);
  o.connect(g).connect(out()); o.start(t); o.stop(t + dur + 0.05);
}

type Fx = 'click' | 'confirm' | 'back' | 'popup' | 'dice' | 'step' | 'land';
const synth: Record<Fx, () => void> = {
  // hidden-blade flick: short steel snick
  click: () => { hiss(0.06, 0.18, 'highpass', 5200, 7800, 0.7); bell(1850, 0.12, 0.05, [1, 2.4]); },
  // blade unsheathe + low temple bell
  confirm: () => { hiss(0.32, 0.22, 'bandpass', 2500, 9000, 2); bell(3100, 0.35, 0.06, [1, 1.5, 2.7], 0.22); bell(110, 1.4, 0.12, [1, 2.76, 5.4], 0.05); },
  // blade sheathed: downward slide into a muffled stop
  back: () => { hiss(0.22, 0.16, 'bandpass', 7000, 1800, 2); thump(90, 0.12, 0.15, 0.2); },
  // parchment unfurling + Animus shimmer
  popup: () => { for (let i = 0; i < 4; i++) hiss(0.09, 0.07, 'bandpass', 1400 + Math.random() * 1600, 900, 0.8, i * 0.05); bell(660, 1.1, 0.035, [1, 1.5, 2, 3], 0.12); },
  // bone dice rattling in a wooden cup, then hitting the stone table
  dice: () => {
    for (let i = 0; i < 10; i++) { const d = i * 0.07 + Math.random() * 0.03; hiss(0.035, 0.28, 'bandpass', 2200 + Math.random() * 1800, 1500, 3, d); thump(260 + Math.random() * 120, 0.05, 0.06, d); }
    thump(120, 0.25, 0.3, 0.78); hiss(0.08, 0.18, 'lowpass', 1800, 600, 1, 0.78); thump(140, 0.18, 0.2, 0.92);
  },
  // boot on stone
  step: () => { thump(95 + Math.random() * 20, 0.09, 0.22); hiss(0.05, 0.06, 'lowpass', 1200, 500); },
  // leap of faith landing: heavy drum + cloth
  land: () => { thump(60, 0.45, 0.4); hiss(0.25, 0.1, 'lowpass', 900, 200); bell(98, 1.2, 0.06, [1, 2.76], 0.04); },
};

const NAMES: Fx[] = ['click', 'confirm', 'back', 'popup', 'dice', 'step', 'land'];
const VOL: Record<Fx, number> = { click: 0.4, confirm: 0.6, back: 0.5, popup: 0.5, dice: 0.8, step: 0.4, land: 0.7 };
const play = (n: Fx) => () => { if (muted()) return; if (!playFile(n, VOL[n])) synth[n](); };
export const sfx = Object.fromEntries(NAMES.map((n) => [n, play(n)])) as Record<Fx, () => void>;

if (typeof window !== 'undefined') {
  const unlock = () => { ac().resume().catch(() => {}); NAMES.forEach(loadFile); };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });

  window.addEventListener('pointerdown', (e) => {
    const b = (e.target as HTMLElement | null)?.closest?.('button, [role="button"], a.hp-btn');
    if (!b || (b as HTMLButtonElement).disabled) return;
    const label = `${b.className} ${b.getAttribute('aria-label') ?? ''} ${b.textContent ?? ''}`.toLowerCase();
    if (/close|cancel|back|✕|×|leave|dismiss/.test(label)) sfx.back();
    else if (/roll|buy|start|create|ready|end turn|primary|cr2-go|lb-start|confirm|join/.test(label)) sfx.confirm();
    else sfx.click();
  }, { capture: true });

  const seen = new WeakSet<Element>();
  new MutationObserver(() => {
    document.querySelectorAll('[role="dialog"], .event-card').forEach((el) => { if (!seen.has(el)) { seen.add(el); sfx.popup(); } });
  }).observe(document.documentElement, { childList: true, subtree: true });
}
