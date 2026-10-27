// Replaceable content data: board, groups, characters, cards, missions.
// Swap names/values here for licensed or original content; the engine is data-driven.

export type GroupId = 'levant' | 'egypt' | 'greece' | 'italy' | 'colonial' | 'caribbean' | 'norse' | 'revolution';
export type SpaceKind =
  | 'start' | 'property' | 'animus' | 'conspiracy' | 'eden' | 'mission'
  | 'brotherhood' | 'tax' | 'jail' | 'gotojail' | 'sanctuary';

export interface Space {
  id: number;
  kind: SpaceKind;
  name: string;
  subtitle?: string;
  group?: GroupId;
  price?: number;
  amount?: number;
  wiki?: string; // Wikipedia article title used for the location photo
}

export interface GroupDef { name: string; era: string; color: string; upgradeCost: number }

export const GROUPS: Record<GroupId, GroupDef> = {
  levant: { name: 'Holy Land', era: 'AC I · Mirage', color: '#8a5a2e', upgradeCost: 50 },
  egypt: { name: 'Ptolemaic Egypt', era: 'Origins', color: '#c79a3b', upgradeCost: 60 },
  greece: { name: 'Hellas', era: 'Odyssey', color: '#3f86b8', upgradeCost: 80 },
  italy: { name: 'Renaissance Italy', era: 'AC II · Brotherhood', color: '#a12a2a', upgradeCost: 100 },
  colonial: { name: 'Colonial America', era: 'AC III', color: '#3c7a4a', upgradeCost: 120 },
  caribbean: { name: 'The Caribbean', era: 'Black Flag', color: '#1f8f8a', upgradeCost: 140 },
  norse: { name: 'Anglo-Saxon England', era: 'Valhalla', color: '#5b6e8c', upgradeCost: 160 },
  revolution: { name: 'Age of Revolution', era: 'Unity · Syndicate', color: '#6d3a8c', upgradeCost: 200 },
};

const P = (id: number, name: string, subtitle: string, group: GroupId, price: number, wiki: string): Space =>
  ({ id, kind: 'property', name, subtitle, group, price, wiki });

export const BOARD: Space[] = [
  { id: 0, kind: 'start', name: 'Animus Hub', subtitle: 'Collect 200 AC when passing' },
  P(1, 'Masyaf', 'Fortress of the Order', 'levant', 60, 'Masyaf_Castle'),
  { id: 2, kind: 'animus', name: 'Animus Event' },
  P(3, 'Jerusalem', 'City of Three Faiths', 'levant', 70, 'Jerusalem'),
  P(4, 'Baghdad', 'Round City', 'levant', 80, 'Baghdad'),
  { id: 5, kind: 'tax', name: 'Templar Tithe', amount: 100 },
  P(6, 'Alexandria', 'Great Library', 'egypt', 100, 'Alexandria'),
  P(7, 'Giza', 'Great Pyramids', 'egypt', 120, 'Giza_pyramid_complex'),
  { id: 8, kind: 'jail', name: 'Desynchronization', subtitle: 'Just visiting' },
  P(9, 'Athens', 'The Parthenon', 'greece', 140, 'Parthenon'),
  { id: 10, kind: 'conspiracy', name: 'Templar Conspiracy' },
  P(11, 'Sparta', 'Lakonia', 'greece', 150, 'Sparta'),
  { id: 12, kind: 'eden', name: 'Piece of Eden' },
  P(13, 'Florence', 'Il Duomo', 'italy', 180, 'Florence_Cathedral'),
  P(14, 'Venice', 'Grand Canal', 'italy', 190, 'Grand_Canal_(Venice)'),
  P(15, 'Rome', 'The Colosseum', 'italy', 210, 'Colosseum'),
  { id: 16, kind: 'sanctuary', name: 'Brotherhood Sanctuary', subtitle: 'Receive 100 AC' },
  P(17, 'Boston', 'Harbor District', 'colonial', 220, 'Boston'),
  { id: 18, kind: 'animus', name: 'Animus Event' },
  P(19, 'New York', 'Manhattan', 'colonial', 240, 'Manhattan'),
  { id: 20, kind: 'brotherhood', name: 'Brotherhood Bureau', subtitle: 'Next upgrade half price' },
  P(21, 'Havana', 'Spanish Main', 'caribbean', 260, 'Havana'),
  P(22, 'Nassau', 'Pirate Republic', 'caribbean', 270, 'Nassau,_Bahamas'),
  { id: 23, kind: 'conspiracy', name: 'Templar Conspiracy' },
  { id: 24, kind: 'gotojail', name: 'Templar Arrest', subtitle: 'Go to Desynchronization' },
  P(25, 'Ravensthorpe', 'Saxon Village', 'norse', 280, 'West_Stow_Anglo-Saxon_Village'),
  P(26, 'Jorvik', 'York Minster', 'norse', 290, 'York_Minster'),
  { id: 27, kind: 'mission', name: 'Mission Briefing', subtitle: 'Receive a secret mission' },
  P(28, 'Paris', 'Notre-Dame', 'revolution', 320, 'Notre-Dame_de_Paris'),
  { id: 29, kind: 'eden', name: 'Piece of Eden' },
  P(30, 'London', 'Westminster', 'revolution', 350, 'Palace_of_Westminster'),
  { id: 31, kind: 'tax', name: 'Abstergo Levy', amount: 150 },
];

export const START_CASH = 1500;
export const START_BONUS = 200;
export const JAIL_FINE = 50;
export const RENT_MULT = [1, 3, 6, 10];
export const UPGRADE_NAMES = ['None', 'Hideout', 'Brotherhood Bureau', 'Brotherhood Headquarters'];
export const baseRent = (price: number) => Math.round(price / 10);

// ---------- Characters ----------
export type AbilityKind = 'active' | 'passive' | 'triggered';
export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  era: string;
  color: string;
  ability: { name: string; kind: AbilityKind; description: string; cooldownRounds: number };
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'ezio', name: 'Ezio Auditore', title: 'Master Assassin', era: 'Renaissance', color: '#b3262e',
    ability: { name: 'Requiescat', kind: 'active', cooldownRounds: 1,
      description: 'When paying rent, choose to cut that payment by 50%. Once per round.' } },
  { id: 'edward', name: 'Edward Kenway', title: 'Pirate Captain', era: 'Golden Age of Piracy', color: '#1f8f8a',
    ability: { name: 'Plunder', kind: 'passive', cooldownRounds: 0,
      description: 'Receive an extra 50 AC every time you pass or land on the Animus Hub.' } },
  { id: 'bayek', name: 'Bayek of Siwa', title: 'Medjay', era: 'Ptolemaic Egypt', color: '#c79a3b',
    ability: { name: 'Medjay Duty', kind: 'triggered', cooldownRounds: 3,
      description: 'Landing on an Animus Event, Piece of Eden or Mission Briefing pays a 100 AC reward. Once every 3 rounds.' } },
  { id: 'eivor', name: 'Eivor Varinsdottir', title: 'Viking Raider', era: 'Viking Age', color: '#5b6e8c',
    ability: { name: 'Raid', kind: 'active', cooldownRounds: 0,
      description: 'Take 20% off one property purchase per turn. Eligible properties cost 250 AC or less.' } },
  { id: 'altair', name: 'Altaïr Ibn-La\'Ahad', title: 'Mentor of Masyaf', era: 'Third Crusade', color: '#d9d4c7',
    ability: { name: 'Creed of Masyaf', kind: 'passive', cooldownRounds: 0,
      description: 'Pay only half of every tax space (Templar Tithe, Abstergo Levy).' } },
  { id: 'kassandra', name: 'Kassandra', title: 'The Eagle Bearer', era: 'Classical Greece', color: '#3f86b8',
    ability: { name: 'Spartan Resolve', kind: 'passive', cooldownRounds: 0,
      description: 'All AC penalties from Templar Conspiracy cards are halved.' } },
  { id: 'connor', name: 'Connor Kenway', title: 'The Patriot', era: 'American Revolution', color: '#4a6a8a',
    ability: { name: 'Frontier Resolve', kind: 'passive', cooldownRounds: 0,
      description: 'Gain an extra 100 AC every time you complete a secret mission.' } },
  { id: 'arno', name: 'Arno Dorian', title: 'The Phantom', era: 'French Revolution', color: '#2f4a7a',
    ability: { name: 'Phantom Blade', kind: 'triggered', cooldownRounds: 1,
      description: 'Automatically ignore the first Templar Conspiracy card you draw each round.' } },
  { id: 'jacob', name: 'Jacob Frye', title: 'The Rook', era: 'Victorian London', color: '#8a2a2a',
    ability: { name: 'Rooks Racket', kind: 'passive', cooldownRounds: 0,
      description: 'Your Colonial America and Age of Revolution properties charge 25% more rent.' } },
  { id: 'basim', name: 'Basim Ibn Ishaq', title: 'The Hidden One', era: 'Abbasid Baghdad', color: '#b07a2a',
    ability: { name: 'Eagle Sight', kind: 'triggered', cooldownRounds: 2,
      description: 'When a drawn card would harm you, discard it and draw another. Once every 2 rounds.' } },
];
export const JACOB_GROUPS = ['colonial', 'revolution'];

export const EIVOR_MAX_PRICE = 250;
export const charById = (id: string | null | undefined) => CHARACTERS.find((c) => c.id === id);

// ---------- Cards ----------
export type Effect =
  | { type: 'gain'; amount: number }
  | { type: 'pay'; amount: number }
  | { type: 'payEach'; amount: number }
  | { type: 'collectEach'; amount: number }
  | { type: 'moveTo'; to: number }
  | { type: 'moveBy'; steps: number }
  | { type: 'extraRoll' }
  | { type: 'shield' }
  | { type: 'mission' }
  | { type: 'maintenance'; perProperty: number; perUpgrade: number }
  | { type: 'incomeBlock'; rounds: number }
  | { type: 'restrict'; rounds: number }
  | { type: 'jail' };

export interface CardDef { id: string; title: string; text: string; effect: Effect }

export const ANIMUS_CARDS: CardDef[] = [
  { id: 'a1', title: 'Synchronization Bonus', text: 'Full sync achieved. Collect 150 AC.', effect: { type: 'gain', amount: 150 } },
  { id: 'a2', title: 'Recovered Codex Page', text: 'Leonardo pays for the page. Collect 100 AC.', effect: { type: 'gain', amount: 100 } },
  { id: 'a3', title: 'Historical Tax', text: 'The city guard demands its due. Pay 75 AC.', effect: { type: 'pay', amount: 75 } },
  { id: 'a4', title: 'Leap of Faith', text: 'Gain an additional roll this turn.', effect: { type: 'extraRoll' } },
  { id: 'a5', title: 'Brotherhood Protection', text: 'Gain a shield that blocks the next Templar Conspiracy.', effect: { type: 'shield' } },
  { id: 'a6', title: 'Contract Received', text: 'Receive a new secret mission.', effect: { type: 'mission' } },
  { id: 'a7', title: 'Artifact Shard', text: 'Sell an artifact to the Order. Collect 200 AC.', effect: { type: 'gain', amount: 200 } },
  { id: 'a8', title: 'Memory Corridor', text: 'Travel to the Animus Hub and collect the bonus.', effect: { type: 'moveTo', to: 0 } },
  { id: 'a9', title: 'Rooftop Run', text: 'Sprint ahead 3 spaces.', effect: { type: 'moveBy', steps: 3 } },
  { id: 'a10', title: 'Gathering of Mentors', text: 'Each rival pays you 25 AC tribute.', effect: { type: 'collectEach', amount: 25 } },
  { id: 'a11', title: 'Gondola to Venice', text: 'Travel to Venice.', effect: { type: 'moveTo', to: 14 } },
];

export const CONSPIRACY_CARDS: CardDef[] = [
  { id: 'c1', title: 'Templar Fine', text: 'The Order levies a fine. Pay 100 AC.', effect: { type: 'pay', amount: 100 } },
  { id: 'c2', title: 'Frozen Accounts', text: 'Abstergo freezes your income: no Start bonus or card income for 1 round.', effect: { type: 'incomeBlock', rounds: 1 } },
  { id: 'c3', title: 'Bureau Inspection', text: 'Pay 25 AC per property and 40 AC per upgrade.', effect: { type: 'maintenance', perProperty: 25, perUpgrade: 40 } },
  { id: 'c4', title: 'Counter-Mission', text: 'Templars expose a target. Receive a new secret mission.', effect: { type: 'mission' } },
  { id: 'c5', title: 'Martial Law', text: 'You cannot build upgrades for 1 round.', effect: { type: 'restrict', rounds: 1 } },
  { id: 'c6', title: 'Ambushed', text: 'You are captured. Go to Desynchronization.', effect: { type: 'jail' } },
  { id: 'c7', title: 'Bribed Informants', text: 'Pay each rival 30 AC.', effect: { type: 'payEach', amount: 30 } },
  { id: 'c8', title: 'Retreat', text: 'Fall back 3 spaces.', effect: { type: 'moveBy', steps: -3 } },
  { id: 'c9', title: 'Sabotaged Supply Lines', text: 'Pay 150 AC.', effect: { type: 'pay', amount: 150 } },
  { id: 'c10', title: 'Grand Master Summons', text: 'Travel to London. You may pass the Animus Hub.', effect: { type: 'moveTo', to: 30 } },
];

export const EDEN_CARDS: CardDef[] = [
  { id: 'e1', title: 'Apple of Eden', text: 'Rivals obey. Each rival pays you 40 AC.', effect: { type: 'collectEach', amount: 40 } },
  { id: 'e2', title: 'Shroud of Eden', text: 'Fortify yourself: gain a shield that blocks the next Templar Conspiracy.', effect: { type: 'shield' } },
  { id: 'e3', title: 'Staff of Hermes', text: 'Ancient wealth flows to you. Collect 175 AC.', effect: { type: 'gain', amount: 175 } },
  { id: 'e4', title: 'Trident of Eden', text: 'Command the tide: roll again.', effect: { type: 'extraRoll' } },
  { id: 'e5', title: 'Crystal Skull', text: 'Visions of a target. Receive a secret mission.', effect: { type: 'mission' } },
];

// ---------- Missions ----------
export type MissionCond =
  | { kind: 'groups'; n: number }
  | { kind: 'fullGroup' }
  | { kind: 'reach'; space: number }
  | { kind: 'ownCount'; n: number }
  | { kind: 'cash'; n: number }
  | { kind: 'upgrade'; level: number };

export interface MissionDef { id: string; title: string; text: string; reward: number; cond: MissionCond }

export const MISSIONS: MissionDef[] = [
  { id: 'm1', title: 'Across the Ages', text: 'Own properties from 2 different eras.', reward: 150, cond: { kind: 'groups', n: 2 } },
  { id: 'm2', title: 'Keeper of Histories', text: 'Own properties from 3 different eras.', reward: 250, cond: { kind: 'groups', n: 3 } },
  { id: 'm3', title: 'Dominion', text: 'Complete a full color group.', reward: 300, cond: { kind: 'fullGroup' } },
  { id: 'm4', title: 'Return to Masyaf', text: 'End a move on Masyaf.', reward: 120, cond: { kind: 'reach', space: 1 } },
  { id: 'm5', title: 'Fog over London', text: 'End a move on London.', reward: 120, cond: { kind: 'reach', space: 30 } },
  { id: 'm6', title: 'All Roads Lead to Rome', text: 'End a move on Rome.', reward: 120, cond: { kind: 'reach', space: 15 } },
  { id: 'm7', title: 'Pirate Haven', text: 'End a move on Havana.', reward: 120, cond: { kind: 'reach', space: 21 } },
  { id: 'm8', title: 'First Hideout', text: 'Build any Brotherhood upgrade.', reward: 200, cond: { kind: 'upgrade', level: 1 } },
  { id: 'm9', title: 'War Chest', text: 'Hold 2,000 AC in cash.', reward: 200, cond: { kind: 'cash', n: 2000 } },
  { id: 'm10', title: 'Spymaster', text: 'Own 5 properties.', reward: 250, cond: { kind: 'ownCount', n: 5 } },
  { id: 'm11', title: 'The Library Awaits', text: 'End a move on Alexandria.', reward: 120, cond: { kind: 'reach', space: 6 } },
];
export const MAX_MISSIONS = 3;
