import { SpatialHash } from '../core/collision';
import { GameLoop } from '../core/GameLoop';
import { RNG } from '../core/rng';
import type {
  AbilityId,
  BannerView,
  EnemySpawnSpec,
  RunSnapshot,
  TargetMode,
  VisualEvent,
} from '../core/types';
import { Enemy } from '../entities/Enemy';
import { ENEMY_ARCHETYPES } from '../entities/EnemyArchetypes';
import { Orbital, relativeOrbitalAngle } from '../entities/Orbital';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { useGameStore } from '../store/gameStore';
import { FOUNDRY_BALANCE, TOWER_BALANCE, WAVE_BALANCE } from '../config/balance';
import { BUILD_ID } from '../config/build';
import {
  COSMETICS,
  COSMETIC_BY_ID,
  DEFAULT_COSMETIC,
  isCosmeticId,
  type CosmeticId,
} from '../config/cosmetics';
import { formatCompact } from '../utils/format';
import { weekKey } from '../utils/daily';
import { loadCloudEntitlements, scheduleCloudSave, upsertCloudProfile } from '../services/cloud';
import { normalizePlayerName, playerLabel } from '../utils/profile';
import { AbilitySystem } from '../systems/AbilitySystem';
import { BannerSystem } from '../systems/BannerSystem';
import { DailySystem } from '../systems/DailySystem';
import { EconomySystem } from '../systems/EconomySystem';
import { GEM_EXCHANGE, MonetizationSystem } from '../systems/MonetizationSystem';
import { calculateOfflineSalvage } from '../systems/OfflineSystem';
import { PrestigeSystem } from '../systems/PrestigeSystem';
import { UpgradeSystem, UPGRADE_DEFS } from '../systems/UpgradeSystem';
import { WaveSystem, type WaveStartInfo } from '../systems/WaveSystem';
import { setCommandHandler, type GameCommand } from './commands';
import { loadSave, writeSave, type SaveData } from './save';

export interface SessionRenderer {
  render(session: GameSession, alpha: number, realDelta: number): void;
}

let nextOrbitalId = 1;

/**
 * Application-layer coordinator. It owns the mutable simulation, wires the
 * systems together, and publishes throttled snapshots to the reactive store.
 * It contains no rendering code and no DOM access beyond persistence.
 */
export class GameSession {
  readonly economy: EconomySystem;
  readonly upgrades: UpgradeSystem;
  readonly monetization: MonetizationSystem;
  readonly loop: GameLoop;

  tower: Tower;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  orbitals: Orbital[] = [];

  private renderer: SessionRenderer | null = null;
  private waves: WaveSystem;
  private rng: RNG;
  private seed: number;
  private save: SaveData;
  private gameOver = false;
  private waveKilled = 0;
  private bestWave: number;
  private publishAccumulator = 0;
  private visualEvents: VisualEvent[] = [];
  private readonly collisionHash = new SpatialHash<Enemy>(96);
  private shopBusy = false;
  private targetMode: TargetMode = 'closest';
  private readonly banners = new BannerSystem();
  private readonly prestige: PrestigeSystem;
  private readonly abilities: AbilitySystem;
  private readonly daily: DailySystem;
  private bannerOffer: BannerView[] | null = null;
  private saveTouchAccumulator = 0;
  private overdriveRemaining = 0;
  private runKills = 0;
  private runStartedAt = Date.now();
  private waitingForStart = true;
  private bossFightElapsed = 0;
  private bossOverloadTier = 0;
  private cosmeticId: CosmeticId = DEFAULT_COSMETIC;
  private ownedCosmetics = new Set<CosmeticId>([DEFAULT_COSMETIC]);

  constructor() {
    this.save = loadSave();
    this.normalizeFoundryWeek();
    this.seed = (0x4d4f4e4f ^ (this.save.runs * 0x9e3779b1)) >>> 0;
    this.rng = new RNG(this.seed);
    this.bestWave = this.save.bestWave;
    this.hydrateCosmetics();

    this.economy = new EconomySystem(
      this.save.coins,
      this.save.gems,
      this.save.cores,
      this.save.coresEarned,
    );
    this.upgrades = new UpgradeSystem({}, this.save.workshop);
    this.prestige = new PrestigeSystem(this.save.prestigeNodes);
    this.abilities = new AbilitySystem(this.save.abilities);
    this.daily = new DailySystem(this.save.daily);
    this.monetization = new MonetizationSystem();
    this.monetization.hydrate(this.save.entitlements, this.save.purchaseCounts);
    this.applyMultipliers();

    const offline = calculateOfflineSalvage(this.save.lastSeen, this.bestWave);
    if (offline) {
      const awarded = this.economy.earnCoins(offline.coins, false);
      useGameStore.getState().setOfflineReward({
        coins: formatCompact(awarded),
        minutes: offline.minutes,
        rate: offline.coinsPerMinute,
      });
    }

    this.economy.resetRun(this.getStartingCash());

    this.waves = new WaveSystem(this.seed);
    this.tower = new Tower(this.getTowerStats());
    this.tower.setTargetMode(this.targetMode);
    this.syncOrbitals();
    this.save.lastSeen = Date.now();
    this.persist();

    this.loop = new GameLoop({
      update: this.tick,
      render: this.render,
      fixedStep: 1 / 60,
      maxSubSteps: 6,
    });

    setCommandHandler(this.handleCommand);
    this.publish();
  }

  get isGameOver(): boolean {
    return this.gameOver;
  }

  get currentWave(): number {
    return this.waves.wave;
  }

  get equippedCosmetic(): CosmeticId {
    return this.cosmeticId;
  }

  get ascensionTier(): number {
    return this.prestige.getTier(this.economy.getCoresEarned());
  }

  get phase(): RunSnapshot['phase'] {
    return this.gameOver ? 'gameover' : this.waves.phase;
  }

  get overdriveTimeRemaining(): number {
    return this.overdriveRemaining;
  }

  get playerName(): string {
    return this.save.playerName;
  }

  get playerTag(): string {
    return this.save.playerTag;
  }

  getPlayerLabel(): string {
    return playerLabel(this.save.playerName, this.save.playerTag);
  }

  setPlayerName(name: string): void {
    const normalized = normalizePlayerName(name);
    if (!normalized) {
      useGameStore
        .getState()
        .pushToast('NAME: 2-16 ZEICHEN, BUCHSTABEN, ZAHLEN, LEERZEICHEN', 'pink');
      return;
    }
    this.save.playerName = normalized;
    this.persist();
    this.publish();
    void upsertCloudProfile(normalized, this.save.playerTag);
    useGameStore.getState().pushToast(`PILOT NAME · ${normalized.toUpperCase()}`, 'cyan');
  }

  createSaveExport(): string {
    this.persist();
    return JSON.stringify(this.save, null, 2);
  }

  /**
   * Portable balance/debug report. Contains no auth tokens or payment data.
   * Copy this from the game-over screen when reporting a bad run.
   */
  createRunReport(): string {
    const boss = this.enemies.find((enemy) => enemy.boss && !enemy.dead) ?? null;
    const wave = this.waves.getSnapshot(this.enemies.length);
    const report = {
      schema: 1,
      build: BUILD_ID,
      generatedAt: new Date().toISOString(),
      player: { name: this.save.playerName, tag: this.save.playerTag },
      run: {
        startedAt: new Date(this.runStartedAt).toISOString(),
        seconds: Math.round((Date.now() - this.runStartedAt) / 1000),
        seed: this.seed,
        wave: wave.wave,
        tier: wave.tier,
        phase: wave.phase,
        total: wave.total,
        spawned: wave.spawned,
        killed: this.waveKilled,
        alive: wave.alive,
        runKills: this.runKills,
        mutators: wave.mutators,
        bossWave: wave.isBossWave,
      },
      tower: {
        hp: Math.ceil(this.tower.hp),
        maxHp: Math.ceil(this.tower.maxHp),
        barrier: Math.ceil(this.tower.barrier),
        lastDamage: Math.round(this.tower.lastDamage * 10) / 10,
        stats: { ...this.tower.stats },
        dps: this.getDps(),
        targetMode: this.targetMode,
      },
      boss: boss
        ? {
            kind: boss.kind,
            hp: Math.ceil(boss.hp),
            maxHealth: Math.ceil(boss.maxHealth),
            shield: Math.ceil(boss.shield),
            phase: boss.phase,
            weakPointOpen: boss.weakPointOpen,
            slowFactor: boss.slowFactor,
            slowRemaining: boss.slowRemaining,
            regenPerSecond: boss.regenPerSecond,
            distanceFromCore: Math.round(Math.hypot(boss.x, boss.y)),
            overloadTier: this.bossOverloadTier,
            bossFightSeconds: Math.round(this.bossFightElapsed),
          }
        : null,
      economy: {
        cash: this.economy.getCash().toString(),
        coins: this.economy.getCoins().toString(),
        gems: this.economy.getGems().toString(),
        cores: this.economy.getCores().toString(),
        coresEarned: this.economy.getCoresEarned().toString(),
      },
      upgrades: {
        run: this.upgrades.getRunLevels(),
        workshop: this.upgrades.getWorkshopLevels(),
        workshopRank: this.upgrades.getWorkshopRank(),
      },
      abilities: this.abilities.getLoadout(),
      prestige: {
        nodes: this.prestige.getNodes(),
        damageBonusPercent: this.prestige.getDamageBonusPercent(this.economy.getCoresEarned()),
        tier: this.prestige.getTier(this.economy.getCoresEarned()),
      },
      foundry: {
        unlocked: this.upgrades.isWorkshopMaxed(),
        purchases: this.save.foundryPurchases,
        weekPurchases: this.save.foundryWeekPurchases,
        weeklyCap: FOUNDRY_BALANCE.weeklyCap,
        nextCost: this.getFoundryCost(),
      },
      compact: {
        wave: wave.wave,
        dps: this.getDps(),
        hp: Math.ceil(this.tower.hp),
        maxHp: Math.ceil(this.tower.maxHp),
        armor: Math.round(this.tower.stats.armor * 100),
        boss: boss?.kind ?? null,
        mutators: wave.mutators,
        overloadTier: this.bossOverloadTier,
      },
    };
    return JSON.stringify(report, null, 2);
  }

  exportSaveData(): SaveData {
    this.persist();
    return this.save;
  }

  async refreshCloudEntitlements(): Promise<void> {
    const entitlements = await loadCloudEntitlements();
    if (!entitlements) return;
    this.monetization.hydrate(entitlements, this.monetization.getPurchaseCounts());
    this.save.entitlements = this.monetization.snapshot;
    this.applyMultipliers();
    this.persist();
    this.publish();
  }

  setRenderer(renderer: SessionRenderer | null): void {
    this.renderer = renderer;
  }

  start(): void {
    this.loop.start();
    this.publish();
  }

  stop(): void {
    this.loop.stop();
  }

  drainVisualEvents(): VisualEvent[] {
    if (this.visualEvents.length === 0) return [];
    const events = this.visualEvents;
    this.visualEvents = [];
    return events;
  }

  private readonly render = (alpha: number, realDelta: number): void => {
    this.renderer?.render(this, alpha, realDelta);
  };

  private readonly tick = (dt: number): void => {
    if (this.gameOver) return;
    this.publishAccumulator += dt;
    if (this.waitingForStart) {
      return;
    }
    this.abilities.update(dt);
    const wasOverdriven = this.overdriveRemaining > 0;
    this.overdriveRemaining = Math.max(0, this.overdriveRemaining - dt);
    if (wasOverdriven && this.overdriveRemaining <= 0) {
      this.tower.applyStats(this.getTowerStats());
    }

    // 1. Retire anything that died last tick.
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);

    // 1b. Damage over time and slow decay.
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const status = enemy.updateStatus(dt);
      if (status.killed) this.handleEnemyKilled(enemy);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.processBossEvents();
    this.updateBossOverload(dt);

    // 2. The tower aims, regenerates, and fires.
    const fire = this.tower.update(dt, this.enemies, () =>
      this.rng.chance(this.tower.stats.critChance),
    );
    for (const shot of fire.shots) {
      this.projectiles.push(new Projectile(shot, fire.targetId));
      this.visualEvents.push({ type: 'shot', x: shot.x, y: shot.y, angle: shot.angle, crit: shot.crit });
    }

    // 3. Enemies advance and attack the core.
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const attack = enemy.update(dt, this.tower.radius);
      if (!attack) continue;
      const rawImpact =
        attack === 'slam'
          ? enemy.currentDamage * 1.4
          : attack === 'artillery'
            ? enemy.currentDamage * 1.2
            : enemy.currentDamage;
      // Bosses cannot delete the core in a handful of unavoidable hits.
      // This also guarantees that Overload has time to resolve a stalemate.
      const impactDamage = enemy.boss
        ? Math.min(rawImpact, this.tower.maxHp * TOWER_BALANCE.bossHitCap)
        : rawImpact;
      if (attack === 'slam') {
        this.visualEvents.push({ type: 'bossSlam', x: enemy.x, y: enemy.y });
      } else if (attack === 'artillery') {
        this.visualEvents.push({
          type: 'artillery',
          fromX: enemy.x,
          fromY: enemy.y,
          toX: 0,
          toY: 0,
        });
      }
      const died = this.tower.takeDamage(impactDamage);
      this.visualEvents.push({
        type: 'towerHit',
        x: enemy.x,
        y: enemy.y,
        damage: this.tower.lastDamage,
      });
      if (died) {
        this.endRun();
        return;
      }
    }
    if (this.tower.isDead) {
      this.endRun();
      return;
    }

    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.kind !== 'summoner') continue;
      const count = enemy.consumeSummons();
      if (count <= 0) continue;
      for (let index = 0; index < count; index += 1) {
        const spec = this.waves.createSummonSpec('skitter', enemy.x, enemy.y, index, count);
        this.spawnEnemy(spec);
      }
      this.visualEvents.push({ type: 'summon', x: enemy.x, y: enemy.y });
    }

    // 4. Projectiles steer toward their locked target.
    for (const projectile of this.projectiles) {
      const target = projectile.targetId
        ? this.enemies.find((enemy) => enemy.id === projectile.targetId && !enemy.dead) ?? null
        : null;
      projectile.update(dt, target);
    }

    // 5. Orbitals rotate around the core.
    for (const orbital of this.orbitals) orbital.update(dt);

    // 6. Broad phase for this tick.
    this.collisionHash.clear();
    for (const enemy of this.enemies) {
      if (!enemy.dead) this.collisionHash.insert(enemy);
    }

    // 7. Projectile to enemy narrow phase.
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      const hits = this.collisionHash.queryCircle(projectile.x, projectile.y, projectile.radius);
      for (const enemy of hits) {
        if (enemy.dead || !projectile.registerHit(enemy.id)) continue;
        let damage = projectile.damage;
        if (
          this.tower.stats.thermalBonus > 0 &&
          enemy.isBurning &&
          enemy.isSlowed
        ) {
          damage *= 1 + this.tower.stats.thermalBonus;
        }
        const result = enemy.takeDamage(damage, 'kinetic');
        this.visualEvents.push({
          type: 'hit',
          x: enemy.x,
          y: enemy.y,
          damage: result.applied,
          crit: projectile.crit,
          kind: enemy.kind,
          damageType: 'kinetic',
        });
        if (result.killed) this.handleEnemyKilled(enemy);
        this.applyElementalOnHit(enemy, true);
        projectile.dead = true;
        break;
      }
    }

    // 8. Orbital to enemy narrow phase.
    for (const orbital of this.orbitals) {
      const hits = this.collisionHash.queryCircle(orbital.x, orbital.y, orbital.size + 2);
      for (const enemy of hits) {
        if (enemy.dead || !orbital.canHit(enemy.id)) continue;
        const crit = enemy.boss && this.rng.chance(this.tower.stats.critChance);
        const result = enemy.boss
          ? enemy.takeDamage(
              Math.max(orbital.damage * 3, enemy.maxHealth * 0.018) *
                (crit ? this.tower.stats.critMultiplier : 1),
              'kinetic',
            )
          : enemy.execute();
        orbital.registerHit(enemy.id);
        this.visualEvents.push({ type: 'orbHit', x: enemy.x, y: enemy.y, crit });
        if (result.killed) this.handleEnemyKilled(enemy);
        this.applyElementalOnHit(enemy, true);
      }
    }

    this.processBossEvents();
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);

    // 9. Wave clock, spawning, and clears.
    const waveResult = this.waves.update(dt, this.enemies.length);
    if (waveResult.started) this.onWaveStarted(waveResult.started);
    for (const spec of waveResult.spawns) this.spawnEnemy(spec);
    if (waveResult.cleared) this.onWaveCleared(waveResult.cleared);

    this.saveTouchAccumulator += dt;
    if (this.saveTouchAccumulator >= 30) {
      this.saveTouchAccumulator = 0;
      this.persist();
    }

    if (this.publishAccumulator >= 0.08) {
      this.publishAccumulator = 0;
      this.publish();
    }
  };

  private updateBossOverload(dt: number): void {
    const bossAlive = this.enemies.some((enemy) => enemy.boss && !enemy.dead);
    if (!bossAlive) {
      if (this.bossOverloadTier > 0) {
        this.bossOverloadTier = 0;
        this.bossFightElapsed = 0;
        this.tower.applyStats(this.getTowerStats());
      } else {
        this.bossFightElapsed = 0;
      }
      return;
    }

    this.bossFightElapsed += dt;
    const tier =
      this.bossFightElapsed < 10
        ? 0
        : Math.min(8, 1 + Math.floor((this.bossFightElapsed - 10) / 5));
    if (tier === this.bossOverloadTier) return;
    this.bossOverloadTier = tier;
    this.tower.applyStats(this.getTowerStats());
    if (tier > 0) {
      useGameStore
        .getState()
        .pushToast(`MONOLITH OVERLOAD · +${tier * 25}% DAMAGE`, 'gold');
    }
  }

  private applyElementalOnHit(enemy: Enemy, allowChain: boolean): void {
    const stats = this.tower.stats;
    if (!enemy.dead) {
      if (stats.burnDps > 0) enemy.applyBurn(stats.burnDps, stats.burnDuration);
      if (stats.slowFactor > 0) enemy.applySlow(stats.slowFactor, stats.slowDuration);
    }
    if (allowChain && stats.chainCount > 0) this.triggerChain(enemy);
  }

  private triggerChain(source: Enemy): void {
    const stats = this.tower.stats;
    if (stats.chainCount <= 0) return;
    const targets = this.collisionHash.queryCircle(source.x, source.y, stats.chainRange);
    let chained = 0;
    for (const target of targets) {
      if (target.id === source.id || target.dead) continue;
      const damage = stats.damage * stats.chainDamage;
      const result = target.takeDamage(damage, 'arc');
      this.visualEvents.push({
        type: 'chain',
        fromX: source.x,
        fromY: source.y,
        toX: target.x,
        toY: target.y,
      });
      this.visualEvents.push({
        type: 'hit',
        x: target.x,
        y: target.y,
        damage: result.applied,
        crit: false,
        kind: target.kind,
        damageType: 'arc',
      });
      if (stats.chainBurn) target.applyBurn(stats.burnDps, stats.burnDuration);
      if (stats.chainSlow) target.applySlow(stats.slowFactor, stats.slowDuration);
      if (result.killed) this.handleEnemyKilled(target);
      chained += 1;
      if (chained >= stats.chainCount) break;
    }
  }

  private processBossEvents(): void {
    for (const enemy of this.enemies) {
      if (!enemy.boss || enemy.dead) continue;
      const phase = enemy.consumePhaseChange();
      if (phase !== null) {
        this.visualEvents.push({ type: 'bossPhase', x: enemy.x, y: enemy.y, phase });
      }
      if (enemy.consumeWeakPointOpen()) {
        this.visualEvents.push({ type: 'weakPoint', x: enemy.x, y: enemy.y, open: true });
      }
    }
  }

  private spawnEnemy(spec: EnemySpawnSpec): void {
    const enemy = new Enemy(spec);
    this.enemies.push(enemy);
    if (enemy.boss) {
      this.visualEvents.push({ type: 'bossSpawn', x: enemy.x, y: enemy.y });
    }
  }

  private handleEnemyKilled(enemy: Enemy): void {
    this.waveKilled += 1;
    this.runKills += 1;
    this.daily.recordKill();
    const awarded = this.economy.earnCash(enemy.reward);
    this.visualEvents.push({
      type: 'enemyDeath',
      x: enemy.x,
      y: enemy.y,
      kind: enemy.kind,
      reward: awarded.toNumber(),
    });
    if (enemy.boss) {
      const name = ENEMY_ARCHETYPES[enemy.kind].name.toUpperCase();
      useGameStore.getState().pushToast(`${name} DOWN · +${formatCompact(awarded)} CASH`, 'pink');
    }
  }

  private onWaveStarted(info: WaveStartInfo): void {
    this.bossFightElapsed = 0;
    this.bossOverloadTier = 0;
    this.waveKilled = 0;
    this.visualEvents.push({ type: 'waveStart', wave: info.wave });
    useGameStore.getState().showBanner(
      info.isBossWave ? 'BOSS SIGNAL' : 'INCOMING SIGNAL',
      `WAVE ${String(info.wave).padStart(2, '0')}`,
      info.isBossWave ? 'pink' : 'cyan',
    );
  }

  private onWaveCleared(cleared: { wave: number; coins: number }): void {
    const awarded = this.economy.earnCoins(cleared.coins);
    const display = formatCompact(awarded);
    this.daily.recordWaveClear();
    this.bestWave = Math.max(this.bestWave, cleared.wave);
    this.visualEvents.push({
      type: 'waveClear',
      wave: cleared.wave,
      coins: awarded.toNumber(),
    });
    useGameStore.getState().showBanner(
      `WAVE ${String(cleared.wave).padStart(2, '0')} CLEARED`,
      `+${display} COINS`,
      'gold',
    );
    this.openBannerOffer(cleared.wave);
    this.persist();
    this.publish();
  }

  private endRun(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.waitingForStart = false;
    this.waves.phase = 'gameover';
    this.bannerOffer = null;
    this.bestWave = Math.max(this.bestWave, this.waves.wave);
    const salvage = this.economy.earnCoins(5 + this.waves.wave * 2);
    this.save.runs += 1;
    this.daily.recordRun(this.waves.wave, this.runKills, this.getPlayerLabel());
    this.persist();
    this.loop.pause();
    useGameStore.getState().showBanner('CORE BREACH', `WAVE ${String(this.waves.wave).padStart(2, '0')}`, 'pink');
    useGameStore.getState().pushToast(`SALVAGE +${formatCompact(salvage)} COINS`, 'gold');
    this.publish();
  }

  private restartRun(): void {
    this.gameOver = false;
    this.seed = (this.seed + 0x9e3779b9) >>> 0;
    this.rng = new RNG(this.seed);
    this.upgrades.resetRun();
    this.banners.reset();
    this.economy.resetRun(this.getStartingCash());
    this.bossFightElapsed = 0;
    this.bossOverloadTier = 0;
    this.tower = new Tower(this.getTowerStats());
    this.tower.setTargetMode(this.targetMode);
    this.enemies = [];
    this.projectiles = [];
    this.orbitals = [];
    this.waveKilled = 0;
    this.runKills = 0;
    this.runStartedAt = Date.now();
    this.waitingForStart = true;
    this.overdriveRemaining = 0;
    this.abilities.resetCooldowns();
    this.bannerOffer = null;
    this.visualEvents = [];
    this.waves = new WaveSystem(this.seed);
    this.publishAccumulator = 0;
    this.applyMultipliers();
    this.syncOrbitals();
    this.loop.resume();
    useGameStore.getState().pushToast('CORE RESTORED · REDEPLOYING', 'cyan');
    this.publish();
  }

  private chooseBanner(id: string): void {
    if (!this.bannerOffer) return;
    if (!this.bannerOffer.some((banner) => banner.id === id)) return;
    const chosen = this.banners.choose(id);
    if (!chosen) return;
    this.bannerOffer = null;
    this.tower.applyStats(this.getTowerStats());
    this.syncOrbitals();
    this.applyMultipliers();
    this.waves.phase = 'intermission';
    this.waves.countdown = WAVE_BALANCE.intermission;
    const accent =
      chosen.accent === 'pink' ? 'pink' : chosen.accent === 'gold' ? 'gold' : 'cyan';
    useGameStore.getState().showBanner('BANNER ACQUIRED', chosen.name.toUpperCase(), accent);
    this.publish();
  }

  private openBannerOffer(wave: number): void {
    if (this.gameOver || wave % 3 !== 0) return;
    const offer = this.banners.createOffer(this.rng);
    if (offer.length === 0) return;
    this.bannerOffer = offer;
    this.waves.phase = 'reward';
  }

  private prestigeRun(): void {
    if (!this.prestige.canPrestige(this.waves.wave)) {
      useGameStore.getState().pushToast('REACH WAVE 08 TO ASCEND', 'pink');
      return;
    }
    const reward = this.prestige.getReward(this.waves.wave);
    this.economy.earnCores(reward);
    this.seed = (this.seed + 0x9e3779b9) >>> 0;
    this.rng = new RNG(this.seed);
    this.gameOver = false;
    this.bannerOffer = null;
    this.banners.reset();
    this.upgrades.resetRun();
    this.daily.recordRun(this.waves.wave, this.runKills, this.getPlayerLabel());
    this.runKills = 0;
    this.runStartedAt = Date.now();
    this.waitingForStart = true;
    this.bossFightElapsed = 0;
    this.bossOverloadTier = 0;
    this.overdriveRemaining = 0;
    this.abilities.resetCooldowns();
    this.enemies = [];
    this.projectiles = [];
    this.orbitals = [];
    this.waveKilled = 0;
    this.visualEvents = [];
    this.waves = new WaveSystem(this.seed);
    this.economy.resetRun(this.getStartingCash());
    this.tower = new Tower(this.getTowerStats());
    this.tower.setTargetMode(this.targetMode);
    this.syncOrbitals();
    this.applyMultipliers();
    this.loop.resume();
    this.persist();
    useGameStore.getState().showBanner(
      'ASCENSION COMPLETE',
      `+${reward} CORES`,
      'gold',
    );
    this.publish();
  }

  private purchaseUpgrade(id: string): void {
    const def = UPGRADE_DEFS.find((item) => item.id === id);
    if (!def) return;
    if (this.gameOver && def.currency === 'cash') {
      useGameStore.getState().pushToast('RUN ENDED · REDEPLOY TO SPEND CASH', 'pink');
      return;
    }
    const result = this.upgrades.purchase(id, this.economy);
    if (!result.ok) {
      useGameStore.getState().pushToast(result.message, 'pink');
      this.publish();
      return;
    }

    this.tower.applyStats(this.getTowerStats());
    this.syncOrbitals();
    if (def.currency === 'coins') {
      this.applyMultipliers();
      this.persist();
    }
    this.visualEvents.push({ type: 'corePulse' });
    useGameStore.getState().pushToast(
      `${def.name.toUpperCase()} · LV ${result.level}`,
      def.accent,
    );
    this.publish();
  }

  private getNovaDamage(): number {
    const balance = TOWER_BALANCE.nova;
    const base = this.tower.stats.damage * balance.damageMultiplier + balance.flatDamage;
    return Math.round(
      base *
        (1 + this.tower.stats.triadNovaBonus) *
        (1 + this.prestige.getTreeModifiers().novaDamage) *
        this.banners.getNovaDamageMultiplier(),
    );
  }

  private castNova(): void {
    const balance = TOWER_BALANCE.nova;
    const damage = this.getNovaDamage();
    let kills = 0;
    let hits = 0;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (Math.hypot(enemy.x, enemy.y) > balance.radius + enemy.radius) continue;
      const result = enemy.takeDamage(damage, 'arc');
      hits += 1;
      this.visualEvents.push({
        type: 'hit',
        x: enemy.x,
        y: enemy.y,
        damage: result.applied,
        crit: false,
        kind: enemy.kind,
        damageType: 'arc',
      });
      if (result.killed) {
        kills += 1;
        this.handleEnemyKilled(enemy);
      } else {
        this.applyElementalOnHit(enemy, false);
      }
    }

    this.processBossEvents();
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.visualEvents.push({ type: 'nova', x: 0, y: 0, radius: balance.radius });
    useGameStore.getState().pushToast(
      hits > 0 ? `NOVA PULSE · ${kills} DOWN · ${formatCompact(damage)} DMG` : 'NOVA PULSE · AREA CLEAR',
      'violet',
    );
  }

  private useAbility(id: AbilityId): void {
    if (this.gameOver || this.loop.isPaused || this.waves.phase === 'reward') return;
    if (!this.abilities.canUse(id)) return;
    const cooldownScale = id === 'nova' ? this.banners.getNovaCooldownMultiplier() : 1;
    this.abilities.startCooldown(id, cooldownScale);
    this.daily.recordAbilityUse();

    if (id === 'nova') {
      this.castNova();
    } else if (id === 'aegis') {
      this.tower.grantBarrier(this.tower.maxHp * 0.35);
      this.tower.heal(this.tower.maxHp * 0.1);
      this.visualEvents.push({ type: 'aegis', x: 0, y: 0 });
      useGameStore.getState().pushToast('AEGIS FIELD ONLINE · BARRIER DEPLOYED', 'green');
    } else if (id === 'overdrive') {
      this.overdriveRemaining = 8;
      this.tower.applyStats(this.getTowerStats());
      this.visualEvents.push({ type: 'overdrive', x: 0, y: 0 });
      useGameStore.getState().pushToast('OVERDRIVE ENGAGED · +60% FIRE RATE', 'gold');
    }
    this.persist();
    this.publish();
  }

  private equipAbility(slot: number, id: AbilityId): void {
    if (!this.abilities.equip(slot, id)) return;
    this.persist();
    this.publish();
  }

  private buyPrestigeNode(id: string): void {
    const result = this.prestige.buyNode(id, this.economy);
    if (!result.ok) {
      useGameStore.getState().pushToast(result.message, 'pink');
      return;
    }
    this.tower.applyStats(this.getTowerStats());
    this.syncOrbitals();
    this.applyMultipliers();
    this.persist();
    useGameStore.getState().pushToast(
      `${id.replace('-', ' ').toUpperCase()} · LV ${result.level}`,
      'gold',
    );
    this.publish();
  }

  private claimContract(id: string): void {
    const result = this.daily.claim(id, this.economy);
    useGameStore.getState().pushToast(result.message, result.ok ? 'gold' : 'pink');
    if (result.ok) {
      this.applyMultipliers();
      this.persist();
      this.publish();
    }
  }

  private async purchaseProduct(id: string): Promise<void> {
    if (this.shopBusy) return;
    this.shopBusy = true;
    useGameStore.getState().setShopBusy(true);
    try {
      const result = await this.monetization.purchase(id, this.economy);
      if (result.ok) {
        this.applyMultipliers();
        this.persist();
        useGameStore.getState().pushToast(result.message, 'gold');
        this.publish();
        if (this.monetization.isLive) {
          window.setTimeout(() => void this.refreshCloudEntitlements(), 3000);
          window.setTimeout(() => void this.refreshCloudEntitlements(), 9000);
        }
      } else {
        useGameStore.getState().pushToast(result.message, 'pink');
      }
    } finally {
      this.shopBusy = false;
      useGameStore.getState().setShopBusy(false);
    }
  }

  private hydrateCosmetics(): void {
    this.ownedCosmetics = new Set<CosmeticId>([DEFAULT_COSMETIC]);
    for (const id of this.save.cosmetics.owned) {
      if (isCosmeticId(id)) this.ownedCosmetics.add(id);
    }
    const equipped = this.save.cosmetics.equipped;
    this.cosmeticId =
      isCosmeticId(equipped) && this.ownedCosmetics.has(equipped)
        ? equipped
        : DEFAULT_COSMETIC;
  }

  private buyCosmetic(id: string): void {
    if (!isCosmeticId(id)) return;
    const def = COSMETIC_BY_ID[id];
    if (this.ownedCosmetics.has(id)) {
      this.equipCosmetic(id);
      return;
    }
    if (!this.economy.spendGems(def.cost)) {
      useGameStore.getState().pushToast(`NEED ${def.cost} GEMS`, 'violet');
      return;
    }
    this.ownedCosmetics.add(id);
    this.cosmeticId = id;
    this.persist();
    this.publish();
    useGameStore.getState().showBanner('CHROMA UNLOCKED', def.name, 'gold');
    useGameStore.getState().pushToast(`${def.name} EQUIPPED`, 'violet');
  }

  private equipCosmetic(id: string): void {
    if (!isCosmeticId(id) || !this.ownedCosmetics.has(id)) return;
    if (this.cosmeticId === id) return;
    this.cosmeticId = id;
    this.persist();
    this.publish();
    useGameStore.getState().pushToast(`${COSMETIC_BY_ID[id].name} EQUIPPED`, 'violet');
  }

  private normalizeFoundryWeek(): void {
    const current = weekKey();
    if (this.save.foundryWeek === current) return;
    this.save.foundryWeek = current;
    this.save.foundryWeekPurchases = 0;
  }

  private getFoundryCost(): number {
    return Math.ceil(
      FOUNDRY_BALANCE.baseCost *
        Math.pow(FOUNDRY_BALANCE.costGrowth, this.save.foundryPurchases),
    );
  }

  private buyFoundryCore(): void {
    this.normalizeFoundryWeek();
    if (!this.upgrades.isWorkshopMaxed()) {
      useGameStore.getState().pushToast('MAX ALL WORKSHOP NODES FIRST', 'pink');
      return;
    }
    if (this.save.foundryWeekPurchases >= FOUNDRY_BALANCE.weeklyCap) {
      useGameStore.getState().pushToast('FOUNDRY WEEKLY CAP REACHED', 'pink');
      return;
    }
    const cost = this.getFoundryCost();
    if (!this.economy.spendCoins(cost)) {
      useGameStore.getState().pushToast(`NEED ${formatCompact(cost)} COINS`, 'pink');
      return;
    }
    this.economy.earnCores(1);
    this.save.foundryPurchases += 1;
    this.save.foundryWeekPurchases += 1;
    this.tower.applyStats(this.getTowerStats());
    this.persist();
    this.publish();
    useGameStore.getState().pushToast('CORE FORGED · +1 PERMANENT CORE', 'gold');
  }

  private exchangeGems(): void {
    if (!this.economy.canAffordGems(GEM_EXCHANGE.gemCost)) {
      useGameStore.getState().pushToast('NOT ENOUGH GEMS', 'pink');
      return;
    }
    if (this.economy.exchangeGemsForCoins(GEM_EXCHANGE.gemCost, GEM_EXCHANGE.coinReward)) {
      useGameStore.getState().pushToast(`GEM EXCHANGE · +${GEM_EXCHANGE.coinReward} COINS`, 'gold');
      this.persist();
      this.publish();
    }
  }

  private applyMultipliers(): void {
    this.economy.setMultipliers(
      this.monetization.cashMultiplier * this.banners.getCashMultiplier(),
      this.monetization.coinMultiplier *
        this.upgrades.getWorkshopCoinMultiplier() *
        this.banners.getCoinMultiplier() *
        (1 + this.prestige.getTreeModifiers().coin),
    );
  }

  private syncOrbitals(): void {
    const stats = this.tower.stats;
    const desired = stats.orbCount;
    while (this.orbitals.length > desired) this.orbitals.pop();
    while (this.orbitals.length < desired) {
      const index = this.orbitals.length;
      this.orbitals.push(
        new Orbital(
          nextOrbitalId++,
          index,
          desired,
          82 + desired * 4,
          stats.orbDamage,
          stats.orbSpeed,
          stats.orbRadius,
        ),
      );
    }
    const radius = 82 + desired * 4;
    const count = this.orbitals.length;
    const baseAngle = this.orbitals[0]?.angle ?? 0;
    this.orbitals.forEach((orbital, index) => {
      orbital.applyStats(radius, stats.orbDamage, stats.orbSpeed, stats.orbRadius);
      orbital.setAngle(relativeOrbitalAngle(baseAngle, index, count));
    });
  }

  private getStartingCash(): number {
    return (
      this.upgrades.getStartingCash() +
      this.prestige.getStartingCashBonus(this.economy.getCoresEarned()) +
      this.prestige.getTreeModifiers().startingCash
    );
  }

  private getTowerStats(): ReturnType<UpgradeSystem['getStats']> {
    const stats = this.upgrades.getStats();
    const tree = this.prestige.getTreeModifiers();
    const ascension = this.prestige.getDamageMultiplier(this.economy.getCoresEarned());
    const overdrive = this.overdriveRemaining > 0;
    const rankArmor = Math.min(
      0.15,
      this.upgrades.getWorkshopRank() * TOWER_BALANCE.workshop.rankArmor,
    );
    const overload = 1 + this.bossOverloadTier * 0.25;
    const boosted = {
      ...stats,
      damage:
        stats.damage * ascension * (1 + tree.damage) * (overdrive ? 1.25 : 1) * overload,
      fireRate: stats.fireRate * (1 + tree.fireRate) * (overdrive ? 1.6 : 1),
      critChance: Math.min(0.9, stats.critChance + tree.crit),
      maxHp: stats.maxHp * (1 + tree.maxHp),
      armor: Math.min(0.85, stats.armor + tree.armor + rankArmor),
      regen: stats.regen + tree.regen,
      orbDamage: stats.orbDamage * ascension * (1 + tree.damage) * overload,
      burnDps: stats.burnDps * ascension * (1 + tree.damage) * (overdrive ? 1.25 : 1),
    };
    return this.banners.applyToStats(boosted);
  }

  private getNovaCooldownMax(): number {
    return TOWER_BALANCE.nova.cooldown * this.banners.getNovaCooldownMultiplier();
  }

  private getDps(): number {
    const stats = this.tower.stats;
    const critFactor = 1 + stats.critChance * (stats.critMultiplier - 1);
    const projectileDps = stats.damage * stats.fireRate * stats.projectiles * critFactor;
    const orbitalDps = stats.orbCount > 0 ? (stats.orbCount * stats.orbDamage) / 0.42 : 0;
    return Math.round(projectileDps + orbitalDps);
  }

  private persist(): void {
    this.save = {
      ...this.save,
      coins: this.economy.getCoins().toString(),
      gems: this.economy.getGems().toString(),
      workshop: this.upgrades.getWorkshopLevels(),
      cores: this.economy.getCores().toString(),
      coresEarned: this.economy.getCoresEarned().toString(),
      prestigeNodes: this.prestige.getNodes(),
      abilities: this.abilities.getLoadout(),
      daily: this.daily.getSnapshot(),
      lastSeen: Date.now(),
      entitlements: this.monetization.snapshot,
      purchaseCounts: this.monetization.getPurchaseCounts(),
      bestWave: this.bestWave,
      cosmetics: {
        owned: COSMETICS.filter((cosmetic) => this.ownedCosmetics.has(cosmetic.id)).map(
          (cosmetic) => cosmetic.id,
        ),
        equipped: this.cosmeticId,
      },
    };
    writeSave(this.save);
    scheduleCloudSave(this.save);
  }

  private readonly handleCommand = (command: GameCommand): void => {
    if (command.type === 'buyUpgrade') {
      this.purchaseUpgrade(command.id);
      return;
    }
    if (command.type === 'startWave') {
      if (this.gameOver || this.waves.phase !== 'intermission') return;
      const firstStart = this.waitingForStart;
      this.waitingForStart = false;
      if (firstStart) this.loop.resume();
      const bonus = firstStart ? 0 : Math.max(1, Math.ceil(this.waves.countdown * 2.5));
      const started = this.waves.beginNextWave();
      if (!started) return;
      if (bonus > 0) this.economy.earnCash(bonus);
      this.waveKilled = 0;
      this.onWaveStarted(started);
      this.publish();
      return;
    }
    if (command.type === 'restartRun') {
      this.restartRun();
      return;
    }
    if (command.type === 'togglePause') {
      if (this.gameOver) return;
      const paused = this.loop.togglePause();
      if (paused) useGameStore.getState().pushToast('SIMULATION PAUSED', 'cyan');
      this.publish();
      return;
    }
    if (command.type === 'setSpeed') {
      if (this.gameOver) return;
      this.loop.setTimeScale(command.speed);
      this.publish();
      return;
    }
    if (command.type === 'purchaseProduct') {
      void this.purchaseProduct(command.id);
      return;
    }
    if (command.type === 'exchangeGems') {
      this.exchangeGems();
      return;
    }
    if (command.type === 'buyFoundryCore') {
      this.buyFoundryCore();
      return;
    }
    if (command.type === 'buyCosmetic') {
      this.buyCosmetic(command.id);
      return;
    }
    if (command.type === 'equipCosmetic') {
      this.equipCosmetic(command.id);
      return;
    }
    if (command.type === 'setTargetMode') {
      if (this.gameOver) return;
      this.targetMode = command.mode;
      this.tower.setTargetMode(command.mode);
      this.publish();
      return;
    }
    if (command.type === 'useNova') {
      this.useAbility('nova');
      return;
    }
    if (command.type === 'useAbility') {
      this.useAbility(command.id);
      return;
    }
    if (command.type === 'equipAbility') {
      this.equipAbility(command.slot, command.id);
      return;
    }
    if (command.type === 'buyPrestigeNode') {
      this.buyPrestigeNode(command.id);
      return;
    }
    if (command.type === 'claimContract') {
      this.claimContract(command.id);
      return;
    }
    if (command.type === 'setPlayerName') {
      this.setPlayerName(command.name);
      return;
    }
    if (command.type === 'chooseBanner') {
      this.chooseBanner(command.id);
      return;
    }
    if (command.type === 'prestige') {
      this.prestigeRun();
    }
  };

  private publish(): void {
    this.normalizeFoundryWeek();
    const wave = this.waves.getSnapshot(this.enemies.length);
    const economy = this.economy.snapshot;
    const workshop = this.upgrades.getWorkshopProgress();
    const stats = this.tower.stats;
    const dps = this.getDps();
    const novaDamage = this.getNovaDamage();
    const boss = this.enemies.find((enemy) => enemy.boss && !enemy.dead) ?? null;
    const cores = this.economy.getCores();
    const coresEarned = this.economy.getCoresEarned();
    const abilityViews = this.abilities.getViews(this.banners.getNovaCooldownMultiplier());
    const novaView = abilityViews.find((ability) => ability.id === 'nova') ?? null;
    const snapshot: RunSnapshot = {
      phase: this.gameOver ? 'gameover' : wave.phase,
      wave: wave.wave,
      waveTier: wave.tier,
      waveTotal: wave.total,
      waveSpawned: wave.spawned,
      waveKilled: this.waveKilled,
      enemiesAlive: wave.alive,
      nextWaveIn: wave.phase === 'intermission' ? wave.countdown : 0,
      waitingForStart: this.waitingForStart,
      isBossWave: wave.phase === 'combat' && wave.isBossWave,
      waveMutators: wave.mutators,
      towerHp: Math.ceil(this.tower.hp),
      towerMaxHp: Math.ceil(stats.maxHp),
      armor: stats.armor,
      burnDps: Math.round(stats.burnDps * 10) / 10,
      slowPercent: Math.round(stats.slowFactor * 100),
      chainCount: stats.chainCount,
      dps,
      power: dps,
      targetMode: this.targetMode,
      bossName: boss ? ENEMY_ARCHETYPES[boss.kind].name.toUpperCase() : '',
      playerName: this.save.playerName,
      playerTag: this.save.playerTag,
      storeStatus: this.monetization.storeStatus,
      abilities: abilityViews,
      barrier: Math.ceil(this.tower.barrier),
      overdriveRemaining: this.overdriveRemaining,
      novaCooldown: novaView?.cooldown ?? 0,
      novaCooldownMax: novaView?.cooldownMax ?? this.getNovaCooldownMax(),
      novaDamage,
      novaReady: novaView?.ready ?? true,
      cash: formatCompact(economy.cash),
      coins: formatCompact(economy.coins),
      gems: formatCompact(economy.gems),
      cashRaw: economy.cash.toString(),
      coinsRaw: economy.coins.toString(),
      gemsRaw: economy.gems.toString(),
      cosmeticId: this.cosmeticId,
      ownedCosmetics: COSMETICS.filter((cosmetic) =>
        this.ownedCosmetics.has(cosmetic.id),
      ).map((cosmetic) => cosmetic.id),
      bestWave: this.bestWave,
      speed: this.loop.timeScale,
      paused: this.loop.isPaused,
      workshopRank: workshop.rank,
      workshopProgress: workshop.text,
      coinMultiplier: economy.coinMultiplier,
      cashMultiplier: economy.cashMultiplier,
      entitlements: this.monetization.snapshot,
      nextWavePreview: wave.preview,
      banners: this.banners.getViews(),
      bannerOffer: this.bannerOffer,
      cores: formatCompact(cores),
      coresRaw: cores.toString(),
      foundryUnlocked: this.upgrades.isWorkshopMaxed(),
      foundryCost: formatCompact(this.getFoundryCost()),
      foundryCostRaw: String(this.getFoundryCost()),
      foundryWeekPurchases: this.save.foundryWeekPurchases,
      foundryWeeklyCap: FOUNDRY_BALANCE.weeklyCap,
      foundryCanBuy:
        this.upgrades.isWorkshopMaxed() &&
        this.save.foundryWeekPurchases < FOUNDRY_BALANCE.weeklyCap &&
        this.economy.canAffordCoins(this.getFoundryCost()),
      prestigeReward: this.prestige.getReward(wave.wave),
      canPrestige: this.prestige.canPrestige(wave.wave),
      ascensionBonus: this.prestige.getDamageBonusPercent(coresEarned),
      ascensionTier: this.prestige.getTier(coresEarned),
      ascensionFrame: this.prestige.getFrameName(coresEarned),
      ascensionNextFrame: this.prestige.getNextFrameLabel(coresEarned),
      coresEarned: formatCompact(coresEarned),
      prestigeNodes: this.prestige.getNodeViews(this.economy),
      bossPhase: boss?.phase ?? 0,
      bossWeakPoint: boss?.weakPointOpen ?? false,
      dailyContracts: this.daily.getContracts(),
      dailyLeaderboard: this.daily.getLeaderboard(),
    };
    useGameStore
      .getState()
      .applySnapshot(snapshot, this.upgrades.getUpgradeViews(this.economy), this.monetization.getShopViews());
  }

}
