import { describe, expect, it } from 'vitest';
import { AbilitySystem } from '../src/systems/AbilitySystem';
import { DailySystem } from '../src/systems/DailySystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { DisabledIapAdapter, MonetizationSystem } from '../src/systems/MonetizationSystem';
import { PrestigeSystem } from '../src/systems/PrestigeSystem';
import { WaveSystem } from '../src/systems/WaveSystem';
import { Enemy } from '../src/entities/Enemy';
import type { EnemyKind, EnemySpawnSpec } from '../src/core/types';
import { todayKey } from '../src/utils/daily';
import { RNG } from '../src/core/rng';
import { parseSaveText } from '../src/game/save';
import { normalizePlayerName } from '../src/utils/profile';
import { COSMETICS, DEFAULT_COSMETIC, isCosmeticId } from '../src/config/cosmetics';

function spec(kind: EnemyKind, patch: Partial<EnemySpawnSpec> = {}): EnemySpawnSpec {
  return {
    kind,
    tier: 1,
    wave: 1,
    maxHealth: 1000,
    damage: 10,
    speed: 30,
    reward: 4,
    spawnAngle: 0,
    spawnRadius: 0,
    armor: 0,
    shield: 0,
    regen: 0,
    mutators: [],
    ...patch,
  };
}

describe('deterministic simulation', () => {
  it('replays the same seeded sequence', () => {
    const first = new RNG(0x12345678);
    const second = new RNG(0x12345678);
    const a = Array.from({ length: 12 }, () => first.next());
    const b = Array.from({ length: 12 }, () => second.next());
    expect(a).toEqual(b);
    expect(new RNG(0x12345679).next()).not.toBe(a[0]);
  });
});

describe('ability loadout', () => {
  it('defaults to Nova and Aegis and swaps duplicate selections', () => {
    const abilities = new AbilitySystem();
    expect(abilities.getLoadout()).toEqual(['nova', 'aegis']);
    expect(abilities.equip(1, 'overdrive')).toBe(true);
    expect(abilities.getLoadout()).toEqual(['nova', 'overdrive']);
    abilities.equip(1, 'nova');
    expect(abilities.getLoadout()).toEqual(['overdrive', 'nova']);
  });

  it('runs independent cooldowns', () => {
    const abilities = new AbilitySystem();
    abilities.startCooldown('nova', 0.5);
    expect(abilities.canUse('nova')).toBe(false);
    expect(abilities.canUse('aegis')).toBe(true);
    abilities.update(12);
    expect(abilities.canUse('nova')).toBe(true);
    expect(abilities.getViews(0.5)[0]?.cooldownMax).toBe(12);
  });
});

describe('prestige tree', () => {
  it('spends spendable cores while passive bonuses use lifetime cores', () => {
    const economy = new EconomySystem(120, 25, 10, 30);
    const prestige = new PrestigeSystem();
    expect(prestige.getDamageBonusPercent(economy.getCoresEarned())).toBe(60);
    expect(prestige.getNodeCost({ id: 'strike', name: '', description: '', branch: 'offense', accent: 'pink', maxLevel: 5, baseCost: 1 })).toBe(1);
    expect(prestige.buyNode('strike', economy).ok).toBe(true);
    expect(economy.getCores().toNumber()).toBe(9);
    expect(economy.getCoresEarned().toNumber()).toBe(30);
    expect(prestige.getTreeModifiers().damage).toBeCloseTo(0.04);
    expect(prestige.buyNode('crit', economy).ok).toBe(true);
    expect(prestige.getTreeModifiers().crit).toBeCloseTo(0.02);
  });

  it('locks nodes behind their prerequisite', () => {
    const economy = new EconomySystem(0, 0, 20, 20);
    const prestige = new PrestigeSystem();
    expect(prestige.buyNode('crit', economy).ok).toBe(false);
    expect(prestige.getNodeViews(economy).find((node) => node.id === 'crit')?.locked).toBe(true);
  });
});

describe('daily operations', () => {
  it('tracks progress and pays a completed contract once', () => {
    const economy = new EconomySystem(0, 0, 0, 0);
    const daily = new DailySystem({
      date: todayKey(),
      kills: 0,
      waves: 0,
      abilityUses: 0,
      runs: 0,
      claimed: [],
      leaderboard: [],
    });
    for (let i = 0; i < 80; i += 1) daily.recordKill();
    expect(daily.getContracts().find((c) => c.id === 'hostile-cull')?.claimable).toBe(true);
    expect(daily.claim('hostile-cull', economy).ok).toBe(true);
    expect(economy.getCoins().toNumber()).toBe(120);
    expect(daily.claim('hostile-cull', economy).ok).toBe(false);
  });

  it('keeps a local top-five leaderboard', () => {
    const daily = new DailySystem({
      date: todayKey(),
      kills: 0,
      waves: 0,
      abilityUses: 0,
      runs: 0,
      claimed: [],
      leaderboard: [],
    });
    daily.recordRun(5, 20, 'NOVA#A1B2');
    daily.recordRun(9, 30, 'REX#C3D4');
    daily.recordRun(3, 10, 'NOVA#A1B2');
    expect(daily.getLeaderboard()[0]?.wave).toBe(9);
    expect(daily.getLeaderboard()[0]?.name).toBe('REX#C3D4');
    expect(daily.getLeaderboard()).toHaveLength(3);
  });
});

describe('production store safety', () => {
  it('does not grant anything when the store is disabled', async () => {
    const store = new MonetizationSystem(new DisabledIapAdapter());
    const economy = new EconomySystem(0, 0, 0, 0);
    expect(store.storeStatus).toBe('disabled');
    expect(store.getShopViews().every((product) => product.disabled)).toBe(true);
    const result = await store.purchase('supporter_pack', economy);
    expect(result.ok).toBe(false);
    expect(store.snapshot.supporter).toBe(false);
  });

  it('hydrates permanent supporter status from the cloud', () => {
    const store = new MonetizationSystem(new DisabledIapAdapter());
    store.hydrate({ supporter: true }, {});
    expect(store.snapshot.supporter).toBe(true);
    expect(store.getShopViews().find((product) => product.id === 'supporter_pack')?.owned).toBe(true);
  });
});

describe('player profile and save transfer', () => {
  it('accepts safe names and rejects control characters', () => {
    expect(normalizePlayerName('  NOVA  ')).toBe('NOVA');
    expect(normalizePlayerName('Pilot 01')).toBe('Pilot 01');
    expect(normalizePlayerName('A')).toBeNull();
    expect(normalizePlayerName('<script>')).toBeNull();
  });

  it('round-trips a v2 save export', () => {
    const parsed = parseSaveText(
      JSON.stringify({
        version: 2,
        coins: '777',
        gems: '42',
        cores: '3',
        coresEarned: '9',
        playerName: 'NOVA',
        playerTag: 'A1B2',
        abilities: ['nova', 'overdrive'],
        daily: { date: todayKey(), kills: 4, waves: 2, abilityUses: 1, runs: 1, claimed: [], leaderboard: [] },
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.coins).toBe('777');
    expect(parsed?.playerName).toBe('NOVA');
    expect(parsed?.playerTag).toBe('A1B2');
    expect(parsed?.abilities).toEqual(['nova', 'overdrive']);
    expect(parsed?.daily.kills).toBe(4);
  });

  it('rejects a save with the wrong version', () => {
    expect(parseSaveText(JSON.stringify({ version: 1, coins: '1' }))).toBeNull();
  });
});

describe('wave composition and bosses', () => {
  it('rotates Crusher, Summoner, and Artillery bosses', () => {
    const waves = new WaveSystem(1);
    const bossKindAt = (wave: number): EnemyKind | undefined => {
      waves.wave = wave - 1;
      waves.phase = 'intermission';
      waves.beginNextWave();
      const queue = (waves as unknown as { spawnQueue: EnemySpawnSpec[] }).spawnQueue;
      return queue.find((entry) => entry.kind === 'crusher' || entry.kind === 'summoner' || entry.kind === 'artillery')?.kind;
    };
    expect(bossKindAt(5)).toBe('crusher');
    expect(bossKindAt(10)).toBe('summoner');
    expect(bossKindAt(15)).toBe('artillery');
  });

  it('creates scaled summon minions', () => {
    const waves = new WaveSystem(1);
    waves.wave = 10;
    const minion = waves.createSummonSpec('skitter', 120, 0, 0, 2);
    expect(minion.kind).toBe('skitter');
    expect(minion.maxHealth).toBeGreaterThan(0);
    expect(minion.spawnRadius).toBeGreaterThan(120);
  });
});

describe('damage types and boss attacks', () => {
  it('applies kinetic armor and elemental resistances separately', () => {
    const enemy = new Enemy(spec('warden', { armor: 0.3 }));
    const kinetic = enemy.takeDamage(100, 'kinetic').applied;
    const thermal = enemy.takeDamage(100, 'thermal').applied;
    const arc = enemy.takeDamage(100, 'arc').applied;
    expect(kinetic).toBeCloseTo(55, 4);
    expect(thermal).toBeCloseTo(100, 4);
    expect(arc).toBeCloseTo(65, 4);
  });

  it('summons minions from a Summoner boss', () => {
    const boss = new Enemy(spec('summoner', { spawnRadius: 300, maxHealth: 5000 }));
    for (let i = 0; i < 100; i += 1) boss.update(0.1, 52);
    expect(boss.consumeSummons()).toBeGreaterThan(0);
  });

  it('telegraphs an artillery strike at range', () => {
    const boss = new Enemy(spec('artillery', { spawnRadius: 200, maxHealth: 5000 }));
    let attack = null;
    for (let i = 0; i < 100; i += 1) {
      const result = boss.update(0.1, 52);
      if (result === 'artillery') {
        attack = result;
        break;
      }
    }
    expect(attack).toBe('artillery');
  });
});


describe('cosmetic collection', () => {
  it('keeps the default palette free and catalog ids unique', () => {
    const ids = COSMETICS.map((cosmetic) => cosmetic.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_COSMETIC);
    expect(COSMETICS.find((cosmetic) => cosmetic.id === DEFAULT_COSMETIC)?.cost).toBe(0);
    expect(isCosmeticId('toString')).toBe(false);
    expect(isCosmeticId('azure')).toBe(true);
  });

  it('migrates a v2 save with a cosmetic selection', () => {
    const parsed = parseSaveText(
      JSON.stringify({
        version: 2,
        cosmetics: { owned: ['azure'], equipped: 'azure' },
      }),
    );
    expect(parsed?.cosmetics.owned).toContain('obsidian');
    expect(parsed?.cosmetics.equipped).toBe('azure');
  });
});
