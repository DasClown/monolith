export type CosmeticId = 'obsidian' | 'azure' | 'magma' | 'void' | 'aurum';

export interface CosmeticDefinition {
  id: CosmeticId;
  name: string;
  tagline: string;
  cost: number;
  core: number;
  accent: number;
  projectile: number;
  orbit: number;
}

/**
 * Permanent cosmetic palettes. These only recolor the monolith, projectiles,
 * orbitals, and range indicator. They never touch combat stats.
 */
export const COSMETICS: ReadonlyArray<CosmeticDefinition> = [
  {
    id: 'obsidian',
    name: 'OBSIDIAN',
    tagline: 'The original cold-fusion signal.',
    cost: 0,
    core: 0x00f0ff,
    accent: 0xff0055,
    projectile: 0x00f0ff,
    orbit: 0x8f6bff,
  },
  {
    id: 'azure',
    name: 'AZURE VEIL',
    tagline: 'Glacier-blue containment field.',
    cost: 25,
    core: 0x4da3ff,
    accent: 0x9ff3ff,
    projectile: 0x63c7ff,
    orbit: 0x5f8dff,
  },
  {
    id: 'magma',
    name: 'MAGMA CORE',
    tagline: 'A reactor running past its limit.',
    cost: 60,
    core: 0xff7a1a,
    accent: 0xffc83d,
    projectile: 0xffa33a,
    orbit: 0xff5a1f,
  },
  {
    id: 'void',
    name: 'VOID LATTICE',
    tagline: 'Signal bleed from the dark layer.',
    cost: 120,
    core: 0xb05cff,
    accent: 0xff4fd8,
    projectile: 0xd06bff,
    orbit: 0x8f6bff,
  },
  {
    id: 'aurum',
    name: 'AURUM FRAME',
    tagline: 'A golden ascension signature.',
    cost: 250,
    core: 0xffc83d,
    accent: 0xfff0a8,
    projectile: 0xffd76a,
    orbit: 0xffb02e,
  },
];

export const DEFAULT_COSMETIC: CosmeticId = 'obsidian';

export const COSMETIC_BY_ID: Readonly<Record<CosmeticId, CosmeticDefinition>> = Object.fromEntries(
  COSMETICS.map((cosmetic) => [cosmetic.id, cosmetic]),
) as Record<CosmeticId, CosmeticDefinition>;

export function isCosmeticId(value: unknown): value is CosmeticId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COSMETIC_BY_ID, value);
}

export function cosmeticHex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}
