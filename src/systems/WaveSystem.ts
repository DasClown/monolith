import { RNG } from '../core/rng';
import { TAU } from '../core/math';
import type { EnemyKind, EnemySpawnSpec, WaveMutatorId, WavePhase, WavePreview } from '../core/types';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../entities/EnemyArchetypes';
import { WAVE_BALANCE } from '../config/balance';
import { MUTATOR_DEFS, MUTATOR_ORDER } from '../config/content';

export interface WaveStartInfo {
  wave: number;
  tier: number;
  total: number;
  isBossWave: boolean;
  mutators: WaveMutatorId[];
}

interface BuiltWave {
  specs: EnemySpawnSpec[];
  mutators: WaveMutatorId[];
  isBossWave: boolean;
  bossKind: EnemyKind | null;
}

interface MutatorMultipliers {
  health: number;
  speed: number;
  armorBonus: number;
  shieldFraction: number;
  regenFraction: number;
  reward: number;
}

export interface WaveTickResult {
  spawns: EnemySpawnSpec[];
  started: WaveStartInfo | null;
  cleared: { wave: number; coins: number } | null;
  countdown: number;
}

/**
 * Wave generation and pacing. All scaling is exponential and every wave is
 * deterministic for a given seed, so the same run can be reproduced.
 */
export class WaveSystem {
  wave = 0;
  phase: WavePhase = 'intermission';
  countdown: number = WAVE_BALANCE.firstWaveDelay;
  waveTotal = 0;
  spawned = 0;
  isBossWave = false;
  mutators: WaveMutatorId[] = [];
  private spawnQueue: EnemySpawnSpec[] = [];
  private previewCache: { wave: number; preview: WavePreview } | null = null;
  private spawnTimer = 0;
  private spawnInterval = 0.9;
  private readonly seed: number;

  constructor(seed = 0x4d4f4e4f) {
    this.seed = seed;
  }

  get tier(): number {
    return 1 + Math.floor(Math.max(0, this.wave - 1) / WAVE_BALANCE.tierEvery);
  }

  get remainingToSpawn(): number {
    return this.spawnQueue.length;
  }

  createSummonSpec(kind: EnemyKind, x: number, y: number, index: number, count: number): EnemySpawnSpec {
    const def = ENEMY_ARCHETYPES[kind];
    const wave = Math.max(1, this.wave);
    const tier = this.tier;
    const healthScale =
      Math.pow(WAVE_BALANCE.healthGrowth, wave - 1) *
      Math.pow(WAVE_BALANCE.tierHealth, tier - 1) *
      0.55;
    const damageScale =
      Math.pow(WAVE_BALANCE.damageGrowth, wave - 1) *
      Math.pow(WAVE_BALANCE.tierDamage, tier - 1) *
      0.75;
    const baseAngle = Math.atan2(y, x);
    const offset = (index / Math.max(1, count)) * Math.PI * 2;
    return {
      kind,
      tier,
      wave,
      maxHealth: def.health * healthScale,
      damage: def.damage * damageScale,
      speed: def.speed * 1.08,
      reward: Math.ceil(def.reward * 0.3),
      spawnAngle: baseAngle + offset,
      spawnRadius: Math.max(64, Math.hypot(x, y) + 34),
      armor: def.armor,
      shield: 0,
      regen: 0,
      mutators: [],
    };
  }

  getNextWavePreview(): WavePreview | null {
    const nextWave = this.wave + 1;
    if (this.previewCache?.wave === nextWave) return this.previewCache.preview;
    const built = this.buildWave(nextWave);
    const preview: WavePreview = {
      wave: nextWave,
      total: built.specs.length,
      tier: 1 + Math.floor((nextWave - 1) / WAVE_BALANCE.tierEvery),
      isBoss: built.isBossWave,
      mutators: built.mutators,
    };
    this.previewCache = { wave: nextWave, preview };
    return preview;
  }

  reset(): void {
    this.wave = 0;
    this.phase = 'intermission';
    this.countdown = WAVE_BALANCE.firstWaveDelay;
    this.waveTotal = 0;
    this.spawned = 0;
    this.isBossWave = false;
    this.mutators = [];
    this.spawnQueue = [];
    this.previewCache = null;
    this.spawnTimer = 0;
    this.spawnInterval = 0.9;
  }

  /**
   * Starts the next wave immediately. Returns null when a wave is active.
   */
  beginNextWave(): WaveStartInfo | null {
    if (this.phase !== 'intermission') return null;

    this.wave += 1;
    this.phase = 'combat';
    const built = this.buildWave(this.wave);
    this.isBossWave = built.isBossWave;
    this.mutators = built.mutators;
    this.spawnQueue = built.specs;
    this.waveTotal = this.spawnQueue.length;
    this.spawned = 0;
    this.spawnTimer = 0.12;
    this.previewCache = null;
    this.spawnInterval = Math.max(
      WAVE_BALANCE.minSpawnInterval,
      WAVE_BALANCE.spawnIntervalBase * Math.pow(WAVE_BALANCE.spawnIntervalDecay, this.wave - 1),
    );

    return {
      wave: this.wave,
      tier: this.tier,
      total: this.waveTotal,
      isBossWave: this.isBossWave,
      mutators: this.mutators,
    };
  }

  /**
   * Advances the wave clock. The session owns enemy lifetimes and passes the
   * live enemy count, which keeps this system free of entity storage.
   */
  update(dt: number, aliveEnemyCount: number): WaveTickResult {
    const spawns: EnemySpawnSpec[] = [];
    let started: WaveStartInfo | null = null;
    let cleared: { wave: number; coins: number } | null = null;

    if (this.phase === 'intermission') {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown <= 0) {
        started = this.beginNextWave();
      }
    }

    if (this.phase === 'reward') {
      return {
        spawns,
        started,
        cleared,
        countdown: this.countdown,
      };
    }

    if (this.phase === 'combat') {
      this.spawnTimer -= dt;
      let safety = 0;
      while (this.spawnTimer <= 0 && this.spawnQueue.length > 0 && safety < 3) {
        const next = this.spawnQueue.shift();
        if (!next) break;
        spawns.push(next);
        this.spawned += 1;
        this.spawnTimer += this.spawnInterval;
        safety += 1;
      }

      if (this.spawnQueue.length === 0 && this.spawned > 0 && aliveEnemyCount === 0 && spawns.length === 0) {
        const wave = this.wave;
        const coins = WAVE_BALANCE.clearCoinsBase + Math.floor(wave * WAVE_BALANCE.clearCoinsPerWave);
        this.phase = 'intermission';
        this.countdown = WAVE_BALANCE.intermission;
        cleared = { wave, coins };
      }
    }

    return {
      spawns,
      started,
      cleared,
      countdown: this.countdown,
    };
  }

  getSnapshot(aliveEnemyCount: number): {
    wave: number;
    phase: WavePhase;
    tier: number;
    total: number;
    spawned: number;
    alive: number;
    countdown: number;
    isBossWave: boolean;
    mutators: WaveMutatorId[];
    preview: WavePreview | null;
  } {
    return {
      wave: this.wave,
      phase: this.phase,
      tier: this.tier,
      total: this.waveTotal,
      spawned: this.spawned,
      alive: aliveEnemyCount,
      countdown: this.countdown,
      isBossWave: this.isBossWave,
      mutators: this.mutators,
      preview: this.phase === 'intermission' ? this.getNextWavePreview() : null,
    };
  }

  private buildWave(wave: number): BuiltWave {
    const rng = RNG.forWave(this.seed, wave);
    const count = WAVE_BALANCE.baseCount + Math.floor(wave * WAVE_BALANCE.countPerWave);
    const mutators = this.pickMutators(wave, rng);
    const multipliers = this.getMutatorMultipliers(mutators);
    const specs: EnemySpawnSpec[] = [];
    const tier = 1 + Math.floor((wave - 1) / WAVE_BALANCE.tierEvery);
    const healthScale =
      Math.pow(WAVE_BALANCE.healthGrowth, wave - 1) *
      Math.pow(WAVE_BALANCE.tierHealth, tier - 1);
    const damageScale =
      Math.pow(WAVE_BALANCE.damageGrowth, wave - 1) *
      Math.pow(WAVE_BALANCE.tierDamage, tier - 1);
    const speedScale = 1 + Math.min(WAVE_BALANCE.speedCap, WAVE_BALANCE.speedGrowth * (wave - 1));
    const rewardScale = 1 + wave * WAVE_BALANCE.rewardGrowth;
    const isBossWave = wave % WAVE_BALANCE.bossEvery === 0;

    for (let i = 0; i < count; i += 1) {
      const kind = this.pickKind(wave, rng);
      const archetype = ENEMY_ARCHETYPES[kind];
      specs.push(
        this.makeSpec(
          archetype,
          wave,
          tier,
          healthScale,
          damageScale,
          speedScale,
          rewardScale,
          mutators,
          multipliers,
          rng,
        ),
      );
    }

    let bossKind: EnemyKind | null = null;
    if (isBossWave) {
      const bossNumber = Math.floor(wave / WAVE_BALANCE.bossEvery);
      const bossCycle: EnemyKind[] = ['crusher', 'summoner', 'artillery'];
      bossKind = bossCycle[(bossNumber - 1) % bossCycle.length] ?? 'crusher';
      const boss = ENEMY_ARCHETYPES[bossKind];
      specs.push(
        this.makeSpec(
          boss,
          wave,
          tier,
          healthScale * WAVE_BALANCE.bossHealthMultiplier,
          damageScale,
          speedScale,
          rewardScale,
          mutators,
          multipliers,
          rng,
        ),
      );
    }

    return { specs, mutators, isBossWave, bossKind };
  }

  private pickMutators(wave: number, rng: RNG): WaveMutatorId[] {
    if (wave < WAVE_BALANCE.mutatorFirstWave) return [];
    const count =
      wave >= WAVE_BALANCE.mutatorSecondWave ? WAVE_BALANCE.maxMutators : 1;
    const pool = [...MUTATOR_ORDER];
    const selected: WaveMutatorId[] = [];
    const total = Math.min(count, pool.length);
    for (let i = 0; i < total; i += 1) {
      const index = rng.int(0, pool.length);
      const [picked] = pool.splice(index, 1);
      if (picked) selected.push(picked);
    }
    return selected;
  }

  private getMutatorMultipliers(mutators: WaveMutatorId[]): MutatorMultipliers {
    const multipliers: MutatorMultipliers = {
      health: 1,
      speed: 1,
      armorBonus: 0,
      shieldFraction: 0,
      regenFraction: 0,
      reward: 1,
    };
    for (const id of mutators) {
      const def = MUTATOR_DEFS[id];
      multipliers.health *= def.healthMultiplier;
      multipliers.speed *= def.speedMultiplier;
      multipliers.armorBonus += def.armorBonus;
      multipliers.shieldFraction += def.shieldFraction;
      multipliers.regenFraction += def.regenFraction;
      multipliers.reward *= def.rewardMultiplier;
    }
    return multipliers;
  }

  private pickKind(wave: number, rng: RNG): EnemyKind {
    const available = (Object.values(ENEMY_ARCHETYPES) as EnemyArchetype[]).filter(
      (archetype) => !archetype.boss && wave >= archetype.unlockWave,
    );
    const totalWeight = available.reduce((sum, archetype) => sum + archetype.weight, 0);
    let roll = rng.next() * totalWeight;
    for (const archetype of available) {
      roll -= archetype.weight;
      if (roll <= 0) return archetype.kind;
    }
    return available[available.length - 1]?.kind ?? 'skitter';
  }

  private makeSpec(
    archetype: EnemyArchetype,
    wave: number,
    tier: number,
    healthScale: number,
    damageScale: number,
    speedScale: number,
    rewardScale: number,
    mutators: WaveMutatorId[],
    multipliers: MutatorMultipliers,
    rng: RNG,
  ): EnemySpawnSpec {
    const maxHealth = archetype.health * healthScale * multipliers.health;
    return {
      kind: archetype.kind,
      tier,
      wave,
      maxHealth,
      damage: archetype.damage * damageScale,
      speed: archetype.speed * speedScale * multipliers.speed * rng.range(0.94, 1.06),
      reward: Math.ceil(
        archetype.reward *
          rewardScale *
          multipliers.reward *
          Math.pow(WAVE_BALANCE.tierReward, tier - 1),
      ),
      spawnAngle: rng.next() * TAU,
      spawnRadius: 520 + rng.range(-12, 28),
      armor: Math.min(0.7, archetype.armor + multipliers.armorBonus),
      shield: maxHealth * multipliers.shieldFraction,
      regen: maxHealth * multipliers.regenFraction,
      mutators: [...mutators],
    };
  }
}
