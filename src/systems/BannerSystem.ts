import type {
  BannerAccent,
  BannerRarity,
  BannerView,
  TowerStats,
  UpgradeIcon,
} from '../core/types';
import type { RNG } from '../core/rng';

interface BannerModifiers {
  damage: number;
  fireRate: number;
  crit: number;
  maxHp: number;
  regen: number;
  armor: number;
  orbDamage: number;
  orbSpeed: number;
  coin: number;
  cash: number;
  novaCooldown: number;
  novaDamage: number;
}

interface BannerDefinition {
  id: string;
  name: string;
  description: string;
  icon: UpgradeIcon;
  rarity: BannerRarity;
  accent: BannerAccent;
  maxStacks: number;
  mods: Partial<BannerModifiers>;
}

const ZERO_MODS: BannerModifiers = {
  damage: 0,
  fireRate: 0,
  crit: 0,
  maxHp: 0,
  regen: 0,
  armor: 0,
  orbDamage: 0,
  orbSpeed: 0,
  coin: 0,
  cash: 0,
  novaCooldown: 0,
  novaDamage: 0,
};

export const BANNER_DEFS: ReadonlyArray<BannerDefinition> = [
  {
    id: 'overclock',
    name: 'Overclock',
    description: '+12% fire rate per stack.',
    icon: 'cycle',
    rarity: 'common',
    accent: 'cyan',
    maxStacks: 3,
    mods: { fireRate: 0.12 },
  },
  {
    id: 'fracture',
    name: 'Fracture Lattice',
    description: '+6% critical strike chance per stack.',
    icon: 'crit',
    rarity: 'rare',
    accent: 'pink',
    maxStacks: 3,
    mods: { crit: 0.06 },
  },
  {
    id: 'siege',
    name: 'Siege Plating',
    description: '+15% maximum integrity and +2.5% armor per stack.',
    icon: 'hull',
    rarity: 'rare',
    accent: 'green',
    maxStacks: 2,
    mods: { maxHp: 0.15, armor: 0.025 },
  },
  {
    id: 'nano',
    name: 'Nano Swarm',
    description: '+0.8 integrity regeneration per second.',
    icon: 'repair',
    rarity: 'common',
    accent: 'green',
    maxStacks: 3,
    mods: { regen: 0.8 },
  },
  {
    id: 'kinetic',
    name: 'Kinetic Rounds',
    description: '+12% monolith damage per stack.',
    icon: 'bolt',
    rarity: 'rare',
    accent: 'cyan',
    maxStacks: 2,
    mods: { damage: 0.12 },
  },
  {
    id: 'orbital',
    name: 'Orbital Surge',
    description: '+25% orbital damage and +8% orbit speed.',
    icon: 'orb',
    rarity: 'rare',
    accent: 'violet',
    maxStacks: 2,
    mods: { orbDamage: 0.25, orbSpeed: 0.08 },
  },
  {
    id: 'coin',
    name: 'Coin Engine',
    description: '+18% meta coins from wave clears.',
    icon: 'magnet',
    rarity: 'common',
    accent: 'gold',
    maxStacks: 3,
    mods: { coin: 0.18 },
  },
  {
    id: 'salvage',
    name: 'Salvage Rig',
    description: '+15% cash from enemy kills.',
    icon: 'cash',
    rarity: 'common',
    accent: 'gold',
    maxStacks: 3,
    mods: { cash: 0.15 },
  },
  {
    id: 'nova',
    name: 'Nova Capacitor',
    description: '-15% Nova cooldown and +20% Nova damage.',
    icon: 'sparkle',
    rarity: 'epic',
    accent: 'violet',
    maxStacks: 1,
    mods: { novaCooldown: 0.15, novaDamage: 0.2 },
  },
];

export class BannerSystem {
  private readonly owned = new Map<string, number>();

  reset(): void {
    this.owned.clear();
  }

  choose(id: string): BannerView | null {
    const def = BANNER_DEFS.find((banner) => banner.id === id);
    if (!def) return null;
    const current = this.owned.get(id) ?? 0;
    if (current >= def.maxStacks) return null;
    this.owned.set(id, current + 1);
    return this.toView(def);
  }

  createOffer(rng: RNG): BannerView[] {
    const candidates = BANNER_DEFS.filter(
      (def) => (this.owned.get(def.id) ?? 0) < def.maxStacks,
    );
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = rng.int(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3).map((def) => this.toView(def));
  }

  getViews(): BannerView[] {
    return BANNER_DEFS.filter((def) => (this.owned.get(def.id) ?? 0) > 0).map((def) =>
      this.toView(def),
    );
  }

  getCoinMultiplier(): number {
    return 1 + this.getModifiers().coin;
  }

  getCashMultiplier(): number {
    return 1 + this.getModifiers().cash;
  }

  getNovaCooldownMultiplier(): number {
    return Math.max(0.4, 1 - this.getModifiers().novaCooldown);
  }

  getNovaDamageMultiplier(): number {
    return 1 + this.getModifiers().novaDamage;
  }

  applyToStats(stats: TowerStats): TowerStats {
    const mods = this.getModifiers();
    return {
      ...stats,
      damage: stats.damage * (1 + mods.damage),
      fireRate: stats.fireRate * (1 + mods.fireRate),
      critChance: Math.min(0.85, stats.critChance + mods.crit),
      maxHp: stats.maxHp * (1 + mods.maxHp),
      regen: stats.regen + mods.regen,
      armor: Math.min(0.8, stats.armor + mods.armor),
      orbDamage: stats.orbDamage * (1 + mods.orbDamage),
      orbSpeed: stats.orbSpeed * (1 + mods.orbSpeed),
      burnDps: stats.burnDps * (1 + mods.damage),
    };
  }

  private getModifiers(): BannerModifiers {
    const result = { ...ZERO_MODS };
    for (const def of BANNER_DEFS) {
      const stacks = this.owned.get(def.id) ?? 0;
      if (stacks <= 0) continue;
      for (const key of Object.keys(def.mods) as Array<keyof BannerModifiers>) {
        result[key] += (def.mods[key] ?? 0) * stacks;
      }
    }
    return result;
  }

  private toView(def: BannerDefinition): BannerView {
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      rarity: def.rarity,
      accent: def.accent,
      stack: this.owned.get(def.id) ?? 0,
      maxStacks: def.maxStacks,
    };
  }
}
