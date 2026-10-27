// Homepage image registry. Swap paths here to replace artwork; components never hardcode paths.
// Location photos: Wikipedia / Wikimedia Commons (free licenses).
// Character renders (/characters, /home/ezio-hero.webp, /home/templar.jpg, /home/apple.png) are
// Ubisoft artwork from the Assassin's Creed wiki: private use only, replace before any public release.
export const HERO_BG = '/home/hero.jpg';
export const HERO_FIGURE = '/home/ezio-hero.webp';
export const HERO_FIGURE_FALLBACK = '/characters/edward.png';

export interface FeaturedLocation { id: string; name: string; game: string; image: string; blurb: string; boardSpace?: number }
export const FEATURED_LOCATIONS: FeaturedLocation[] = [
  { id: 'masyaf', name: 'Masyaf', game: "Assassin's Creed I", image: '/places/Masyaf_Castle.jpg', boardSpace: 1,
    blurb: 'The mountain fortress of the Levantine Brotherhood. The cheapest property on the board and the first step of every empire.' },
  { id: 'florence', name: 'Florence', game: 'Ezio Trilogy', image: '/places/Florence_Cathedral.jpg', boardSpace: 13,
    blurb: 'Banking capital of the Renaissance. Part of the Italy group with Venice and Rome; a full set doubles your rent.' },
  { id: 'havana', name: 'Havana', game: 'Black Flag', image: '/places/Havana.jpg', boardSpace: 21,
    blurb: 'Jewel of the Spanish Main. Pairs with Nassau in the Caribbean group.' },
  { id: 'alexandria', name: 'Alexandria', game: 'Origins', image: '/places/Giza_pyramid_complex.jpg', boardSpace: 6,
    blurb: 'City of the Great Library on the Nile delta. Pairs with Giza in the Ptolemaic Egypt group.' },
  { id: 'london', name: 'London', game: 'Syndicate', image: '/places/Palace_of_Westminster.jpg', boardSpace: 30,
    blurb: 'The most expensive location in the game. A Headquarters here can end a rival in one visit.' },
  { id: 'baghdad', name: 'Baghdad', game: 'Mirage', image: '/places/Baghdad.jpg', boardSpace: 4,
    blurb: 'The Round City of the Abbasids. Completes the Holy Land group with Masyaf and Jerusalem.' },
  { id: 'greece', name: 'Greece', game: 'Odyssey', image: '/places/Parthenon.jpg', boardSpace: 9,
    blurb: 'Athens and Sparta form the Hellas group. Kassandra shrugs off half of every Templar penalty.' },
  { id: 'norway', name: 'Norway', game: 'Valhalla', image: '/home/norway.jpg', boardSpace: 25,
    blurb: 'Fjords of the north. Eivor’s raiders carve out Ravensthorpe and Jorvik in the Viking era.' },
];

export const FEATURE_ART = {
  assassins: { src: '/home/ezio-hero.webp', size: '330% auto', pos: '50% 3%' },
  locations: { src: '/places/Florence_Cathedral.jpg', size: 'cover', pos: '50% 50%' },
  events: { src: '/home/apple.png', size: '62% auto', pos: '50% 50%' },
  friends: { src: '/home/templar.jpg', size: '190% auto', pos: '78% 14%' },
};
