import type { AbilityId, AbilityView, BannerAccent, AbilityIcon } from '../core/types';

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  shortName: string;
  description: string;
  icon: AbilityIcon;
  accent: BannerAccent;
  cooldown: number;
}

export const ABILITY_DEFS: Record<AbilityId, AbilityDefinition> = {
  nova: {
    id: 'nova',
    name: 'Nova Pulse',
    shortName: 'NOVA',
    description: 'Radial blast that damages every hostile in range.',
    icon: 'bolt',
    accent: 'violet',
    cooldown: 24,
  },
  aegis: {
    id: 'aegis',
    name: 'Aegis Field',
    shortName: 'AEGIS',
    description: 'Gain a barrier equal to 35% integrity and repair 10% health.',
    icon: 'shield',
    accent: 'green',
    cooldown: 32,
  },
  overdrive: {
    id: 'overdrive',
    name: 'Overdrive',
    shortName: 'DRIVE',
    description: '+60% fire rate and +25% damage for 8 seconds.',
    icon: 'fast',
    accent: 'gold',
    cooldown: 40,
  },
};

export const ABILITY_ORDER: AbilityId[] = ['nova', 'aegis', 'overdrive'];

const DEFAULT_LOADOUT: [AbilityId, AbilityId] = ['nova', 'aegis'];

/**
 * Equipable active abilities with independent cooldowns. Effects are applied by
 * GameSession, keeping this system focused on loadout and readiness.
 */
export class AbilitySystem {
  private slots: [AbilityId, AbilityId];
  private readonly cooldowns: Record<AbilityId, number> = {
    nova: 0,
    aegis: 0,
    overdrive: 0,
  };

  constructor(loadout: readonly AbilityId[] = DEFAULT_LOADOUT) {
    const first = ABILITY_ORDER.includes(loadout[0]) ? loadout[0] : DEFAULT_LOADOUT[0];
    const secondCandidate = ABILITY_ORDER.includes(loadout[1]) ? loadout[1] : DEFAULT_LOADOUT[1];
    this.slots = [first, secondCandidate === first ? this.other(first) : secondCandidate];
  }

  getLoadout(): [AbilityId, AbilityId] {
    return [...this.slots];
  }

  update(dt: number): void {
    for (const id of ABILITY_ORDER) {
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
    }
  }

  canUse(id: AbilityId): boolean {
    return this.cooldowns[id] <= 0;
  }

  startCooldown(id: AbilityId, cooldownScale = 1): void {
    this.cooldowns[id] = ABILITY_DEFS[id].cooldown * Math.max(0.25, cooldownScale);
  }

  resetCooldowns(): void {
    for (const id of ABILITY_ORDER) this.cooldowns[id] = 0;
  }

  equip(slot: number, id: AbilityId): boolean {
    if (slot !== 0 && slot !== 1) return false;
    if (!ABILITY_ORDER.includes(id)) return false;
    const current = this.slots[slot];
    if (current === id) return true;
    const otherSlot = slot === 0 ? 1 : 0;
    if (this.slots[otherSlot] === id) {
      this.slots[otherSlot] = current;
    }
    this.slots[slot] = id;
    return true;
  }

  getViews(novaCooldownScale = 1): AbilityView[] {
    return this.slots.map((id, slot) => {
      const def = ABILITY_DEFS[id];
      const cooldownMax = def.cooldown * (id === 'nova' ? Math.max(0.25, novaCooldownScale) : 1);
      return {
        id,
        slot,
        name: def.name,
        shortName: def.shortName,
        description: def.description,
        icon: def.icon,
        accent: def.accent,
        cooldown: this.cooldowns[id],
        cooldownMax,
        ready: this.cooldowns[id] <= 0,
      };
    });
  }

  private other(id: AbilityId): AbilityId {
    const fallback = ABILITY_ORDER.find((candidate) => candidate !== id);
    return fallback ?? 'nova';
  }
}
