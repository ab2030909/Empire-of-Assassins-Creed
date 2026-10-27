import type { ReactNode } from 'react';
import { Crest, IconChevron, IconClockSolid, IconGlobe, IconLayers, IconUsersSolid } from './icons';
import './howto.css';

const P = '/characters/portraits/';
const ln = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, 'aria-hidden': true };

// Small footer icons for each step
const FootIcon = {
  crest: <svg {...ln}><path d="M12 3c-1 6-4 12-8 17 3 0 5-2 6-4M12 3c1 6 4 12 8 17-3 0-5-2-6-4M12 13l2 4-2 4-2-4Z" /></svg>,
  die: <svg {...ln}><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>,
  bank: <svg {...ln}><path d="M3 9 12 4l9 5M5 9v9M9 9v9M15 9v9M19 9v9M3 20h18" /></svg>,
  blade: <svg {...ln}><path d="M12 3c-1 5-3 10-7 15h3l4-6 4 6h3c-4-5-6-10-7-15Z" /></svg>,
  clip: <svg {...ln}><rect x="5" y="4" width="14" height="17" rx="1" /><path d="M9 4V3h6v1M8.5 12l2.5 2.5 4.5-5" /></svg>,
  cup: <svg {...ln}><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 6H4c0 3 1.5 4.5 3.5 4.5M17 6h3c0 3-1.5 4.5-3.5 4.5M12 14v4M8 21h8l-1-3H9Z" /></svg>,
};

const Pip = ({ x, y }: { x: number; y: number }) => <i style={{ left: `${x}%`, top: `${y}%` }} />;
const Die = ({ face, cls }: { face: 'five' | 'crest'; cls: string }) => (
  <div className={`h2p-die ${cls}`}>
    <div className="f front">{face === 'five' ? <><Pip x={25} y={25} /><Pip x={75} y={25} /><Pip x={50} y={50} /><Pip x={25} y={75} /><Pip x={75} y={75} /></> : <Crest className="dcrest" />}</div>
    <div className="f top"><Pip x={30} y={30} /><Pip x={70} y={70} /></div>
    <div className="f side"><Crest className="dcrest" /></div>
  </div>
);

const Building = ({ tier }: { tier: 0 | 1 | 2 }) => (
  <svg viewBox="0 0 60 44" aria-hidden="true">
    <g fill="#d9b25e" stroke="#7a5a20" strokeWidth=".8">
      {tier === 0 && <><rect x="18" y="20" width="24" height="18" /><path d="M15 21 30 10l15 11Z" /><rect x="27" y="28" width="6" height="10" fill="#4a3210" /></>}
      {tier === 1 && <><rect x="10" y="18" width="40" height="20" /><path d="M8 19 30 6l22 13Z" /><rect x="15" y="24" width="4" height="8" fill="#4a3210" /><rect x="28" y="26" width="5" height="12" fill="#4a3210" /><rect x="41" y="24" width="4" height="8" fill="#4a3210" /></>}
      {tier === 2 && <><rect x="6" y="20" width="48" height="18" /><rect x="24" y="10" width="12" height="12" /><path d="M24 11 30 2l6 9Z" /><rect x="6" y="14" width="8" height="8" /><rect x="46" y="14" width="8" height="8" /><rect x="27" y="27" width="6" height="11" fill="#4a3210" /></>}
    </g>
  </svg>
);

type Step = { title: string; text: string; foot: string; icon: keyof typeof FootIcon; art: ReactNode };

const STEPS: Step[] = [
  {
    title: 'Choose Your Assassin', text: 'Pick a legendary hero with a unique ability and playstyle.', icon: 'crest',
    foot: 'Each Assassin has a special ability that can change your strategy.',
    art: (
      <div className="h2p-cards">
        {[['altair', 'c1'], ['bayek', 'c2'], ['kassandra', 'c3'], ['arno', 'c4'], ['eivor', 'c5'], ['ezio', 'c6']].map(([id, cl]) => (
          <span key={id} className={`h2p-pcard ${cl}`} style={{ backgroundImage: `url(${P}${id}-popup.png)` }} />
        ))}
      </div>
    ),
  },
  {
    title: 'Roll & Move', text: 'Roll the dice and move across iconic locations from different eras.', icon: 'die',
    foot: 'Land on cities, events or special spaces to trigger action.',
    art: (
      <div className="h2p-board">
        <div className="h2p-grid" />
        <span className="h2p-pawn" />
        <Die face="crest" cls="d1" /><Die face="five" cls="d2" />
      </div>
    ),
  },
  {
    title: 'Buy & Build', text: 'Purchase locations, build hideouts, bureaus and headquarters.', icon: 'bank',
    foot: 'Own complete regions to unlock bigger upgrades and higher rent income.',
    art: (
      <div className="h2p-build">
        <div className="h2p-city" style={{ backgroundImage: 'url(/places/Florence_Cathedral.jpg)' }} />
        <div className="h2p-tiers">
          {(['Hideout', 'Bureau', 'Headquarters'] as const).map((n, i) => (
            <figure key={n}><div className="tile"><Building tier={i as 0 | 1 | 2} /></div>
              <figcaption><b>{n}</b><small>(+{[50, 100, 200][i]}% rent)</small></figcaption></figure>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Use Abilities', text: 'Activate your Assassin’s abilities and use cards to gain an advantage.', icon: 'blade',
    foot: 'Use character abilities, Animus cards and Templar cards to change the game.',
    art: (
      <div className="h2p-abil">
        <span className="h2p-hero" style={{ backgroundImage: `url(${P}ezio-popup.png)` }} />
        <div className="h2p-acards">
          <span className="ac blue"><Crest className="dcrest" /></span>
          <span className="ac red"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7Z" fill="#c8282e" stroke="#f0d08a" strokeWidth=".6" /></svg></span>
          <span className="ac gold"><span className="orb" /></span>
        </div>
      </div>
    ),
  },
  {
    title: 'Complete Missions', text: 'Finish secret missions to earn rewards and gain influence.', icon: 'clip',
    foot: 'Complete mission objectives to earn bonus credits and special rewards.',
    art: (
      <div className="h2p-mission">
        <div className="paper">
          <h5>Mission</h5>
          <span className="who" style={{ backgroundImage: `url(${P}altair.webp)` }} />
          <p>Own 2 locations from different eras.</p>
          <div className="bar"><i /><span>1/2</span></div>
          <h6>Reward</h6>
          <b><span className="coin">◆</span>200 AC</b>
        </div>
      </div>
    ),
  },
  {
    title: 'Dominate & Win', text: 'Collect rent, grow your empire and be the last player standing.', icon: 'cup',
    foot: 'Eliminate opponents or have the highest net worth when the game ends.',
    art: (
      <div className="h2p-win">
        <span className="banner l" /><span className="banner r" />
        <div className="arch" />
        <svg className="eagle" viewBox="0 0 120 90" aria-hidden="true">
          <defs><linearGradient id="eg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset=".5" stopColor="#d9a43c" /><stop offset="1" stopColor="#7a5414" /></linearGradient></defs>
          <path fill="url(#eg)" d="M60 22c-4 0-7 3-7 7 0 2 1 4 2 5-8-2-16-8-22-18-2 8-1 14 2 19-6-2-11-6-15-12 0 9 4 16 10 20-5 0-9-2-13-5 3 9 11 15 20 16-3 2-7 3-11 3 6 5 15 6 23 3l11 12 11-12c8 3 17 2 23-3-4 0-8-1-11-3 9-1 17-7 20-16-4 3-8 5-13 5 6-4 10-11 10-20-4 6-9 10-15 12 3-5 4-11 2-19-6 10-14 16-22 18 1-1 2-3 2-5 0-4-3-7-7-7Z" />
        </svg>
        <div className="pedestal"><Crest className="dcrest" /></div>
      </div>
    ),
  },
];

export function HowToPlaySection({ onCreate, disabled }: { onCreate: () => void; disabled?: boolean }) {
  return (
    <section className="h2p" id="how" aria-labelledby="how-h">
      <div className="h2p-top">
        <div className="h2p-sky" style={{ backgroundImage: 'url(/places/Florence_Cathedral.jpg)' }} />
        <span className="h2p-side l" style={{ backgroundImage: `url(${P}ezio-popup.png)` }} />
        <span className="h2p-side r" style={{ backgroundImage: `url(${P}altair-popup.png)` }} />
        <div className="h2p-head">
          <Crest className="h2p-crest" />
          <h2 id="how-h">How to Play</h2>
          <p className="h2p-tag">Build · Control · Outplay · Become the Brotherhood</p>
          <p className="h2p-lead">A strategic board game across time. Roll the dice, buy historic locations, use your Assassin’s abilities, complete missions and outplay your friends to become the ultimate Brotherhood.</p>
        </div>
      </div>

      <ol className="h2p-steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="h2p-step" style={{ ['--i' as string]: i }}>
            <header>
              <span className="num">{i + 1}</span>
              <div><h3>{s.title}</h3><p>{s.text}</p></div>
            </header>
            <div className="h2p-art">
              {s.art}
              {/* Custom picture for this step; if the file isn't there yet, the drawn art above stays visible */}
              <img className="h2p-img" src={`/home/howto/play${i + 1}.png`} alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <footer><span className="fi">{FootIcon[s.icon]}</span><p>{s.foot}</p></footer>
            {i < STEPS.length - 1 && <span className="h2p-link" aria-hidden="true"><IconChevron size={12} /></span>}
          </li>
        ))}
      </ol>

      <div className="h2p-bottom">
        <ul className="h2p-facts">
          <li><IconUsersSolid size={26} /><div><b>2–4</b><span>Players</span></div></li>
          <li><IconClockSolid size={26} /><div><b>60 – 90 min</b><span>Playtime</span></div></li>
          <li><IconGlobe size={26} /><div><b>Online</b><span>Multiplayer</span></div></li>
          <li><IconLayers size={26} /><div><b>Multiple Eras</b><span>From Masyaf to Valhalla</span></div></li>
        </ul>
        <button className="h2p-cta" onClick={onCreate} disabled={disabled}>
          <IconUsersSolid size={26} />
          <span><small>Ready to play?</small><b>Create Room</b></span>
          <IconChevron size={20} />
        </button>
      </div>
    </section>
  );
}
