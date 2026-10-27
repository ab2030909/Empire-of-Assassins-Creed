import { useEffect, useState } from 'react';
import './home.css';
import './settings';
import { Navbar, scrollToId } from './Navbar';
import { Hero } from './Hero';
import { FeatureCards } from './FeatureCards';
import { LocationCarousel } from './LocationCarousel';
import { CreateRoomModal, JoinRoomModal } from './RoomModals';
import { SettingsPanel } from './SettingsPanel';
import { Modal } from '../App';
import { HowToPlaySection } from './HowToPlaySection';
import { CharacterSection } from '../characters/CharacterSection';
import { Insignia } from '../art';

type Dialog = null | 'join' | 'settings' | 'credits';

export default function Home({ connected, credits }: { connected: boolean; credits: React.ReactNode }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  // Create Room is its own page at /create (optionally /create?character=ezio)
  const readRoute = () => ({ create: location.pathname === '/create', char: new URLSearchParams(location.search).get('character') ?? undefined });
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = (url: string) => { history.pushState(null, '', url); setRoute(readRoute()); window.scrollTo(0, 0); };
  const close = () => setDialog(null);
  const create = (charId?: string) => go(charId ? `/create?character=${encodeURIComponent(charId)}` : '/create');
  const join = () => setDialog('join');

  if (route.create) {
    return (
      <>
        <CreateRoomModal initialCharacter={route.char} onClose={() => go('/')} onJoin={() => { go('/'); join(); }} />
        {dialog === 'join' && <JoinRoomModal onClose={close} />}
      </>
    );
  }

  return (
    <div className="hp">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); scrollToId('features'); }}>Skip to content</a>
      <Navbar onCreate={() => create()} onJoin={join} onSettings={() => setDialog('settings')} />
      <Hero onCreate={() => create()} onJoin={join} connected={connected} />

      <main id="main" className="hp-main">
        <FeatureCards onAction={(i) => (i === 3 ? create() : scrollToId(['characters', 'locations', 'how', 'how'][i]))} />
        <LocationCarousel />

        <CharacterSection id="characters" onSelect={(c) => create(c.id)} />

        <HowToPlaySection onCreate={() => create()} disabled={!connected} />
      </main>

      <footer className="hp-footer">
        <Insignia size={28} />
        <span>Empire of Assassins · fan-made, non-commercial · not affiliated with Ubisoft</span>
        <button className="link" onClick={() => setDialog('credits')}>Credits &amp; attribution</button>
      </footer>
      {dialog === 'join' && <JoinRoomModal onClose={close} />}
      {dialog === 'settings' && <SettingsPanel onClose={close} />}
      {dialog === 'credits' && <Modal title="Credits & Attribution" onClose={close}>{credits}</Modal>}
    </div>
  );
}
