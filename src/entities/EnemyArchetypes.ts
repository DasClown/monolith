import type { DamageType, EnemyKind } from '../core/types';

export interface EnemyArchetype {
  kind: EnemyKind;
  name: string;
  health: number;
  damage: number;
  speed: number;
  radius: number;
  reward: number;
  armor: number;
  resistances: Partial<Record<DamageType, number>>;
  boss: boolean;
  unlockWave: number;
  weight: number;
}

export const ENEMY_ARCHETYPES: Record<EnemyKind, EnemyArchetype> = {
  skitter: {
    kind: 'skitter',
    name: 'Skitter',
    health: 22,
    damage: 4,
    speed: 42,
    radius: 15,
    reward: 4,
    armor: 0,
    resistances: {},
    boss: false,
    unlockWave: 1,
    weight: 1,
  },
  wisp: {
    kind: 'wisp',
    name: 'Wisp',
    health: 13,
    damage: 3,
    speed: 64,
    radius: 13,
    reward: 3,
    armor: 0,
    resistances: {},
    boss: false,
    unlockWave: 1,
    weight: 0.55,
  },
  brute: {
    kind: 'brute',
    name: 'Brute',
    health: 92,
    damage: 9,
    speed: 28,
    radius: 22,
    reward: 10,
    armor: 0.08,
    resistances: { thermal: 0.1, arc: 0.15 },
    boss: false,
    unlockWave: 3,
    weight: 0.3,
  },
  warden: {
    kind: 'warden',
    name: 'Warden',
    health: 66,
    damage: 6,
    speed: 34,
    radius: 19,
    reward: 8,
    armor: 0.3,
    resistances: { kinetic: 0.15, arc: 0.35 },
    boss: false,
    unlockWave: 6,
    weight: 0.26,
  },
  crusher: {
    kind: 'crusher',
    name: 'Crusher',
    health: 420,
    damage: 16,
    speed: 23,
    radius: 34,
    reward: 48,
    armor: 0.12,
    resistances: { kinetic: 0.12, thermal: 0.08, arc: 0.1 },
    boss: true,
    unlockWave: 5,
    weight: 0,
  },
  summoner: {
    kind: 'summoner',
    name: 'Summoner',
    health: 360,
    damage: 12,
    speed: 27,
    radius: 30,
    reward: 52,
    armor: 0.05,
    resistances: { arc: 0.35, thermal: 0.15 },
    boss: true,
    unlockWave: 10,
    weight: 0,
  },
  artillery: {
    kind: 'artillery',
    name: 'Artillery',
    health: 300,
    damage: 18,
    speed: 18,
    radius: 32,
    reward: 46,
    armor: 0.15,
    resistances: { kinetic: 0.3, arc: 0.1 },
    boss: true,
    unlockWave: 15,
    weight: 0,
  },
};

