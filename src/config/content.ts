import type { BannerAccent, UpgradeIcon, WaveMutatorId } from '../core/types';

export interface MutatorDefinition {
  id: WaveMutatorId;
  name: string;
  short: string;
  description: string;
  accent: BannerAccent;
  icon: UpgradeIcon;
  healthMultiplier: number;
  speedMultiplier: number;
  armorBonus: number;
  shieldFraction: number;
  regenFraction: number;
  rewardMultiplier: number;
}

export const MUTATOR_DEFS: Record<WaveMutatorId, MutatorDefinition> = {
  armored: {
    id: 'armored',
    name: 'Armored',
    short: 'ARM',
    description: 'Reinforced hulls gain +18% damage resistance and +15% health.',
    accent: 'cyan',
    icon: 'armor',
    healthMultiplier: 1.15,
    speedMultiplier: 1,
    armorBonus: 0.18,
    shieldFraction: 0,
    regenFraction: 0,
    rewardMultiplier: 1.12,
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    short: 'SPD',
    description: 'Overclocked legs move 32% faster.',
    accent: 'green',
    icon: 'cycle',
    healthMultiplier: 1,
    speedMultiplier: 1.32,
    armorBonus: 0,
    shieldFraction: 0,
    regenFraction: 0,
    rewardMultiplier: 1.1,
  },
  regenerating: {
    id: 'regenerating',
    name: 'Regenerating',
    short: 'REG',
    description: 'Living hulls knit themselves back together over time.',
    accent: 'pink',
    icon: 'repair',
    healthMultiplier: 1.08,
    speedMultiplier: 1,
    armorBonus: 0,
    shieldFraction: 0,
    regenFraction: 0.022,
    rewardMultiplier: 1.15,
  },
  shielded: {
    id: 'shielded',
    name: 'Shielded',
    short: 'SHD',
    description: 'A phase shield absorbs 40% of maximum health before the hull is exposed.',
    accent: 'violet',
    icon: 'shield',
    healthMultiplier: 1,
    speedMultiplier: 1,
    armorBonus: 0,
    shieldFraction: 0.4,
    regenFraction: 0,
    rewardMultiplier: 1.16,
  },
};

export const MUTATOR_ORDER: WaveMutatorId[] = [
  'armored',
  'swift',
  'regenerating',
  'shielded',
];

export interface SynergyDefinition {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  icon: UpgradeIcon;
  accent: BannerAccent;
}

export const SYNERGY_DEFS: ReadonlyArray<SynergyDefinition> = [
  {
    id: 'thermal',
    name: 'Thermal Shock',
    description: 'Burning, slowed enemies take +18% monolith bolt damage.',
    requirements: ['burn', 'slow'],
    icon: 'burn',
    accent: 'pink',
  },
  {
    id: 'conductive-ash',
    name: 'Conductive Ash',
    description: 'Arc Conduit spreads Plasma Burn to chained targets.',
    requirements: ['burn', 'chain'],
    icon: 'chain',
    accent: 'violet',
  },
  {
    id: 'cryo-conduction',
    name: 'Cryo Conduction',
    description: 'Arc Conduit applies Stasis slow to chained targets.',
    requirements: ['slow', 'chain'],
    icon: 'slow',
    accent: 'cyan',
  },
  {
    id: 'triad',
    name: 'Triad Cascade',
    description: 'All three elements online: Nova Pulse deals +25% damage.',
    requirements: ['burn', 'slow', 'chain'],
    icon: 'sparkle',
    accent: 'gold',
  },
];
