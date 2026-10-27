// Presentation data for playable characters. Gameplay (ability, cooldown) lives in shared/data.ts
// CHARACTERS, which the server engine enforces. Add a character there + an entry here to extend the roster.
// Artwork: Ubisoft renders from the Assassin's Creed wiki, private use only. Replace before public release.
import { CHARACTERS, CharacterDef } from '../../shared/data';

export type Rarity = 'Legendary' | 'Epic' | 'Rare';
export type AbilityIcon = 'eagle' | 'blade' | 'wheel' | 'eye' | 'spear' | 'axe' | 'bow' | 'mask' | 'crown' | 'hood';

export interface CharacterInfo {
  game: string;          // associated title(s)
  family: string;        // carousel grouping / era family
  rarity: Rarity;
  theme: string;         // card background accent
  icon: AbilityIcon;
  quote: string;
  art: {
    src: string;
    /** background-size / background-position for the card portrait (crops full-body renders to bust) */
    card: { size: string; pos: string };
    /** crop used for small round/square avatars */
    avatar: { size: string; pos: string };
    /** optional full image shown in the details popup instead of scene + portrait */
    popup?: string;
  };
}

const P = '/characters/portraits/';
export const CHARACTER_INFO: Record<string, CharacterInfo> = {
  altair: { game: "Assassin's Creed", family: 'Early Brotherhood', rarity: 'Legendary', theme: '#6b6f78', icon: 'eagle',
    quote: 'Nothing is true, everything is permitted.',
    art: { src: P + 'altair.webp', card: { size: '170% auto', pos: '52% 2%' }, avatar: { size: '240% auto', pos: '52% 4%' } } },
  ezio: { game: "Assassin's Creed II · Brotherhood · Revelations", family: 'Early Brotherhood', rarity: 'Legendary', theme: '#9b1c22', icon: 'blade',
    quote: 'We work in the dark to serve the light.',
    art: { src: P + 'ezio.webp', card: { size: '165% auto', pos: '50% 2%' }, avatar: { size: '320% auto', pos: '50% 6%' } } },
  connor: { game: "Assassin's Creed III", family: 'Colonial Era', rarity: 'Epic', theme: '#4a5a6e', icon: 'bow',
    quote: 'I fight for liberty, not for a flag.',
    art: { src: P + 'connor.webp', card: { size: '150% auto', pos: '45% 4%' }, avatar: { size: '330% auto', pos: '47% 6%' } } },
  edward: { game: "Assassin's Creed IV: Black Flag", family: 'Colonial Era', rarity: 'Epic', theme: '#1f5a7a', icon: 'wheel',
    quote: 'A pirate’s life, with a hidden blade.',
    art: { src: P + 'edward.webp', card: { size: '165% auto', pos: '52% 2%' }, avatar: { size: '280% auto', pos: '42% 4%' }, popup: P + 'edward-popup.png' } },
  arno: { game: "Assassin's Creed Unity", family: 'French & Victorian', rarity: 'Epic', theme: '#24365e', icon: 'mask',
    quote: 'Liberty, equality, brotherhood.',
    art: { src: P + 'arno.webp', card: { size: '190% auto', pos: '50% 1%' }, avatar: { size: '280% auto', pos: '68% 3%' } } },
  jacob: { game: "Assassin's Creed Syndicate", family: 'French & Victorian', rarity: 'Rare', theme: '#7a2420', icon: 'crown',
    quote: 'London belongs to the Rooks.',
    art: { src: P + 'jacob.webp', card: { size: '150% auto', pos: '50% 2%' }, avatar: { size: '330% auto', pos: '50% 6%' } } },
  bayek: { game: "Assassin's Creed Origins", family: 'Ancient World', rarity: 'Legendary', theme: '#9a6418', icon: 'eye',
    quote: 'The Medjay protect the people.',
    art: { src: P + 'bayek.webp', card: { size: '140% auto', pos: '48% 2%' }, avatar: { size: '330% auto', pos: '62% 4%' } } },
  kassandra: { game: "Assassin's Creed Odyssey", family: 'Ancient World', rarity: 'Legendary', theme: '#8a2420', icon: 'spear',
    quote: 'I make my own fate.',
    art: { src: P + 'kassandra.webp', card: { size: '160% auto', pos: '48% 4%' }, avatar: { size: '320% auto', pos: '47% 6%' } } },
  eivor: { game: "Assassin's Creed Valhalla", family: 'Viking & Baghdad', rarity: 'Epic', theme: '#2e5a3a', icon: 'axe',
    quote: 'Skål to the raven clan.',
    art: { src: P + 'eivor.webp', card: { size: '190% auto', pos: '50% 2%' }, avatar: { size: '280% auto', pos: '50% 4%' } } },
  basim: { game: "Assassin's Creed Mirage", family: 'Viking & Baghdad', rarity: 'Rare', theme: '#8a5a1a', icon: 'hood',
    quote: 'Hidden in plain sight.',
    art: { src: P + 'basim.jpg', card: { size: '210% auto', pos: '42% 82%' }, avatar: { size: '300% auto', pos: '46% 64%' } } },
};

const FALLBACK: CharacterInfo = {
  game: "Assassin's Creed", family: 'Brotherhood', rarity: 'Rare', theme: '#4a3a2a', icon: 'hood', quote: '',
  art: { src: '', card: { size: 'cover', pos: 'center' }, avatar: { size: 'cover', pos: 'center' } },
};

/** Per-card ambient animation. Each maps to a distinct CSS particle effect in characters.css. */
export type CardFx = 'mist' | 'embers' | 'leaves' | 'waves' | 'rain' | 'smoke' | 'sand' | 'lightning' | 'snow' | 'glint';

/** Gameplay-flavour stats shown in the popup (1–5). */
export interface CharStats { influence: number; stealth: number; economy: number; strategy: number }
export interface CharHistory { birth: string; origin: string; role: string; affiliation: string }

const PL = '/places/';
/** Extra details for the popup: stats, history, gallery scenes (board location photos). */
export const CHARACTER_PROFILE: Record<string, { stats: CharStats; history: CharHistory; scenes: { src: string; label: string }[] }> = {
  altair: { stats: { influence: 4, stealth: 5, economy: 2, strategy: 4 },
    history: { birth: 'c. 1165', origin: 'Masyaf, Levant', role: 'Assassin, Mentor', affiliation: 'Levantine Brotherhood' },
    scenes: [{ src: PL + 'Masyaf_Castle.jpg', label: 'Masyaf' }, { src: PL + 'Jerusalem.jpg', label: 'Jerusalem' }, { src: PL + 'Baghdad.jpg', label: 'Holy Land' }] },
  ezio: { stats: { influence: 5, stealth: 4, economy: 3, strategy: 4 },
    history: { birth: '1459', origin: 'Florence, Italy', role: 'Master Assassin, Mentor', affiliation: 'Italian Brotherhood' },
    scenes: [{ src: PL + 'Florence_Cathedral.jpg', label: 'Florence' }, { src: PL + 'Grand_Canal__Venice_.jpg', label: 'Venice' }, { src: PL + 'Colosseum.jpg', label: 'Rome' }] },
  connor: { stats: { influence: 3, stealth: 4, economy: 3, strategy: 4 },
    history: { birth: '1756', origin: 'Kanien\'kehá:ka village, New York', role: 'Assassin, Mentor', affiliation: 'Colonial Brotherhood' },
    scenes: [{ src: PL + 'Boston.jpg', label: 'Boston' }, { src: PL + 'Manhattan.jpg', label: 'New York' }, { src: PL + 'Havana.jpg', label: 'Frontier' }] },
  edward: { stats: { influence: 3, stealth: 3, economy: 4, strategy: 3 },
    history: { birth: 'c. 1693', origin: 'Swansea, Wales', role: 'Assassin, Pirate, Captain', affiliation: 'West Indies Brotherhood' },
    scenes: [{ src: PL + 'Nassau__Bahamas.jpg', label: 'Nassau' }, { src: PL + 'Havana.jpg', label: 'Havana' }, { src: PL + 'Boston.jpg', label: 'Atlantic' }] },
  arno: { stats: { influence: 3, stealth: 5, economy: 3, strategy: 3 },
    history: { birth: '1768', origin: 'Versailles, France', role: 'Master Assassin', affiliation: 'Parisian Brotherhood' },
    scenes: [{ src: PL + 'Notre-Dame_de_Paris.jpg', label: 'Paris' }, { src: PL + 'Palace_of_Westminster.jpg', label: 'Europe' }, { src: PL + 'Florence_Cathedral.jpg', label: 'Franciade' }] },
  jacob: { stats: { influence: 4, stealth: 2, economy: 5, strategy: 3 },
    history: { birth: '1847', origin: 'Crawley, England', role: 'Assassin, Gang Leader', affiliation: 'British Brotherhood · The Rooks' },
    scenes: [{ src: PL + 'Palace_of_Westminster.jpg', label: 'London' }, { src: PL + 'York_Minster.jpg', label: 'England' }, { src: PL + 'Notre-Dame_de_Paris.jpg', label: 'Europe' }] },
  bayek: { stats: { influence: 4, stealth: 4, economy: 3, strategy: 4 },
    history: { birth: 'c. 85 BCE', origin: 'Siwa, Egypt', role: 'Medjay, Founder', affiliation: 'The Hidden Ones' },
    scenes: [{ src: PL + 'Giza_pyramid_complex.jpg', label: 'Giza' }, { src: PL + 'Alexandria.jpg', label: 'Alexandria' }, { src: PL + 'Parthenon.jpg', label: 'Mediterranean' }] },
  kassandra: { stats: { influence: 4, stealth: 3, economy: 3, strategy: 5 },
    history: { birth: '454 BCE', origin: 'Sparta, Greece', role: 'Misthios, Keeper', affiliation: 'Independent · Isu Keeper' },
    scenes: [{ src: PL + 'Parthenon.jpg', label: 'Athens' }, { src: PL + 'Sparta.jpg', label: 'Sparta' }, { src: PL + 'Alexandria.jpg', label: 'Aegean' }] },
  eivor: { stats: { influence: 4, stealth: 3, economy: 4, strategy: 3 },
    history: { birth: 'c. 847', origin: 'Fornburg, Norway', role: 'Raider, Jarl\'s Champion', affiliation: 'Raven Clan · Hidden Ones ally' },
    scenes: [{ src: '/home/norway.jpg', label: 'Norway' }, { src: PL + 'West_Stow_Anglo-Saxon_Village.jpg', label: 'Ravensthorpe' }, { src: PL + 'York_Minster.jpg', label: 'Jorvik' }] },
  basim: { stats: { influence: 3, stealth: 5, economy: 3, strategy: 5 },
    history: { birth: 'c. 840', origin: 'Baghdad, Abbasid Caliphate', role: 'Thief, Master Assassin', affiliation: 'The Hidden Ones' },
    scenes: [{ src: PL + 'Baghdad.jpg', label: 'Baghdad' }, { src: PL + 'Jerusalem.jpg', label: 'Levant' }, { src: PL + 'Masyaf_Castle.jpg', label: 'Alamut' }] },
};

export interface CharacterLore {
  fx: CardFx;
  fxName: string;      // shown in the popup ("Ambience")
  bio: string;         // short original summary
  home: string;        // signature location on our board
  tip: string;         // strategy hint for this game's ability
  style: string;       // fighting / play style tag
}

export const CHARACTER_LORE: Record<string, CharacterLore> = {
  altair: { fx: 'mist', fxName: 'Mountain mist', home: 'Masyaf', style: 'Patient · Disciplined',
    bio: 'A brilliant but proud Assassin of the Levant who rose to become Mentor of Masyaf and rewrote the Creed for generations to come.',
    tip: 'Tax spaces barely touch you. Route through the Tithe and Levy freely and keep your cash for early Holy Land purchases.' },
  ezio: { fx: 'embers', fxName: 'Renaissance embers', home: 'Florence', style: 'Charismatic · Adaptive',
    bio: 'A Florentine noble turned Master Assassin who rebuilt the Brotherhood in Rome and spent a lifetime fighting the Borgia.',
    tip: 'Save Requiescat for expensive rents on upgraded properties; using it on a 10 AC rent wastes the round.' },
  connor: { fx: 'leaves', fxName: 'Frontier leaves', home: 'Boston', style: 'Relentless · Principled',
    bio: 'Born Ratonhnhaké:ton, he fought through the American Revolution to protect his people and the ideals of liberty.',
    tip: 'Every mission pays you double duty. Visit Mission Briefing often and stack secret missions.' },
  edward: { fx: 'waves', fxName: 'Caribbean tide', home: 'Nassau', style: 'Bold · Opportunistic',
    bio: 'A Welsh privateer chasing fortune across the Caribbean who stumbled into the Assassin–Templar war and found a cause.',
    tip: 'Fast laps mean more Plunder. Prioritise cheap properties early and keep rolling past the Hub.' },
  arno: { fx: 'rain', fxName: 'Parisian rain', home: 'Paris', style: 'Elegant · Reckless',
    bio: 'A young Assassin in Revolutionary Paris whose personal quest for redemption tangled with the fate of a nation.',
    tip: 'Your first Conspiracy each round is free. Take risky routes through Templar spaces without fear.' },
  jacob: { fx: 'smoke', fxName: 'Industrial smoke', home: 'London', style: 'Brash · Street-smart',
    bio: 'A brawling twin from Crawley who formed the Rooks gang and took back Victorian London from Templar control.',
    tip: 'Colonial and Revolution groups earn you 25% extra. Fight hard for Boston, New York, Paris and London.' },
  bayek: { fx: 'sand', fxName: 'Desert sand', home: 'Alexandria', style: 'Protective · Determined',
    bio: 'The last Medjay of Egypt, whose loss and vengeance laid the foundation of the Hidden Ones.',
    tip: 'Animus, Eden and Mission spaces pay 100 AC every three rounds. Plan routes that hit them on cooldown.' },
  kassandra: { fx: 'lightning', fxName: 'Storm of Zeus', home: 'Sparta', style: 'Fearless · Mercenary',
    bio: 'A Spartan misthios and bearer of the Spear of Leonidas who hunted the Cult of Kosmos across the Greek world.',
    tip: 'Conspiracy fines hit you at half strength. You can afford to hold less cash in reserve.' },
  eivor: { fx: 'snow', fxName: 'Northern snow', home: 'Jorvik', style: 'Fierce · Loyal',
    bio: 'A Viking raider of the Raven Clan who led a settlement into England and carved out a new home in the Danelaw.',
    tip: 'Raid knocks 20% off every eligible purchase. Snap up the cheaper half of the board quickly.' },
  basim: { fx: 'glint', fxName: 'Eagle sight', home: 'Baghdad', style: 'Cunning · Mysterious',
    bio: 'A street thief of Baghdad recruited by the Hidden Ones, whose sharp instincts hide a far older secret.',
    tip: 'Eagle Sight re-draws a harmful card every two rounds. Card spaces are safer for you than for anyone else.' },
};
const LORE_FALLBACK: CharacterLore = { fx: 'mist', fxName: 'Animus haze', home: '—', style: '—', bio: '', tip: '' };

export interface Character extends CharacterDef { info: CharacterInfo; lore: CharacterLore }
/** Display order (chronological by era). Characters not listed are appended at the end. */
const ORDER = ['altair', 'ezio', 'connor', 'edward', 'arno', 'jacob', 'bayek', 'kassandra', 'eivor', 'basim'];
const rank = (id: string) => { const i = ORDER.indexOf(id); return i < 0 ? ORDER.length : i; };
export const ROSTER: Character[] = CHARACTERS
  .map((c) => ({ ...c, info: CHARACTER_INFO[c.id] ?? FALLBACK, lore: CHARACTER_LORE[c.id] ?? LORE_FALLBACK }))
  .sort((a, b) => rank(a.id) - rank(b.id));
export const characterById = (id: string | null | undefined) => ROSTER.find((c) => c.id === id);
