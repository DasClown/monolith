import Decimal from 'decimal.js';
import type {
  TowerStats,
  UpgradeDef,
  UpgradeView,
} from '../core/types';
import { formatCompact } from '../utils/format';
import { TOWER_BALANCE } from '../config/balance';
import type { EconomySystem } from './EconomySystem';

export const UPGRADE_DEFS: ReadonlyArray<UpgradeDef> = [
  {
    id: 'damage',
    name: 'Overcharge',
    description: '+32% monolith bolt damage.',
    icon: 'bolt',
    tab: 'turret',
    currency: 'cash',
    baseCost: 14,
    growth: 1.5,
    maxLevel: 30,
    accent: 'cyan',
  },
  {
    id: 'fireRate',
    name: 'Cycle Rate',
    description: '+8.5% shots per second.',
    icon: 'cycle',
    tab: 'turret',
    currency: 'cash',
    baseCost: 18,
    growth: 1.55,
    maxLevel: 25,
    accent: 'cyan',
  },
  {
    id: 'multishot',
    name: 'Split Beam',
    description: 'Adds another bolt to every volley.',
    icon: 'split',
    tab: 'turret',
    currency: 'cash',
    baseCost: 220,
    growth: 4.2,
    maxLevel: 3,
    accent: 'pink',
  },
  {
    id: 'range',
    name: 'Targeting Array',
    description: '+5.5% lock-on range.',
    icon: 'range',
    tab: 'turret',
    currency: 'cash',
    baseCost: 28,
    growth: 1.48,
    maxLevel: 12,
    accent: 'cyan',
  },
  {
    id: 'crit',
    name: 'Fracture Rounds',
    description: '+4% critical strike chance.',
    icon: 'crit',
    tab: 'turret',
    currency: 'cash',
    baseCost: 45,
    growth: 1.62,
    maxLevel: 12,
    accent: 'pink',
  },
  {
    id: 'hull',
    name: 'Hull Plating',
    description: '+24 core integrity.',
    icon: 'hull',
    tab: 'turret',
    currency: 'cash',
    baseCost: 26,
    growth: 1.52,
    maxLevel: 15,
    accent: 'green',
  },
  {
    id: 'armor',
    name: 'Ablative Plating',
    description: '+4% incoming damage reduction, up to 60%.',
    icon: 'armor',
    tab: 'turret',
    currency: 'cash',
    baseCost: 65,
    growth: 1.72,
    maxLevel: 15,
    accent: 'green',
  },
  {
    id: 'regen',
    name: 'Nano Repair',
    description: '+0.45 integrity regenerated per second.',
    icon: 'repair',
    tab: 'turret',
    currency: 'cash',
    baseCost: 55,
    growth: 1.6,
    maxLevel: 10,
    accent: 'green',
  },
  {
    id: 'burn',
    name: 'Plasma Burn',
    description: 'Bolts ignite targets for 2.5s. Burn damage scales with the build.',
    icon: 'burn',
    tab: 'fusion',
    currency: 'cash',
    baseCost: 70,
    growth: 1.68,
    maxLevel: 12,
    accent: 'pink',
  },
  {
    id: 'slow',
    name: 'Stasis Field',
    description: 'Bolts chill targets, reducing movement speed.',
    icon: 'slow',
    tab: 'fusion',
    currency: 'cash',
    baseCost: 55,
    growth: 1.66,
    maxLevel: 10,
    accent: 'cyan',
  },
  {
    id: 'chain',
    name: 'Arc Conduit',
    description: 'Bolts arc to nearby targets for a fraction of the damage.',
    icon: 'chain',
    tab: 'fusion',
    currency: 'cash',
    baseCost: 95,
    growth: 1.78,
    maxLevel: 10,
    accent: 'violet',
  },
  {
    id: 'orbCount',
    name: 'Orbital Node',
    description: 'Deploy one more orbiting blade.',
    icon: 'orb',
    tab: 'orbits',
    currency: 'cash',
    baseCost: 180,
    growth: 5.2,
    maxLevel: 3,
    accent: 'violet',
  },
  {
    id: 'orbDamage',
    name: 'Orb Charge',
    description: '+45% orbital impact damage.',
    icon: 'orb-damage',
    tab: 'orbits',
    currency: 'cash',
    baseCost: 60,
    growth: 1.66,
    maxLevel: 15,
    accent: 'violet',
  },
  {
    id: 'orbSpeed',
    name: 'Gyro Spin',
    description: '+12% orbital rotation speed.',
    icon: 'orb-speed',
    tab: 'orbits',
    currency: 'cash',
    baseCost: 55,
    growth: 1.62,
    maxLevel: 10,
    accent: 'violet',
  },
  {
    id: 'startCash',
    name: 'Seed Capital',
    description: '+30 starting cash on every run.',
    icon: 'cash',
    tab: 'workshop',
    currency: 'coins',
    baseCost: 30,
    growth: 1.55,
    maxLevel: 10,
    accent: 'gold',
  },
  {
    id: 'training',
    name: 'Target Drill',
    description: '+6% all damage, permanently.',
    icon: 'training',
    tab: 'workshop',
    currency: 'coins',
    baseCost: 45,
    growth: 1.65,
    maxLevel: 10,
    accent: 'cyan',
  },
  {
    id: 'hullBlueprints',
    name: 'Core Blueprints',
    description: '+10 base core integrity.',
    icon: 'blueprint',
    tab: 'workshop',
    currency: 'coins',
    baseCost: 35,
    growth: 1.6,
    maxLevel: 10,
    accent: 'green',
  },
  {
    id: 'coinMagnet',
    name: 'Coin Magnet',
    description: '+8% coins from every wave clear.',
    icon: 'magnet',
    tab: 'workshop',
    currency: 'coins',
    baseCost: 55,
    growth: 1.7,
    maxLevel: 10,
    accent: 'gold',
  },
];

const RUN_UPGRADES = UPGRADE_DEFS.filter((def) => def.currency === 'cash');
const WORKSHOP_UPGRADES = UPGRADE_DEFS.filter((def) => def.currency === 'coins');

export interface PurchaseResult {
  ok: boolean;
  message: string;
  upgrade?: UpgradeDef;
  level?: number;
  cost?: Decimal;
}

export class UpgradeSystem {
  private readonly runLevels: Record<string, number> = {};
  private readonly workshopLevels: Record<string, number> = {};

  constructor(runLevels: Record<string, number> = {}, workshopLevels: Record<string, number> = {}) {
    for (const def of RUN_UPGRADES) this.runLevels[def.id] = Math.max(0, Math.floor(runLevels[def.id] ?? 0));
    for (const def of WORKSHOP_UPGRADES) {
      this.workshopLevels[def.id] = Math.max(0, Math.floor(workshopLevels[def.id] ?? 0));
    }
  }

  resetRun(): void {
    for (const def of RUN_UPGRADES) this.runLevels[def.id] = 0;
  }

  getLevel(id: string): number {
    return this.runLevels[id] ?? 0;
  }

  getWorkshopLevel(id: string): number {
    return this.workshopLevels[id] ?? 0;
  }

  getRunLevels(): Record<string, number> {
    return { ...this.runLevels };
  }

  getWorkshopLevels(): Record<string, number> {
    return { ...this.workshopLevels };
  }

  getCost(def: UpgradeDef): Decimal {
    const level = def.currency === 'cash' ? this.getLevel(def.id) : this.getWorkshopLevel(def.id);
    return new Decimal(def.baseCost)
      .times(Decimal.pow(def.growth, level))
      .ceil();
  }

  getLevelFor(def: UpgradeDef): number {
    return def.currency === 'cash' ? this.getLevel(def.id) : this.getWorkshopLevel(def.id);
  }

  canPurchase(def: UpgradeDef, economy: EconomySystem): boolean {
    const level = this.getLevelFor(def);
    if (level >= def.maxLevel) return false;
    const cost = this.getCost(def);
    return def.currency === 'cash' ? economy.canAffordCash(cost) : economy.canAffordCoins(cost);
  }

  purchase(id: string, economy: EconomySystem): PurchaseResult {
    const def = UPGRADE_DEFS.find((item) => item.id === id);
    if (!def) return { ok: false, message: 'Unknown upgrade.' };
    const level = this.getLevelFor(def);
    if (level >= def.maxLevel) return { ok: false, message: `${def.name} is maxed.` };

    const cost = this.getCost(def);
    const paid = def.currency === 'cash' ? economy.spendCash(cost) : economy.spendCoins(cost);
    if (!paid) {
      return {
        ok: false,
        message: def.currency === 'cash' ? 'Not enough cash.' : 'Not enough coins.',
      };
    }

    if (def.currency === 'cash') this.runLevels[def.id] = level + 1;
    else this.workshopLevels[def.id] = level + 1;

    return { ok: true, message: `${def.name} upgraded.`, upgrade: def, level: level + 1, cost };
  }

  /** Workshop ranks are automatic milestones from total permanent upgrades. */
  getWorkshopRank(): number {
    const total = WORKSHOP_UPGRADES.reduce((sum, def) => sum + this.getWorkshopLevel(def.id), 0);
    return Math.min(10, 1 + Math.floor(total / 4));
  }

  getWorkshopProgress(): { rank: number; total: number; nextAt: number; text: string } {
    const total = WORKSHOP_UPGRADES.reduce((sum, def) => sum + this.getWorkshopLevel(def.id), 0);
    const rank = Math.min(10, 1 + Math.floor(total / 4));
    const nextAt = rank >= 10 ? total : rank * 4;
    return {
      rank,
      total,
      nextAt,
      text: rank >= 10 ? 'MAX RANK' : `${total}/${nextAt} TO RANK ${rank + 1}`,
    };
  }

  getWorkshopCoinMultiplier(): number {
    const coinMagnet = this.getWorkshopLevel('coinMagnet');
    const rank = this.getWorkshopRank();
    const balance = TOWER_BALANCE.workshop;
    return (
      (1 + coinMagnet * balance.coinPerMagnetLevel) *
      (1 + rank * balance.rankCoin)
    );
  }

  getStartingCash(): number {
    const balance = TOWER_BALANCE.workshop;
    return balance.startingCash + this.getWorkshopLevel('startCash') * balance.startingCashPerLevel;
  }

  getStats(): TowerStats {
    const base = TOWER_BALANCE.base;
    const run = TOWER_BALANCE.run;
    const workshopBalance = TOWER_BALANCE.workshop;
    const status = TOWER_BALANCE.status;

    const damageLevel = this.getLevel('damage');
    const fireRateLevel = this.getLevel('fireRate');
    const rangeLevel = this.getLevel('range');
    const critLevel = this.getLevel('crit');
    const hullLevel = this.getLevel('hull');
    const armorLevel = this.getLevel('armor');
    const regenLevel = this.getLevel('regen');
    const multishotLevel = this.getLevel('multishot');
    const orbCountLevel = this.getLevel('orbCount');
    const orbDamageLevel = this.getLevel('orbDamage');
    const orbSpeedLevel = this.getLevel('orbSpeed');
    const burnLevel = this.getLevel('burn');
    const slowLevel = this.getLevel('slow');
    const chainLevel = this.getLevel('chain');

    const training = this.getWorkshopLevel('training');
    const blueprints = this.getWorkshopLevel('hullBlueprints');
    const rank = this.getWorkshopRank();
    const workshopDamage =
      (1 + training * workshopBalance.trainingDamage) *
      (1 + rank * workshopBalance.rankDamage);
    const damage = base.damage * Math.pow(run.damageMultiplier, damageLevel) * workshopDamage;

    const burnDps =
      burnLevel > 0
        ? damage * (status.burnDpsBase + (burnLevel - 1) * status.burnDpsPerLevel)
        : 0;
    const slowFactor =
      slowLevel > 0
        ? Math.min(status.slowCap, status.slowBase + (slowLevel - 1) * status.slowPerLevel)
        : 0;
    const chainCount = chainLevel > 0 ? 1 + Math.floor((chainLevel - 1) / 3) : 0;
    const chainDamage =
      chainLevel > 0
        ? status.chainDamageBase + (chainLevel - 1) * status.chainDamagePerLevel
        : 0;
    const chainRange =
      chainLevel > 0
        ? status.chainRangeBase + (chainLevel - 1) * status.chainRangePerLevel
        : 0;

    return {
      damage,
      fireRate: base.fireRate * Math.pow(run.fireRateMultiplier, fireRateLevel),
      range: base.range * Math.pow(run.rangeMultiplier, rangeLevel),
      critChance: Math.min(run.critCap, base.critChance + critLevel * run.critPerLevel),
      critMultiplier: base.critMultiplier,
      projectiles: base.projectiles + multishotLevel,
      maxHp:
        base.maxHp +
        hullLevel * run.hpPerLevel +
        blueprints * workshopBalance.hpPerBlueprint,
      regen: base.regen + regenLevel * run.regenPerLevel,
      armor: Math.min(run.armorCap, base.armor + armorLevel * run.armorPerLevel),
      burnDps,
      burnDuration: status.burnDuration,
      slowFactor,
      slowDuration: status.slowDuration,
      chainCount,
      chainDamage,
      chainRange,
      thermalBonus: burnLevel > 0 && slowLevel > 0 ? status.thermalBonus : 0,
      chainBurn: burnLevel > 0 && chainLevel > 0,
      chainSlow: slowLevel > 0 && chainLevel > 0,
      triadNovaBonus:
        burnLevel > 0 && slowLevel > 0 && chainLevel > 0 ? status.triadNovaBonus : 0,
      orbCount: orbCountLevel,
      orbDamage:
        base.orbDamage * Math.pow(run.orbDamageMultiplier, orbDamageLevel) * workshopDamage,
      orbSpeed: base.orbSpeed * Math.pow(run.orbSpeedMultiplier, orbSpeedLevel),
      orbRadius: base.orbRadius,
      projectileSpeed: base.projectileSpeed,
    };
  }

  getUpgradeViews(economy: EconomySystem): UpgradeView[] {
    return UPGRADE_DEFS.map((def) => {
      const level = this.getLevelFor(def);
      const cost = this.getCost(def);
      const maxed = level >= def.maxLevel;
      const affordable = !maxed && (def.currency === 'cash' ? economy.canAffordCash(cost) : economy.canAffordCoins(cost));
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        tab: def.tab,
        currency: def.currency,
        level,
        maxLevel: def.maxLevel,
        costLabel: maxed ? 'MAX' : formatCompact(cost),
        affordable,
        maxed,
        accent: def.accent,
      };
    });
  }
}
