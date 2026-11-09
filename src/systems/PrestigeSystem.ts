import Decimal from 'decimal.js';
import { PRESTIGE_BALANCE } from '../config/balance';
import type { BannerAccent, PrestigeBranch, PrestigeNodeView } from '../core/types';
import type { EconomySystem } from './EconomySystem';

export interface PrestigeNodeDefinition {
  id: string;
  name: string;
  description: string;
  branch: PrestigeBranch;
  accent: BannerAccent;
  maxLevel: number;
  baseCost: number;
  requires?: string;
}

export const PRESTIGE_NODES: ReadonlyArray<PrestigeNodeDefinition> = [
  {
    id: 'strike',
    name: 'Strike Lattice',
    description: '+4% monolith damage per rank.',
    branch: 'offense',
    accent: 'pink',
    maxLevel: 5,
    baseCost: 1,
  },
  {
    id: 'crit',
    name: 'Fracture Matrix',
    description: '+2% critical chance per rank.',
    branch: 'offense',
    accent: 'pink',
    maxLevel: 5,
    baseCost: 2,
    requires: 'strike',
  },
  {
    id: 'rapid',
    name: 'Rapid Ignition',
    description: '+3% fire rate per rank.',
    branch: 'offense',
    accent: 'pink',
    maxLevel: 5,
    baseCost: 2,
    requires: 'crit',
  },
  {
    id: 'hull',
    name: 'Hull Lattice',
    description: '+6% maximum integrity per rank.',
    branch: 'defense',
    accent: 'green',
    maxLevel: 5,
    baseCost: 1,
  },
  {
    id: 'plating',
    name: 'Ablative Weave',
    description: '+1.5% damage reduction per rank.',
    branch: 'defense',
    accent: 'green',
    maxLevel: 5,
    baseCost: 2,
    requires: 'hull',
  },
  {
    id: 'repair',
    name: 'Repair Node',
    description: '+0.3 integrity regenerated per second per rank.',
    branch: 'defense',
    accent: 'green',
    maxLevel: 5,
    baseCost: 2,
    requires: 'plating',
  },
  {
    id: 'salvage',
    name: 'Salvage Logic',
    description: '+5% meta coins per rank.',
    branch: 'economy',
    accent: 'gold',
    maxLevel: 5,
    baseCost: 1,
  },
  {
    id: 'seed',
    name: 'Seed Vault',
    description: '+8 starting cash per rank.',
    branch: 'economy',
    accent: 'gold',
    maxLevel: 5,
    baseCost: 1,
    requires: 'salvage',
  },
  {
    id: 'nova-core',
    name: 'Nova Capacitor',
    description: '+5% Nova Pulse damage per rank.',
    branch: 'economy',
    accent: 'gold',
    maxLevel: 5,
    baseCost: 2,
    requires: 'seed',
  },
];

export interface PrestigeTreeModifiers {
  damage: number;
  crit: number;
  fireRate: number;
  maxHp: number;
  armor: number;
  regen: number;
  coin: number;
  startingCash: number;
  novaDamage: number;
}

const ZERO_TREE: PrestigeTreeModifiers = {
  damage: 0,
  crit: 0,
  fireRate: 0,
  maxHp: 0,
  armor: 0,
  regen: 0,
  coin: 0,
  startingCash: 0,
  novaDamage: 0,
};

export class PrestigeSystem {
  private readonly nodes = new Map<string, number>();

  constructor(nodes: Record<string, number> = {}) {
    for (const def of PRESTIGE_NODES) {
      this.nodes.set(def.id, Math.max(0, Math.floor(nodes[def.id] ?? 0)));
    }
  }

  getNodes(): Record<string, number> {
    return Object.fromEntries(this.nodes);
  }

  canPrestige(wave: number): boolean {
    return wave >= PRESTIGE_BALANCE.minWave;
  }

  getReward(wave: number): number {
    if (!this.canPrestige(wave)) return 0;
    return Math.max(1, Math.floor(wave / PRESTIGE_BALANCE.waveDivisor));
  }

  getDamageMultiplier(cores: Decimal.Value): number {
    const amount = new Decimal(cores).toNumber();
    if (!Number.isFinite(amount) || amount <= 0) return 1;
    const bonus = Math.min(
      PRESTIGE_BALANCE.maxDamageBonus,
      amount * PRESTIGE_BALANCE.damagePerCore,
    );
    return 1 + bonus;
  }

  getStartingCashBonus(cores: Decimal.Value): number {
    const amount = new Decimal(cores).toNumber();
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.floor(amount * PRESTIGE_BALANCE.startingCashPerCore);
  }

  getDamageBonusPercent(cores: Decimal.Value): number {
    return Math.round((this.getDamageMultiplier(cores) - 1) * 100);
  }

  getTier(cores: Decimal.Value): number {
    const amount = new Decimal(cores).toNumber();
    if (!Number.isFinite(amount)) return 0;
    let tier = 0;
    for (let i = 1; i < PRESTIGE_BALANCE.frameThresholds.length; i += 1) {
      if (amount >= PRESTIGE_BALANCE.frameThresholds[i]) tier = i;
      else break;
    }
    return tier;
  }

  getFrameName(cores: Decimal.Value): string {
    const frames = [
      'BLACK MONOLITH',
      'AZURE FRAME',
      'VIOLET FRAME',
      'GOLDEN FRAME',
      'SINGULARITY FRAME',
    ];
    return frames[this.getTier(cores)] ?? frames[0];
  }

  getNextFrameLabel(cores: Decimal.Value): string {
    const tier = this.getTier(cores);
    const threshold = PRESTIGE_BALANCE.frameThresholds[tier + 1];
    if (threshold === undefined) return 'MAX FRAME';
    return `NEXT FRAME AT ${threshold} CORES`;
  }

  getNodeLevel(id: string): number {
    return this.nodes.get(id) ?? 0;
  }

  getNodeCost(def: PrestigeNodeDefinition): number {
    return def.baseCost + this.getNodeLevel(def.id);
  }

  canBuyNode(def: PrestigeNodeDefinition, economy: EconomySystem): boolean {
    if (this.getNodeLevel(def.id) >= def.maxLevel) return false;
    if (def.requires && this.getNodeLevel(def.requires) <= 0) return false;
    return economy.canAffordCores(this.getNodeCost(def));
  }

  buyNode(id: string, economy: EconomySystem): { ok: boolean; message: string; level?: number } {
    const def = PRESTIGE_NODES.find((node) => node.id === id);
    if (!def) return { ok: false, message: 'Unknown ascension node.' };
    const level = this.getNodeLevel(id);
    if (level >= def.maxLevel) return { ok: false, message: 'Node already maxed.' };
    if (def.requires && this.getNodeLevel(def.requires) <= 0) {
      return { ok: false, message: 'Prerequisite node required.' };
    }
    const cost = this.getNodeCost(def);
    if (!economy.spendCores(cost)) return { ok: false, message: 'Not enough cores.' };
    this.nodes.set(id, level + 1);
    return { ok: true, message: `${def.name} upgraded.`, level: level + 1 };
  }

  getTreeModifiers(): PrestigeTreeModifiers {
    const mods = { ...ZERO_TREE };
    for (const def of PRESTIGE_NODES) {
      const level = this.getNodeLevel(def.id);
      if (level <= 0) continue;
      switch (def.id) {
        case 'strike': mods.damage += level * 0.04; break;
        case 'crit': mods.crit += level * 0.02; break;
        case 'rapid': mods.fireRate += level * 0.03; break;
        case 'hull': mods.maxHp += level * 0.06; break;
        case 'plating': mods.armor += level * 0.015; break;
        case 'repair': mods.regen += level * 0.3; break;
        case 'salvage': mods.coin += level * 0.05; break;
        case 'seed': mods.startingCash += level * 8; break;
        case 'nova-core': mods.novaDamage += level * 0.05; break;
        default: break;
      }
    }
    return mods;
  }

  getNodeViews(economy: EconomySystem): PrestigeNodeView[] {
    return PRESTIGE_NODES.map((def) => {
      const level = this.getNodeLevel(def.id);
      const locked = Boolean(def.requires && this.getNodeLevel(def.requires) <= 0);
      const cost = this.getNodeCost(def);
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        branch: def.branch,
        level,
        maxLevel: def.maxLevel,
        cost,
        canBuy: !locked && level < def.maxLevel && economy.canAffordCores(cost),
        locked,
        accent: def.accent,
      };
    });
  }
}
