// Full 3D board (three.js): photo tiles, Brotherhood buildings, owner flags, hooded pawns that walk the track,
// physical dice, braziers with embers, and an orbitable camera. Click a tile to open its details.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BOARD, GROUPS } from '../../shared/data';
import type { GameState } from '../../shared/engine';
import { usePhoto } from '../photos';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { buildTable, stoneTexture, woodTexture } from './scenery';

/** Bakes a static group into one mesh per material (hundreds of draw calls -> a handful). */
function mergeStatic(src: THREE.Group) {
  src.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  src.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    let geo = m.geometry.clone().applyMatrix4(m.matrixWorld); if (geo.index) geo = geo.toNonIndexed();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    const mat = m.material as THREE.Material; byMat.set(mat, [...(byMat.get(mat) ?? []), geo]);
  });
  const out = new THREE.Group(); out.name = 'city';
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false); if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat); const flame = (mat as THREE.MeshBasicMaterial).blending === THREE.AdditiveBlending;
    mesh.castShadow = !flame; mesh.receiveShadow = !flame; if (flame) mesh.name = 'flame'; out.add(mesh);
    geos.forEach((g) => g.dispose());
  }
  return out;
}

const N = BOARD.length; // 32
const SIDE = N / 4; // 8
const CW = 1.55; // corner size; normal tiles are 1 wide
const WIDTHS = [CW, ...Array(SIDE - 1).fill(1), CW];
const TOTAL = WIDTHS.reduce((a, b) => a + b, 0);
const START = WIDTHS.map((_, i) => WIDTHS.slice(0, i).reduce((a, b) => a + b, 0));
const center = (k: number) => START[k] + WIDTHS[k] / 2 - TOTAL / 2;
const TILE_H = 0.16;

function gridPos(i: number) {
  if (i <= SIDE) return { row: SIDE, col: SIDE - i };
  if (i <= 2 * SIDE) return { row: SIDE - (i - SIDE), col: 0 };
  if (i <= 3 * SIDE) return { row: 0, col: i - 2 * SIDE };
  return { row: i - 3 * SIDE, col: SIDE };
}
/** Tile centre in world space and the rotation that makes its artwork face outward. */
function tileInfo(i: number) {
  const { row, col } = gridPos(i);
  const side = i % SIDE === 0 ? Math.floor(i / SIDE) % 4 : Math.floor(i / SIDE);
  const rot = [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
  const corner = i % SIDE === 0;
  return { x: center(col), z: center(row), rot, w: corner ? CW : 1, d: CW, corner };
}

const GLYPH: Record<string, string> = { start: '⟳', animus: '✦', conspiracy: '✠', eden: '◈', mission: '✉', brotherhood: '⚜', tax: '⚖', jail: '⛓', gotojail: '⚔', sanctuary: '☗' };
const LABEL: Record<string, string> = { start: 'Collect 200 AC', jail: 'Just visiting', gotojail: 'Go to Desync', sanctuary: 'Receive 100 AC', brotherhood: 'Half-price upgrade', mission: 'Secret mission' };

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' '); let line = ''; const lines: string[] = [];
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  lines.push(line);
  lines.forEach((l, k) => ctx.fillText(l, x, y + k * lh));
}

/** Draws a tile's face artwork onto a canvas (re-drawn once the photo loads). */
function paintTile(i: number, img: HTMLImageElement | null) {
  const s = BOARD[i]; const t = tileInfo(i);
  const W = 256, H = Math.round(256 * (t.d / t.w));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1512'); bg.addColorStop(1, '#0e0b0a');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const grp = s.group ? GROUPS[s.group] : null;
  let y = 0;
  if (grp) { c.fillStyle = grp.color; c.fillRect(0, 0, W, H * 0.13); y = H * 0.13; }
  if (s.kind === 'property') {
    const ph = H * 0.55;
    if (img) {
      const r = Math.max(W / img.width, ph / img.height); const iw = img.width * r, ih = img.height * r;
      c.save(); c.beginPath(); c.rect(8, y + 8, W - 16, ph - 8); c.clip();
      c.drawImage(img, (W - iw) / 2, y + 8 + (ph - 8 - ih) / 2, iw, ih); c.restore();
    } else { c.fillStyle = '#2a211b'; c.fillRect(8, y + 8, W - 16, ph - 8); }
    c.strokeStyle = '#8f6c26'; c.lineWidth = 3; c.strokeRect(8, y + 8, W - 16, ph - 8);
    y += ph + 6;
  } else {
    c.fillStyle = s.kind === 'gotojail' || s.kind === 'conspiracy' || s.kind === 'tax' ? '#c8282e' : s.kind === 'animus' || s.kind === 'mission' ? '#3f8fff' : '#d9b25e';
    c.font = `${t.corner ? 150 : 110}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(GLYPH[s.kind] ?? '◆', W / 2, H * 0.4);
    y = H * 0.66;
  }
  c.fillStyle = '#f1ebe0'; c.textAlign = 'center'; c.textBaseline = 'top';
  c.font = `600 ${t.corner ? 30 : 26}px Cinzel, Georgia, serif`;
  wrapText(c, s.name.toUpperCase(), W / 2, y + 4, W - 20, 30);
  c.font = '24px "EB Garamond", Georgia, serif'; c.fillStyle = '#d9b25e';
  const sub = s.price ? `${s.price} AC` : s.kind === 'tax' ? `−${s.amount} AC` : LABEL[s.kind] ?? '';
  if (sub) c.fillText(sub, W / 2, H - 36);
  c.strokeStyle = '#8f6c26'; c.lineWidth = 4; c.strokeRect(2, 2, W - 4, H - 4);
  return cv;
}
function crestShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.25); s.quadraticCurveTo(-0.45, 0.3, -1.05, -1.0); s.lineTo(-0.62, -1.0);
  s.quadraticCurveTo(-0.3, -0.25, 0, 0.5); s.quadraticCurveTo(0.3, -0.25, 0.62, -1.0); s.lineTo(1.05, -1.0);
  s.quadraticCurveTo(0.45, 0.3, 0, 1.25);
  const blade = new THREE.Shape();
  blade.moveTo(0, 0.12); blade.lineTo(-0.2, -0.75); blade.lineTo(0, -0.5); blade.lineTo(0.2, -0.75); blade.lineTo(0, 0.12);
  return [s, blade];
}

function diceMaterials() {
  const order = [1, 6, 2, 5, 3, 4]; // +x,-x,+y,-y,+z,-z (opposites sum to 7)
  const pips: Record<number, [number, number][]> = {
    1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]],
    5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]],
  };
  return order.map((v) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!;
    c.fillStyle = '#efe6d2'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#8f6c26'; c.lineWidth = 6; c.strokeRect(3, 3, 122, 122);
    c.fillStyle = v === 1 ? '#b0141c' : '#1a1210';
    for (const [x, y] of pips[v]) { c.beginPath(); c.arc(x * 128, y * 128, v === 1 ? 16 : 11, 0, Math.PI * 2); c.fill(); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.05 });
  });
}
/** Rotation (Euler) that puts face value v on top. */
const FACE_UP: Record<number, [number, number, number]> = { 1: [0, 0, Math.PI / 2], 6: [0, 0, -Math.PI / 2], 2: [0, 0, 0], 5: [Math.PI, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };

/** Hooded assassin pawn in the player's colour. */
function makePawn(color: string) {
  const g = new THREE.Group();
  const col = new THREE.Color(color);
  const robe = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.35), roughness: 0.7 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d9b25e', roughness: 0.3, metalness: 0.85 });
  const pts = [[0, 0], [0.2, 0], [0.21, 0.04], [0.16, 0.12], [0.12, 0.3], [0.1, 0.42], [0.06, 0.48], [0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), robe); g.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 8, 24), gold); belt.rotation.x = Math.PI / 2; belt.position.y = 0.28; g.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), dark); head.position.y = 0.55; g.add(head);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.2, 20, 1, true), robe); hood.position.set(0, 0.6, -0.015); hood.rotation.x = -0.25; g.add(hood);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: '#0b0909', roughness: 1 }));
  face.position.set(0, 0.54, 0.04); g.add(face);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.04, 28), gold); base.position.y = 0.02; base.name = 'base'; g.add(base);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; ring.visible = false; ring.name = 'ring'; g.add(ring);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.name !== 'ring') { o.castShadow = true; } });
  g.scale.setScalar(0.95);
  return g;
}

/** Brotherhood upgrades: 1 Hideout, 2 Bureau, 3 Headquarters. */
function makeBuilding(level: number, color: string) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#f2e8d6', roughness: 0.7 });
  const roof = new THREE.MeshStandardMaterial({ color: '#8a1418', roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d9b25e', metalness: 0.85, roughness: 0.3 });
  const house = (x: number) => {
    const h = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), stone); b.position.y = 0.08; h.add(b);
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.13, 4), roof); r.position.y = 0.225; r.rotation.y = Math.PI / 4; h.add(r);
    h.position.x = x; return h;
  };
  if (level === 1) g.add(house(0));
  if (level === 2) { g.add(house(-0.14)); g.add(house(0.14)); }
  if (level >= 3) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.45, 12), stone); t.position.y = 0.225; g.add(t);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 12), gold); top.position.y = 0.56; g.add(top);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.09), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
    flag.position.set(0.07, 0.72, 0); g.add(flag);
    for (const x of [-0.24, 0.24]) { const w = house(x); w.scale.setScalar(0.7); g.add(w); }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function makeFlag(color: string) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), new THREE.MeshStandardMaterial({ color: '#d9b25e', metalness: 0.8, roughness: 0.3 }));
  pole.position.y = 0.21; g.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.12, 6, 1), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7 }));
  cloth.position.set(0.09, 0.35, 0); cloth.name = 'cloth'; g.add(cloth);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

/** Character 3D models used as pawns (files in public/3d models/). Others use the hooded pawn. */
export const PAWN_MODELS: Record<string, string> = Object.fromEntries(
  ['altair', 'arno', 'basim', 'bayek', 'connor', 'edward', 'eivor', 'ezio', 'jacob', 'kassandra'].map((id) => [id, `/3d models/${id}.glb`]),
);
const modelCache = new Map<string, Promise<THREE.Object3D | null>>();
export function loadModel(url: string) {
  if (!modelCache.has(url)) {
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    modelCache.set(url, loader.loadAsync(encodeURI(url)).then((gl) => {
      const m = gl.scene;
      // normalise: 0.75 tall, centred, feet on the base
      const box = new THREE.Box3().setFromObject(m); const size = box.getSize(new THREE.Vector3());
      const s = 1.3 / (size.y || 1); m.scale.setScalar(s); // model pawns stand taller than the default hooded pawn
      const b2 = new THREE.Box3().setFromObject(m); const c = b2.getCenter(new THREE.Vector3());
      m.position.set(-c.x, -b2.min.y + 0.04, -c.z);
      // no shadows on the (high-poly) model; lift its materials slightly instead of adding a per-pawn light
      m.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; mesh.castShadow = false; mesh.receiveShadow = false;
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mt) => { const sm = mt as THREE.MeshStandardMaterial; if (sm.emissive) { sm.emissive.set('#3a3028'); sm.emissiveIntensity = 0.6; } }); });
      const wrap = new THREE.Group(); wrap.add(m);
      return wrap;
    }).catch((e) => { console.warn('Pawn model failed to load', url, e); return null; }));
  }
  return modelCache.get(url)!;
}
/** Swap the default pawn body for the character's model once it loads (keeps the gold base and turn ring). */
function applyModel(pawn: THREE.Group, character: string) {
  const url = PAWN_MODELS[character]; if (!url) return;
  loadModel(url).then((tpl) => {
    if (!tpl || !pawn.parent) return;
    pawn.children.forEach((o) => { if (o.name !== 'base' && o.name !== 'ring') o.visible = false; });
    const m = tpl.clone(true); m.name = 'model'; pawn.add(m);
  });
}

type Props = { g: GameState; selected: number | null; onSelect: (id: number) => void; view3d: boolean; onSettled?: (rollSeq: number) => void; onPawn?: (playerId: string) => void };

export default function Board3D({ g, selected, onSelect, view3d, onSettled, onPawn }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ sync: (g: GameState, sel: number | null) => void; setView: (v: boolean) => void } | null>(null);
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect;
  const onSettledRef = useRef(onSettled); onSettledRef.current = onSettled;
  const onPawnRef = useRef(onPawn); onPawnRef.current = onPawn;

  useEffect(() => {
    const el = host.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#050404', 18, 36);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = 7; controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI * 0.44; controls.enablePan = false; controls.target.set(0, 0, 0);
    const presets = { tilt: new THREE.Vector3(0, 10.5, 10.2), top: new THREE.Vector3(0, 17, 0.01) };
    camera.position.copy(presets.tilt);
    let camGoal: THREE.Vector3 | null = null;

    // lights
    scene.add(new THREE.HemisphereLight('#fff2e0', '#2a1a14', 0.9));
    const sun = new THREE.DirectionalLight('#fff1dc', 2.6); sun.position.set(-6, 14, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 }); sun.shadow.bias = -0.0005;
    scene.add(sun);
    const rim = new THREE.DirectionalLight('#c8282e', 0.8); rim.position.set(8, 5, -8); scene.add(rim);

    // table + wooden frame (board sits on the table at y = 0)
    const FRAME = TOTAL / 2 + 0.55;
    const table = buildTable(FRAME); table.group.position.y = -0.42; scene.add(table.group);
    const wood = woodTexture(); wood.repeat.set(2, 2);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(FRAME * 2, 0.42, FRAME * 2), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0.05, color: '#4a3020' }));
    frame.position.y = -0.21; frame.castShadow = frame.receiveShadow = true; scene.add(frame);
    const trimMat = new THREE.MeshStandardMaterial({ color: '#b8913f', metalness: 0.9, roughness: 0.3 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(TOTAL + 0.32, 0.05, TOTAL + 0.32), trimMat); trim.position.y = 0.01; scene.add(trim);
    const base = new THREE.Mesh(new THREE.BoxGeometry(TOTAL + 0.2, 0.1, TOTAL + 0.2), new THREE.MeshStandardMaterial({ map: woodTexture(true), color: '#6a4a30', roughness: 0.95 }));
    base.position.y = 0.03; base.receiveShadow = true; scene.add(base);

    // centre: engraved stone with relief crest, then the miniature city ring
    const innerHalf = TOTAL / 2 - CW;
    // centre picture (public/home/board-center.png); falls back to the engraved stone + 3D city if missing
    const centerMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.75, metalness: 0.1 });
    new THREE.TextureLoader().load('/home/board-center.png', (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      centerMat.map?.dispose(); centerMat.map = tx; centerMat.roughness = 0.55; centerMat.needsUpdate = true;
    });
    const stone = new THREE.Mesh(new THREE.PlaneGeometry(innerHalf * 2, innerHalf * 2), centerMat);
    stone.rotation.x = -Math.PI / 2; stone.position.y = 0.081; stone.receiveShadow = true; scene.add(stone);
    // floating solid gold crest above the centre (real 3D object, slowly turning)
    const crest = new THREE.Group();
    const crestMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(crestShape(), { depth: 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 4 }),
      new THREE.MeshStandardMaterial({ color: '#e0b860', metalness: 1, roughness: 0.2, emissive: '#4a2c00', emissiveIntensity: 0.5 }));
    crestMesh.geometry.center(); crestMesh.castShadow = true; crest.add(crestMesh);
    crest.position.set(0, 1.7, -0.3); crest.scale.setScalar(0.95); scene.add(crest);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.14, 40), trimMat); pedestal.position.set(0, 0.15, -0.3); pedestal.castShadow = pedestal.receiveShadow = true; scene.add(pedestal);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.82, 48), new THREE.MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(0, 0.23, -0.3); scene.add(halo);
    const crestLight = new THREE.PointLight('#ffd27a', 6, 5, 1.5); crestLight.position.set(0, 2.4, 0.4); scene.add(crestLight);
    const flames: THREE.Object3D[] = [];
    scene.traverse((o) => { if (o.name === 'flame') flames.push(o); });
    const glow = new THREE.PointLight('#ffb35a', 5, 7, 1.4); glow.position.set(0, 1.4, 0); scene.add(glow);
    // a few real lights; the rest of the candles glow via emissive flames
    for (const [x, z] of [[-innerHalf + 0.4, innerHalf - 0.4], [innerHalf - 0.4, -innerHalf + 0.4]]) {
      const l = new THREE.PointLight('#ff9a4a', 2.2, 3.2, 1.6); l.position.set(x, 0.5, z); l.name = 'flick'; scene.add(l);
    }
    table.candles.slice(0, 2).forEach((c) => { const l = new THREE.PointLight('#ff9a4a', 12, 11, 1.5); l.position.set(c.position.x, c.position.y + 1.5, c.position.z); l.name = 'flick'; table.group.add(l); });
    const cloths: THREE.Object3D[] = [];
    const flicks: THREE.PointLight[] = []; scene.traverse((o) => { if (o.name === 'flick') flicks.push(o as THREE.PointLight); });

    // tiles
    const tileMeshes: THREE.Mesh[] = [];
    const tileGroups: THREE.Group[] = [];
    const decoKeys: string[] = [];
    const sideMat = new THREE.MeshStandardMaterial({ color: '#5a3c1e', roughness: 0.95 });
    BOARD.forEach((s, i) => {
      const t = tileInfo(i);
      const grp = new THREE.Group(); grp.position.set(t.x, 0.07, t.z); grp.rotation.y = t.rot; scene.add(grp);
      const tex = new THREE.CanvasTexture(paintTile(i, null)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: '#000000', alphaTest: 0.5 });
      const mats = [sideMat, sideMat, top, sideMat, sideMat, sideMat];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(t.w - 0.05, TILE_H * 0.55, t.d - 0.05), mats);
      mesh.position.y = TILE_H * 0.275; mesh.castShadow = mesh.receiveShadow = true; mesh.userData.id = i;
      grp.add(mesh); tileMeshes.push(mesh); tileGroups.push(grp); decoKeys.push('');
      const url = usePhoto(s.wiki);
      if (url) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { tex.image = paintTile(i, img); tex.needsUpdate = true; }; img.src = url; }
    });

    // drifting dust motes in the candle light
    const EMB = 120; const ePos = new Float32Array(EMB * 3); const eSeed = new Float32Array(EMB);
    for (let k = 0; k < EMB; k++) { ePos.set([(Math.random() - .5) * 16, Math.random() * 4, (Math.random() - .5) * 16], k * 3); eSeed[k] = Math.random(); }
    const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({ color: '#ffc27a', size: 0.035, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(embers);

    // dice
    const dMats = diceMaterials();
    const dice = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), dMats); m.castShadow = true; scene.add(m); return m; });
    const diceHome = [new THREE.Vector3(-0.45, 0.4, 0.55), new THREE.Vector3(0.5, 0.4, 0.85)];
    dice.forEach((d, k) => d.position.copy(diceHome[k]));
    let diceAnim: { t0: number; from: THREE.Quaternion[]; to: THREE.Quaternion[]; spin: THREE.Vector3[] } | null = null;
    let lastRoll = -1;
    let reported = -2;

    // pawns
    const pawns = new Map<string, { obj: THREE.Group; shown: number; queue: number[]; hop: { from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number } | null }>();
    const slotPos = (tile: number, idx: number, count: number) => {
      const t = tileInfo(tile); const off = count > 1 ? [[-.2, -.15], [.2, -.15], [-.2, .2], [.2, .2]][idx] : [0, 0];
      return new THREE.Vector3(t.x + off[0], 0.07 + TILE_H, t.z + off[1]);
    };

    // selection highlight
    const selRing = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 1), new THREE.MeshBasicMaterial({ color: '#f0d08a', transparent: true, opacity: 0.35 }));
    selRing.visible = false; scene.add(selRing);

    let state: GameState | null = null;
    let current: string | null = null;

    function sync(gs: GameState, sel: number | null) {
      state = gs; current = gs.players[gs.current]?.id ?? null;
      // ownership, buildings, mortgage
      BOARD.forEach((_, i) => {
        const pr = gs.props[i]; const owner = gs.players.find((p) => p.id === pr?.owner);
        const key = pr ? `${pr.owner}|${pr.level}|${pr.mortgaged}` : '';
        if (key === decoKeys[i]) return; decoKeys[i] = key;
        const grp = tileGroups[i];
        grp.children.filter((c) => c.name === 'deco').forEach((c) => grp.remove(c));
        const top = (tileMeshes[i].material as THREE.MeshStandardMaterial[])[2];
        top.color.set(pr?.mortgaged ? '#555' : '#fff');
        if (!owner) return;
        const t = tileInfo(i);
        const deco = new THREE.Group(); deco.name = 'deco';
        const edge = new THREE.Mesh(new THREE.BoxGeometry(t.w - 0.04, 0.03, 0.07), new THREE.MeshStandardMaterial({ color: owner.color, emissive: owner.color, emissiveIntensity: 0.5 }));
        edge.position.set(0, TILE_H + 0.015, t.d / 2 - 0.06); deco.add(edge);
        const f = makeFlag(owner.color); f.position.set(t.w / 2 - 0.14, TILE_H, t.d / 2 - 0.16); deco.add(f);
        if (pr && pr.level > 0) { const b = makeBuilding(pr.level, owner.color); b.position.set(0, TILE_H, -t.d / 2 + 0.3); deco.add(b); }
        grp.add(deco);
        renderer.shadowMap.needsUpdate = true;
      });
      cloths.length = 0; scene.traverse((o) => { if (o.name === 'cloth') cloths.push(o); });
      // pawns
      const alive = gs.players.filter((p) => !p.bankrupt);
      for (const [id, pw] of pawns) if (!alive.some((p) => p.id === id)) { scene.remove(pw.obj); pawns.delete(id); }
      for (const p of alive) {
        let pw = pawns.get(p.id);
        if (!pw) { pw = { obj: makePawn(p.color), shown: p.position, queue: [], hop: null }; pw.obj.userData.playerId = p.id; scene.add(pw.obj); applyModel(pw.obj, p.character); pawns.set(p.id, pw); placeAll(); }
        const last = pw.queue.length ? pw.queue[pw.queue.length - 1] : pw.shown;
        if (last !== p.position) {
          const fwd = (p.position - last + N) % N;
          if (fwd > 0 && fwd <= 12 && !reduce) for (let k = 1; k <= fwd; k++) pw.queue.push((last + k) % N);
          else pw.queue.push(p.position);
        }
      }
      // dice
      if (gs.dice && gs.rollSeq !== lastRoll) {
        const first = lastRoll === -1; lastRoll = gs.rollSeq;
        const to = gs.dice.map((v, k) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...FACE_UP[v])).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (k ? -0.3 : 0.25))));
        if (first || reduce) dice.forEach((d, k) => d.quaternion.copy(to[k]));
        else diceAnim = { t0: performance.now(), from: dice.map((d) => d.quaternion.clone()), to, spin: dice.map(() => new THREE.Vector3(Math.random() * 14 + 8, Math.random() * 10, Math.random() * 14 + 8)) };
      }
      // selection
      if (sel != null) { const t = tileInfo(sel); selRing.visible = true; selRing.position.set(t.x, 0.07 + TILE_H + 0.012, t.z); selRing.rotation.y = t.rot; selRing.scale.set(t.w, 1, t.d); }
      else selRing.visible = false;
    }

    function placeAll() {
      // static placement for pawns not hopping, spreading pawns that share a tile
      if (!state) return;
      const byTile = new Map<number, string[]>();
      for (const [id, pw] of pawns) { const k = pw.shown; byTile.set(k, [...(byTile.get(k) ?? []), id]); }
      for (const [tile, ids] of byTile) ids.forEach((id, idx) => { const pw = pawns.get(id)!; if (!pw.hop) pw.obj.position.copy(slotPos(tile, idx, ids.length)); });
    }

    api.current = {
      sync,
      setView: (v) => { camGoal = (v ? presets.tilt : presets.top).clone(); },
    };

    // input
    const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    let down = { x: 0, y: 0 }; let hover = -1;
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(tileMeshes, false)[0];
      return hit ? (hit.object.userData.id as number) : -1;
    };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    /** Player id of the pawn under the pointer, if any (pawns win over tiles). */
    const pickPawn = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const objs = [...pawns.values()].map((p) => p.obj);
      let o: THREE.Object3D | null = ray.intersectObjects(objs, true).find((h) => h.object.visible && h.object.name !== 'ring')?.object ?? null;
      while (o && !o.userData.playerId) o = o.parent;
      return (o?.userData.playerId as string | undefined) ?? null;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 6) return;
      const pid = pickPawn(e); if (pid && onPawnRef.current) { onPawnRef.current(pid); return; }
      const id = pick(e); if (id >= 0) onSelectRef.current(id);
    };
    const onMove = (e: PointerEvent) => {
      const id = pick(e);
      if (id !== hover) {
        if (hover >= 0) (tileMeshes[hover].material as THREE.MeshStandardMaterial[])[2].emissive.set('#000');
        hover = id;
        if (hover >= 0) (tileMeshes[hover].material as THREE.MeshStandardMaterial[])[2].emissive.set('#2a1a06');
        renderer.domElement.style.cursor = id >= 0 ? 'pointer' : 'grab';
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onMove);

    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let raf = 0; const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05); const time = clock.elapsedTime; const now = performance.now();
      if (camGoal) { camera.position.lerp(camGoal, 0.08); if (camera.position.distanceTo(camGoal) < 0.05) camGoal = null; }
      controls.update();
      if (!reduce) {
        crest.rotation.y = time * 0.6; crest.position.y = 1.7 + Math.sin(time * 1.4) * 0.1;
        halo.scale.setScalar(1 + Math.sin(time * 1.4) * 0.05);
        flicks.forEach((l, k) => { l.userData.base ??= l.intensity; l.intensity = l.userData.base * (0.9 + Math.sin(time * 7 + k * 2.1) * 0.06 + Math.sin(time * 13 + k) * 0.04); });
        flames.forEach((f) => { const m = (f as THREE.Mesh).material as THREE.MeshBasicMaterial; m.opacity = 0.8 + Math.sin(time * 11) * 0.1 + Math.sin(time * 17) * 0.06; });
        const a = eGeo.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < EMB; k++) {
          let y = a.getY(k) + dt * (0.08 + eSeed[k] * 0.12);
          if (y > 4) y = 0.1;
          a.setX(k, a.getX(k) + Math.sin(time * 0.5 + k) * dt * 0.05);
          a.setY(k, y);
        }
        a.needsUpdate = true;
        cloths.forEach((o, k) => { o.rotation.y = Math.sin(time * 3 + k) * 0.25; });
      }
      // dice tumble
      if (diceAnim) {
        const t = (now - diceAnim.t0) / 1000; const D = 1.1;
        dice.forEach((d, k) => {
          const h = diceHome[k];
          if (t < D) {
            const p = t / D;
            d.position.set(h.x + Math.sin(p * 9) * 0.15 * (1 - p), h.y + Math.abs(Math.sin(p * Math.PI * 2.5)) * 1.4 * (1 - p), h.z - (1 - p) * 1.2);
            if (p < 0.65) d.rotateOnAxis(diceAnim!.spin[k].clone().normalize(), dt * diceAnim!.spin[k].length() * (1 - p));
            else d.quaternion.slerp(diceAnim!.to[k], (p - 0.65) / 0.35);
          } else { d.position.copy(h); d.quaternion.copy(diceAnim!.to[k]); }
        });
        if (t >= D) diceAnim = null;
      }
      // pawn hops
      let moved = false; let moving = false;
      for (const [id, pw] of pawns) {
        if (!pw.hop && pw.queue.length && !diceAnim) {
          const next = pw.queue.shift()!; const from = pw.obj.position.clone(); const to = slotPos(next, 0, 1);
          const far = (next - pw.shown + N) % N !== 1;
          pw.hop = { from, to, t0: now, dur: far ? 700 : 230 }; pw.shown = next;
        }
        if (pw.hop) {
          moving = true;
          const p = Math.min(1, (now - pw.hop.t0) / pw.hop.dur);
          pw.obj.position.lerpVectors(pw.hop.from, pw.hop.to, p);
          pw.obj.position.y = pw.hop.to.y + Math.sin(p * Math.PI) * (pw.hop.dur > 300 ? 1.2 : 0.35);
          const dir = pw.hop.to.clone().sub(pw.hop.from); if (dir.lengthSq() > 1e-4) pw.obj.rotation.y = Math.atan2(dir.x, dir.z);
          if (p >= 1) { pw.hop = null; moved = true; }
        }
        const ring = pw.obj.getObjectByName('ring')!; ring.visible = id === current;
        if (id === current && !reduce) ring.scale.setScalar(1 + Math.sin(time * 4) * 0.08);
      }
      if (moved) placeAll();
      if (moving || diceAnim) renderer.shadowMap.needsUpdate = true;
      // report once dice have landed and every pawn has finished walking
      if (state && reported !== lastRoll && !diceAnim && [...pawns.values()].every((p) => !p.hop && !p.queue.length)) {
        reported = lastRoll; onSettledRef.current?.(state.rollSeq);
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh; m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
      });
      renderer.dispose(); el.removeChild(renderer.domElement); api.current = null;
    };
  }, []);

  useEffect(() => { api.current?.sync(g, selected); }, [g, selected]);
  useEffect(() => { api.current?.setView(view3d); }, [view3d]);

  return <div ref={host} className="board3d" role="img" aria-label="3D game board. Click a space to see its details; drag to rotate, scroll to zoom." />;
}
