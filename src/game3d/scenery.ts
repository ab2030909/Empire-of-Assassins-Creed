// Procedural miniatures for the 3D board: a city ring inside the track (houses, towers, domes, landmarks,
// trees, banners, candles) and tabletop props around the board (coins, dagger, parchment, cloth, books).
import * as THREE from 'three';

/** Small deterministic RNG so the city looks the same every match. */
export function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function drawCrest(c: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string) {
  c.save(); c.translate(cx, cy); c.scale(s, s); c.fillStyle = fill;
  c.beginPath(); c.moveTo(0, -1.25); c.quadraticCurveTo(-0.45, -0.3, -1.05, 1); c.lineTo(-0.62, 1); c.quadraticCurveTo(-0.3, 0.25, 0, -0.5);
  c.quadraticCurveTo(0.3, 0.25, 0.62, 1); c.lineTo(1.05, 1); c.quadraticCurveTo(0.45, -0.3, 0, -1.25); c.fill();
  c.beginPath(); c.moveTo(0, -0.12); c.lineTo(-0.2, 0.75); c.lineTo(0, 0.5); c.lineTo(0.2, 0.75); c.closePath(); c.fill();
  c.restore();
}

export function woodTexture(dark = false) {
  const t = canvasTex(512, 512, (c) => {
    c.fillStyle = dark ? '#1c120c' : '#3a2416'; c.fillRect(0, 0, 512, 512);
    const r = seeded(dark ? 7 : 3);
    for (let i = 0; i < 140; i++) {
      c.strokeStyle = `rgba(${dark ? '0,0,0' : '20,10,4'},${0.15 + r() * 0.35})`; c.lineWidth = 1 + r() * 3;
      const y = r() * 512; c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) c.lineTo(x, y + Math.sin(x / 60 + i) * 6 + (r() - .5) * 3); c.stroke();
    }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,200,140,${r() * 0.05})`; c.fillRect(0, r() * 512, 512, 2 + r() * 6); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function stoneTexture() {
  return canvasTex(1024, 1024, (c) => {
    const S = 1024; const r = seeded(11);
    const g = c.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S * 0.72); g.addColorStop(0, '#2e2e30'); g.addColorStop(1, '#121214');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,240,220' : '0,0,0'},${r() * 0.06})`; c.fillRect(r() * S, r() * S, 2 + r() * 4, 2 + r() * 4); }
    for (let i = 0; i < 26; i++) { c.strokeStyle = `rgba(0,0,0,${0.2 + r() * 0.3})`; c.lineWidth = 1; c.beginPath(); let x = r() * S, y = r() * S; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 90; y += (r() - .5) * 90; c.lineTo(x, y); } c.stroke(); }
    // engraved rings and runes
    c.strokeStyle = '#b8913f'; c.globalAlpha = 0.75;
    for (const [rad, w] of [[0.43, 4], [0.405, 2], [0.3, 3], [0.285, 1.5]] as const) { c.lineWidth = w; c.beginPath(); c.arc(S / 2, S / 2, S * rad, 0, Math.PI * 2); c.stroke(); }
    c.save(); c.translate(S / 2, S / 2); c.font = '28px serif'; c.fillStyle = '#b8913f'; c.textAlign = 'center';
    const runes = 'ᚨᛊᛊᚨᛊᛁᚾᛊ✦ᚾᛟᚦᛁᛜ✦ᛁᛊ✦ᛏᚱᚢᛖ✦';
    for (let k = 0; k < 40; k++) { c.save(); c.rotate((k / 40) * Math.PI * 2); c.fillText(runes[k % runes.length], 0, -S * 0.355); c.restore(); }
    for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, -S * 0.43); c.lineTo(0, -S * 0.49); c.lineWidth = 3; c.stroke(); }
    c.restore(); c.globalAlpha = 1;

  });
}

// ---------- shared materials ----------
const winTex = (() => canvasTex(64, 64, (c) => {
  c.fillStyle = '#000'; c.fillRect(0, 0, 64, 64); const r = seeded(5);
  for (let y = 10; y < 60; y += 16) for (let x = 8; x < 60; x += 14) if (r() > 0.35) { c.fillStyle = `rgba(255,${170 + r() * 60},90,${0.6 + r() * 0.4})`; c.fillRect(x, y, 6, 9); }
}, false))();
const wallTex = (() => canvasTex(64, 64, (c) => {
  c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64);
  for (let y = 10; y < 60; y += 16) for (let x = 8; x < 60; x += 14) { c.fillStyle = '#3a2a1c'; c.fillRect(x, y, 6, 9); }
  c.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < 64; y += 8) c.fillRect(0, y, 64, 1);
}))();
const WALLS = ['#f2e8d6', '#e9dcc4', '#fbf4e6', '#e4d2b4', '#f6eddc'].map((color) => new THREE.MeshStandardMaterial({ color, map: wallTex, emissiveMap: winTex, emissive: '#ffb050', emissiveIntensity: 1.6, roughness: 0.85 }));
const ROOFS = ['#a3141c', '#8a1418', '#b8913f', '#c0281e', '#6a0e12'].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
const GOLD = new THREE.MeshStandardMaterial({ color: '#d9b25e', metalness: 0.9, roughness: 0.28 });
const LEAF = [new THREE.MeshStandardMaterial({ color: '#1e2e18', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#24341a', roughness: 0.9 })];
const TRUNK = new THREE.MeshStandardMaterial({ color: '#3a2414', roughness: 1 });
const WAX = new THREE.MeshStandardMaterial({ color: '#efe3c8', roughness: 0.6, emissive: '#5a3a10', emissiveIntensity: 0.3 });
const FLAME = new THREE.MeshBasicMaterial({ color: '#ffc46a', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
const BANNER = new THREE.MeshStandardMaterial({ map: canvasTex(64, 128, (c) => {
  const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#a3141c'); g.addColorStop(1, '#5a080c');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(64, 0); c.lineTo(64, 128); c.lineTo(32, 108); c.lineTo(0, 128); c.fill();
  c.strokeStyle = '#d9b25e'; c.lineWidth = 3; c.stroke(); drawCrest(c, 32, 52, 16, '#f1e6d6');
}), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });

const box = (w: number, h: number, d: number, m: THREE.Material) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.y = h / 2; return o; };

// ---------- buildings ----------
function house(r: () => number) {
  const g = new THREE.Group(); const w = 0.14 + r() * 0.1, d = 0.14 + r() * 0.08, h = 0.12 + r() * 0.2;
  g.add(box(w, h, d, WALLS[Math.floor(r() * WALLS.length)]));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.09 + r() * 0.06, 4), ROOFS[Math.floor(r() * ROOFS.length)]);
  roof.rotation.y = Math.PI / 4; roof.position.y = h + 0.05; roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(roof);
  return g;
}
function tower(r: () => number) {
  const g = new THREE.Group(); const rad = 0.06 + r() * 0.04, h = 0.35 + r() * 0.35;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.15, h, 10), WALLS[Math.floor(r() * WALLS.length)]); t.position.y = h / 2; g.add(t);
  const c = new THREE.Mesh(new THREE.ConeGeometry(rad * 1.4, 0.18 + r() * 0.15, 10), ROOFS[Math.floor(r() * 3)]); c.position.y = h + 0.1; g.add(c);
  return g;
}
function spireChurch(r: () => number) {
  const g = new THREE.Group(); const w = 0.18, h = 0.22 + r() * 0.1;
  g.add(box(w, h, 0.3, WALLS[Math.floor(r() * WALLS.length)]));
  const st = box(0.09, h + 0.25, 0.09, WALLS[0]); st.position.set(0, (h + 0.25) / 2, 0.12); g.add(st);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 8), ROOFS[2]); sp.position.set(0, h + 0.42, 0.12); g.add(sp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 4), ROOFS[0]); roof.rotation.y = Math.PI / 4; roof.position.y = h + 0.05; roof.scale.z = 1.6; g.add(roof);
  return g;
}
function domed(r: () => number, big = false) {
  const g = new THREE.Group(); const s = big ? 1.9 : 1;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 0.18 * s, 8), WALLS[Math.floor(r() * WALLS.length)]); b.position.y = 0.09 * s; g.add(b);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), big ? new THREE.MeshStandardMaterial({ color: '#d9b25e', metalness: 0.9, roughness: 0.3 }) : GOLD);
  dome.position.y = 0.18 * s; dome.scale.y = 1.25; g.add(dome);
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.03 * s, 0.07 * s, 6), GOLD); lan.position.y = 0.36 * s; g.add(lan);
  return g;
}
function pyramid() {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 4), new THREE.MeshStandardMaterial({ color: '#d9b878', roughness: 0.7, metalness: 0.15 })); p.rotation.y = Math.PI / 4; p.position.y = 0.25; g.add(p);
  const p2 = p.clone(); p2.scale.setScalar(0.55); p2.position.set(0.45, 0.14, 0.1); g.add(p2);
  return g;
}
function arena() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#efe2c8', map: wallTex, emissiveMap: winTex, emissive: '#ff9a40', emissiveIntensity: 0.6, roughness: 0.9, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.32, 28, 1, true), m); ring.position.y = 0.16; g.add(ring);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 28, 1, true), m); inner.position.y = 0.1; g.add(inner);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshStandardMaterial({ color: '#2a1e18' })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; g.add(floor);
  return g;
}
function clockTower() {
  const g = new THREE.Group();
  const t = box(0.16, 0.85, 0.16, WALLS[1]); g.add(t);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: '#ffd98a' })); face.position.set(0, 0.72, 0.081); g.add(face);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), ROOFS[2]); sp.rotation.y = Math.PI / 4; sp.position.y = 1.0; g.add(sp);
  return g;
}
function tree(r: () => number) {
  const g = new THREE.Group(); const h = 0.18 + r() * 0.2;
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, h * 0.4, 5), TRUNK); tr.position.y = h * 0.2; g.add(tr);
  const top = r() > 0.5 ? new THREE.Mesh(new THREE.ConeGeometry(0.06 + r() * 0.03, h, 7), LEAF[0]) : new THREE.Mesh(new THREE.SphereGeometry(0.07 + r() * 0.03, 8, 6), LEAF[1]);
  top.position.y = h * 0.6; g.add(top);
  return g;
}
function banner() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 5), GOLD); pole.position.y = 0.25; g.add(pole);
  const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.24, 1, 4), BANNER); cl.position.set(0.065, 0.36, 0); cl.name = 'cloth'; g.add(cl);
  return g;
}
export function candle(h = 0.12, rad = 0.025) {
  const g = new THREE.Group();
  const w = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.05, h, 10), WAX); w.position.y = h / 2; g.add(w);
  const f = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.7, 8, 6), FLAME); f.scale.set(1, 2.2, 1); f.position.y = h + rad * 1.3; f.name = 'flame'; g.add(f);
  return g;
}

/** City ring between the track and the centre stone. Returns the group and candle positions (for lights). */
export function buildCity(innerHalf: number) {
  const city = new THREE.Group(); const r = seeded(42);
  const DEPTH = 1.15; // strip width
  const landmarks: Record<number, () => THREE.Group> = { 0: pyramid, 1: () => domed(r, true), 2: arena, 3: clockTower };
  for (let side = 0; side < 4; side++) {
    const strip = new THREE.Group(); strip.rotation.y = [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
    // local frame: x along the side, z from inner edge (z = innerHalf) towards centre
    const lm = landmarks[side](); lm.position.set(-0.6 + side * 0.4, 0, innerHalf - 0.62); lm.scale.setScalar(1.05); strip.add(lm);
    for (let x = -innerHalf + 0.22; x < innerHalf - 0.15; x += 0.17 + r() * 0.12) {
      for (let row = 0; row < 3; row++) {
        const z = innerHalf - 0.17 - row * 0.33 - r() * 0.08;
        if (Math.abs(x - lm.position.x) < 0.62 && row > 0) continue;
        if (Math.abs(x - lm.position.x) < 0.5) continue;
        const k = r(); let o: THREE.Group;
        if (row === 0 && k < 0.18) o = banner();
        else if (k < 0.5) o = house(r);
        else if (k < 0.62) o = tower(r);
        else if (k < 0.7) o = spireChurch(r);
        else if (k < 0.76) o = domed(r);
        else if (k < 0.95) o = tree(r);
        else o = candle(0.08 + r() * 0.06);
        o.position.set(x + (r() - .5) * 0.06, 0, z); o.rotation.y = (r() - .5) * 0.6 + (row === 0 ? 0 : r() * Math.PI);
        if (row === 2) o.scale.setScalar(0.85);
        strip.add(o);
      }
    }
    // candle line at the very edge
    for (let x = -innerHalf + 0.3; x < innerHalf - 0.2; x += 0.55) { const c = candle(0.07, 0.018); c.position.set(x, 0, innerHalf - 0.05); strip.add(c); }
    city.add(strip);
  }
  city.traverse((o) => { if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material !== FLAME) { o.castShadow = true; o.receiveShadow = true; } });
  void DEPTH;
  return city;
}

// ---------- tabletop props ----------
function coin() {
  const top = canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(54, 50, 10, 64, 64, 64); g.addColorStop(0, '#f3d89a'); g.addColorStop(1, '#9a7330');
    c.fillStyle = g; c.beginPath(); c.arc(64, 64, 64, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6e5220'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke();
    drawCrest(c, 64, 66, 30, '#6e5220');
  });
  const side = new THREE.MeshStandardMaterial({ color: '#b8913f', metalness: 0.9, roughness: 0.35 });
  const face = new THREE.MeshStandardMaterial({ map: top, metalness: 0.8, roughness: 0.35 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 36), [side, face, face]); m.castShadow = m.receiveShadow = true;
  return m;
}
function dagger() {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.11, 0.05); sh.lineTo(2.1, 0.015); sh.lineTo(2.35, 0); sh.lineTo(2.1, -0.015); sh.lineTo(0.11, -0.05); sh.lineTo(0, 0);
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: 0.18 }));
  blade.scale.set(1, 1.6, 1); g.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), GOLD); g.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 10), new THREE.MeshStandardMaterial({ color: '#2a1810', roughness: 0.8 }));
  grip.rotation.z = Math.PI / 2; grip.position.x = -0.42; g.add(grip);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), GOLD); pommel.position.x = -0.82; g.add(pommel);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.rotation.x = -Math.PI / 2;
  return g;
}
function parchment() {
  const tex = canvasTex(512, 384, (c) => {
    const g = c.createRadialGradient(256, 192, 40, 256, 192, 300); g.addColorStop(0, '#cdb48a'); g.addColorStop(1, '#7a6040');
    c.fillStyle = g; c.fillRect(0, 0, 512, 384);
    c.strokeStyle = 'rgba(60,40,20,.5)'; c.lineWidth = 2; c.strokeRect(20, 20, 472, 344);
    drawCrest(c, 256, 170, 70, 'rgba(60,35,15,.55)');
    c.fillStyle = 'rgba(60,35,15,.5)'; c.font = 'italic 22px Georgia'; c.textAlign = 'center'; c.fillText('Nothing is true, everything is permitted', 256, 320);
  });
  const geo = new THREE.PlaneGeometry(3.2, 2.4, 16, 8); const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 1.3) * 0.04 + (Math.abs(p.getX(i)) > 1.4 ? 0.06 : 0));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}
function cloth() {
  const geo = new THREE.PlaneGeometry(5, 4, 40, 32); const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 2.2 + y) * 0.12 + Math.sin(y * 3.1) * 0.08 + Math.max(0, (x + y) * 0.1)); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#6a0a10', roughness: 0.75, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.receiveShadow = m.castShadow = true;
  return m;
}
function books() {
  const g = new THREE.Group(); const cols = ['#4a1a14', '#2a2a3a', '#3a2a14', '#1f3020'];
  let y = 0;
  cols.forEach((c, k) => { const h = 0.22 + k * 0.03; const b = new THREE.Mesh(new THREE.BoxGeometry(1.6 - k * 0.1, h, 1.1), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); b.position.y = y + h / 2; b.rotation.y = (k % 2 ? 0.12 : -0.08); y += h; b.castShadow = b.receiveShadow = true; g.add(b); });
  return g;
}

/** Table surface and props. `half` is half the board frame width. */
export function buildTable(half: number) {
  const g = new THREE.Group();
  const wt = woodTexture(true); wt.repeat.set(6, 6);
  const table = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.8, color: '#3a2c24' }));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; g.add(table);
  const add = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0) => { o.position.set(x, y, z); o.rotation.y += ry; g.add(o); return o; };
  const cl = add(cloth(), -half - 2.6, 0.05, half + 1.4, 0.5);
  void cl;
  add(parchment(), -half + 0.4, 0.03, half + 2.3, 0.25);
  add(dagger(), -half + 0.2, 0.12, half + 2.0, 0.55);
  [[-half - 1.2, half - 0.4], [half + 1.6, half + 1.6], [half + 2.6, half + 0.8], [-half + 2.8, half + 2.9]].forEach(([x, z], k) => { const c = coin(); add(c, x, 0.04 + (k === 2 ? 0.07 : 0), z); if (k === 2) { const c2 = coin(); add(c2, x + 0.1, 0.04, z + 0.15); } });
  add(books(), half + 2.6, 0, -half + 0.4, -0.3);
  add(books(), -half - 2.8, 0, -half - 0.6, 0.4);
  const candles: THREE.Group[] = [];
  for (const [x, z, h] of [[-half - 1.1, -half + 0.6, 0.9], [half + 1.3, -half - 0.6, 1.2], [half + 2.2, -half + 1.6, 0.7], [-half - 1.6, -half - 0.6, 0.6]]) {
    const c = candle(h, 0.13); add(c, x, 0, z); candles.push(c);
  }
  return { group: g, candles };
}

export const FLAME_MATERIAL = FLAME;
