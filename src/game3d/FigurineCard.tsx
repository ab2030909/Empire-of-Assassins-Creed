// Card that opens when a pawn is clicked: a rotatable 3D view of the character's figurine plus their details.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BOARD, charById } from '../../shared/data';
import { GameState, PlayerState, abilityReady, abilityCooldownLeft, netWorth } from '../../shared/engine';
import { PAWN_MODELS, loadModel } from './Board3D';
import './figurine.css';

function FigurineViewer({ character }: { character: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'none'>('loading');

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    camera.position.set(0, 0.9, 3.1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.65, 0); controls.enableDamping = true; controls.enablePan = false;
    controls.minDistance = 1.2; controls.maxDistance = 5; controls.autoRotate = true; controls.autoRotateSpeed = 1.6;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    scene.add(new THREE.HemisphereLight('#fff2e0', '#2a1a14', 1.2));
    const key = new THREE.DirectionalLight('#fff1dc', 2.8); key.position.set(2, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight('#c8282e', 1.6); rim.position.set(-3, 2, -3); scene.add(rim);
    const gold = new THREE.MeshStandardMaterial({ color: '#d9b25e', metalness: 0.9, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.08, 48), gold); base.position.y = -0.04; scene.add(base);

    let alive = true;
    const url = PAWN_MODELS[character];
    if (url) loadModel(url).then((tpl) => {
      if (!alive) return;
      if (!tpl) { setState('none'); return; }
      const m = tpl.clone(true);
      // model pawns are normalised to 1.3 tall in Board3D; keep that and centre the camera on it
      scene.add(m); setState('ok');
    }); else setState('none');

    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
    loop();
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      base.geometry.dispose(); gold.dispose(); renderer.dispose(); el.removeChild(renderer.domElement);
    };
  }, [character]);

  return (
    <div className="fig-view" ref={host} role="img" aria-label="3D figurine. Drag to rotate, scroll to zoom.">
      {state === 'loading' && <span className="fig-msg">Loading figurine…</span>}
      {state === 'none' && <span className="fig-msg">No 3D figurine for this assassin.</span>}
      <span className="fig-hint">Drag to rotate · scroll to zoom</span>
    </div>
  );
}

export function FigurineCard({ g, p, isMe, onClose }: { g: GameState; p: PlayerState; isMe: boolean; onClose: () => void }) {
  const ch = charById(p.character)!;
  const ready = abilityReady(g, p);
  const cd = abilityCooldownLeft(g, p);
  const owned = BOARD.filter((s) => g.props[s.id]?.owner === p.id);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div className="fig-back" onClick={onClose}>
      <div className="fig-card" role="dialog" aria-modal="true" aria-label={`${p.name}, ${ch.name}`} onClick={(e) => e.stopPropagation()} style={{ ['--pc' as string]: p.color }}>
        <button className="fig-x" onClick={onClose} aria-label="Close">✕</button>
        <FigurineViewer character={p.character} />
        <div className="fig-info">
          <p className="fig-era">{ch.era}</p>
          <h2>{ch.name}</h2>
          <p className="fig-title">{ch.title}</p>
          <p className="fig-player"><i />{p.name}{isMe && <em>You</em>}{p.bankrupt && <em className="out">Bankrupt</em>}</p>

          <div className="fig-stats">
            <div><span>Cash</span><b>{p.cash.toLocaleString()} AC</b></div>
            <div><span>Net worth</span><b>{netWorth(g, p).toLocaleString()} AC</b></div>
            <div><span>Position</span><b>{BOARD[p.position].name}</b></div>
            <div><span>Missions</span><b>{p.missionCount} held · {p.completedMissions.length} done</b></div>
          </div>

          <div className="fig-ability">
            <b>{ch.ability.name}</b>
            <span className={ready ? 'ok' : ''}>{ch.ability.kind === 'passive' ? 'Always active' : ready ? 'Ready' : cd > 0 ? `Cooldown ${cd} round${cd > 1 ? 's' : ''}` : 'Used this turn'}</span>
            <p>{ch.ability.description}</p>
          </div>

          <div className="fig-props">
            <span>Properties ({owned.length})</span>
            <p>{owned.length ? owned.map((s) => s.name).join(' · ') : 'None yet'}</p>
          </div>
          {(p.inJail || p.shield > 0) && <p className="fig-flags">{p.inJail && 'Desynchronized'}{p.inJail && p.shield > 0 && ' · '}{p.shield > 0 && `Shield ×${p.shield}`}</p>}
        </div>
      </div>
    </div>
  );
}
