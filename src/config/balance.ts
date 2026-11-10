/**
 * One place for the numbers that define the defense curve.
 * Tweak these values to rebalance the monolith without hunting through systems.
 */
export const TOWER_BALANCE = {
  base: {
    damage: 13,
    fireRate: 3.0,
    range: 320,
    critChance: 0.05,
    critMultiplier: 2.2,
    projectiles: 1,
    maxHp: 300,
    regen: 0.6,
    armor: 0.12,
    orbDamage: 18,
    orbSpeed: 1.35,
    orbRadius: 10,
    projectileSpeed: 620,
  },
  run: {
    damageMultiplier: 1.36,
    fireRateMultiplier: 1.1,
    rangeMultiplier: 1.055,
    critPerLevel: 0.04,
    critCap: 0.75,
    hpPerLevel: 40,
    regenPerLevel: 0.7,
    armorPerLevel: 0.07,
    armorCap: 0.82,
    orbDamageMultiplier: 1.5,
    orbSpeedMultiplier: 1.12,
  },
  workshop: {
    trainingDamage: 0.08,
    hpPerBlueprint: 10,
    rankDamage: 0.07,
    rankCoin: 0.05,
    rankArmor: 0.02,
    startingCash: 60,
    startingCashPerLevel: 35,
    coinPerMagnetLevel: 0.08,
  },
  nova: {
    cooldown: 24,
    damageMultiplier: 16,
    flatDamage: 60,
    radius: 330,
  },
  status: {
    burnDpsBase: 0.15,
    burnDpsPerLevel: 0.035,
    burnDuration: 2.5,
    slowBase: 0.12,
    slowPerLevel: 0.035,
    slowCap: 0.65,
    slowDuration: 2.2,
    chainDamageBase: 0.3,
    chainDamagePerLevel: 0.035,
    chainRangeBase: 90,
    chainRangePerLevel: 4,
    thermalBonus: 0.18,
    triadNovaBonus: 0.25,
  },
} as const;

export const WAVE_BALANCE = {
  firstWaveDelay: 3.2,
  intermission: 4.5,
  baseCount: 5,
  countPerWave: 1.45,
  healthGrowth: 1.21,
  damageGrowth: 1.07,
  speedGrowth: 0.016,
  speedCap: 0.55,
  rewardGrowth: 0.1,
  tierEvery: 7,
  tierHealth: 1.58,
  tierDamage: 1.2,
  tierReward: 1.25,
  bossEvery: 5,
  bossAddScale: 0.7,
  bossHealthMultiplier: 1.0,
  spawnIntervalBase: 0.95,
  spawnIntervalDecay: 0.965,
  minSpawnInterval: 0.2,
  clearCoinsBase: 16,
  clearCoinsPerWave: 4,
  mutatorFirstWave: 4,
  mutatorSecondWave: 9,
  maxMutators: 2,
} as const;

export const PRESTIGE_BALANCE = {
  minWave: 8,
  waveDivisor: 2,
  damagePerCore: 0.02,
  startingCashPerCore: 2,
  maxDamageBonus: 10,
  frameThresholds: [0, 4, 12, 30, 60],
} as const;

export const OFFLINE_BALANCE = {
  minMinutes: 2,
  maxHours: 8,
  baseCoinsPerMinute: 1,
  coinsPerMinutePerBestWave: 0.5,
  maxCoinsPerMinute: 30,
} as const;

export const FOUNDRY_BALANCE = {
  baseCost: 10000,
  costGrowth: 1.25,
  weeklyCap: 5,
} as const;
