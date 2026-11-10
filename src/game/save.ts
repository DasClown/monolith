import type { AbilityId, DailyState, Entitlements } from '../core/types';
import { DEFAULT_COSMETIC, isCosmeticId, type CosmeticId } from '../config/cosmetics';
import { emptyDailyState, todayKey, weekKey } from '../utils/daily';
import { createPlayerTag, DEFAULT_PLAYER_NAME, normalizePlayerName, normalizePlayerTag } from '../utils/profile';

export interface CosmeticSave {
  owned: CosmeticId[];
  equipped: CosmeticId;
}

export interface SaveData {
  version: 2;
  coins: string;
  gems: string;
  cores: string;
  coresEarned: string;
  lastSeen: number;
  workshop: Record<string, number>;
  prestigeNodes: Record<string, number>;
  abilities: AbilityId[];
  playerName: string;
  playerTag: string;
  daily: DailyState;
  entitlements: Partial<Entitlements>;
  purchaseCounts: Record<string, number>;
  bestWave: number;
  runs: number;
  cosmetics: CosmeticSave;
  foundryPurchases: number;
  foundryWeek: string;
  foundryWeekPurchases: number;
}

const STORAGE_KEY = 'monolith-defense.save.v2';
const LEGACY_KEY = 'monolith-defense.save.v1';

export function defaultSave(): SaveData {
  return {
    version: 2,
    coins: '120',
    gems: '25',
    cores: '0',
    coresEarned: '0',
    lastSeen: 0,
    workshop: {},
    prestigeNodes: {},
    abilities: ['nova', 'aegis'],
    playerName: DEFAULT_PLAYER_NAME,
    playerTag: createPlayerTag(),
    daily: emptyDailyState(),
    entitlements: {},
    purchaseCounts: {},
    bestWave: 0,
    runs: 0,
    cosmetics: { owned: [DEFAULT_COSMETIC], equipped: DEFAULT_COSMETIC },
    foundryPurchases: 0,
    foundryWeek: weekKey(),
    foundryWeekPurchases: 0,
  };
}

function normalizeCosmetics(value: unknown): CosmeticSave {
  const parsed = value && typeof value === 'object' ? (value as Partial<CosmeticSave>) : null;
  const owned = Array.isArray(parsed?.owned)
    ? parsed.owned.filter((id): id is CosmeticId => isCosmeticId(id))
    : [];
  if (!owned.includes(DEFAULT_COSMETIC)) owned.unshift(DEFAULT_COSMETIC);
  const equipped =
    parsed && isCosmeticId(parsed.equipped) && owned.includes(parsed.equipped)
      ? parsed.equipped
      : DEFAULT_COSMETIC;
  return { owned, equipped };
}

function normalizeDaily(value: unknown): DailyState {
  if (!value || typeof value !== 'object') return emptyDailyState();
  const parsed = value as Partial<DailyState>;
  if (parsed.date !== todayKey()) return emptyDailyState();
  return {
    date: todayKey(),
    kills: typeof parsed.kills === 'number' ? parsed.kills : 0,
    waves: typeof parsed.waves === 'number' ? parsed.waves : 0,
    abilityUses: typeof parsed.abilityUses === 'number' ? parsed.abilityUses : 0,
    runs: typeof parsed.runs === 'number' ? parsed.runs : 0,
    claimed: Array.isArray(parsed.claimed) ? parsed.claimed.filter((id) => typeof id === 'string') : [],
    leaderboard: Array.isArray(parsed.leaderboard)
      ? parsed.leaderboard
          .filter((entry) => entry && typeof entry.wave === 'number')
          .slice(0, 10)
          .map((entry) => ({
            wave: entry.wave,
            kills: typeof entry.kills === 'number' ? entry.kills : 0,
            date: typeof entry.date === 'string' ? entry.date : todayKey(),
            name: typeof entry.name === 'string' ? entry.name : undefined,
          }))
      : [],
  };
}

export function loadSave(): SaveData {
  if (typeof window === 'undefined') return defaultSave();
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<SaveData>;
      if (parsed && parsed.version === 2) {
        return {
          version: 2,
          coins: typeof parsed.coins === 'string' ? parsed.coins : '120',
          gems: typeof parsed.gems === 'string' ? parsed.gems : '25',
          cores: typeof parsed.cores === 'string' ? parsed.cores : '0',
          coresEarned:
            typeof parsed.coresEarned === 'string'
              ? parsed.coresEarned
              : typeof parsed.cores === 'string'
                ? parsed.cores
                : '0',
          lastSeen: typeof parsed.lastSeen === 'number' ? parsed.lastSeen : 0,
          workshop: typeof parsed.workshop === 'object' && parsed.workshop ? parsed.workshop : {},
          prestigeNodes:
            typeof parsed.prestigeNodes === 'object' && parsed.prestigeNodes
              ? parsed.prestigeNodes
              : {},
          abilities: Array.isArray(parsed.abilities)
            ? parsed.abilities.filter((id): id is AbilityId =>
                id === 'nova' || id === 'aegis' || id === 'overdrive',
              )
            : ['nova', 'aegis'],
          playerName: normalizePlayerName(parsed.playerName) ?? DEFAULT_PLAYER_NAME,
          playerTag: normalizePlayerTag(parsed.playerTag) ?? createPlayerTag(),
          daily: normalizeDaily(parsed.daily),
          entitlements:
            typeof parsed.entitlements === 'object' && parsed.entitlements
              ? parsed.entitlements
              : {},
          purchaseCounts:
            typeof parsed.purchaseCounts === 'object' && parsed.purchaseCounts
              ? parsed.purchaseCounts
              : {},
          bestWave: typeof parsed.bestWave === 'number' ? parsed.bestWave : 0,
          runs: typeof parsed.runs === 'number' ? parsed.runs : 0,
          cosmetics: normalizeCosmetics(parsed.cosmetics),
          foundryPurchases:
            typeof parsed.foundryPurchases === 'number' ? Math.max(0, parsed.foundryPurchases) : 0,
          foundryWeek: weekKey(),
          foundryWeekPurchases:
            parsed.foundryWeek === weekKey() && typeof parsed.foundryWeekPurchases === 'number'
              ? Math.max(0, parsed.foundryWeekPurchases)
              : 0,
        };
      }
    }

    const rawV1 = window.localStorage.getItem(LEGACY_KEY);
    if (rawV1) {
      const legacy = JSON.parse(rawV1) as {
        version?: number;
        coins?: string;
        gems?: string;
        cores?: string;
        lastSeen?: number;
        workshop?: Record<string, number>;
        entitlements?: Partial<Entitlements>;
        purchaseCounts?: Record<string, number>;
        bestWave?: number;
        runs?: number;
      };
      if (legacy && legacy.version === 1) {
        return {
          version: 2,
          coins: typeof legacy.coins === 'string' ? legacy.coins : '120',
          gems: typeof legacy.gems === 'string' ? legacy.gems : '25',
          cores: typeof legacy.cores === 'string' ? legacy.cores : '0',
          coresEarned: typeof legacy.cores === 'string' ? legacy.cores : '0',
          lastSeen: typeof legacy.lastSeen === 'number' ? legacy.lastSeen : 0,
          workshop: typeof legacy.workshop === 'object' && legacy.workshop ? legacy.workshop : {},
          prestigeNodes: {},
          abilities: ['nova', 'aegis'],
          playerName: DEFAULT_PLAYER_NAME,
          playerTag: createPlayerTag(),
          daily: emptyDailyState(),
          entitlements:
            typeof legacy.entitlements === 'object' && legacy.entitlements
              ? legacy.entitlements
              : {},
          purchaseCounts:
            typeof legacy.purchaseCounts === 'object' && legacy.purchaseCounts
              ? legacy.purchaseCounts
              : {},
          bestWave: typeof legacy.bestWave === 'number' ? legacy.bestWave : 0,
          runs: typeof legacy.runs === 'number' ? legacy.runs : 0,
          cosmetics: { owned: [DEFAULT_COSMETIC], equipped: DEFAULT_COSMETIC },
          foundryPurchases: 0,
          foundryWeek: weekKey(),
          foundryWeekPurchases: 0,
        };
      }
    }
    return defaultSave();
  } catch {
    return defaultSave();
  }
}

/**
 * Parses a v2 export downloaded from the game. Missing optional fields are
 * filled with safe defaults so imports from an older v2 build still work.
 */
export function parseSaveText(text: string): SaveData | null {
  try {
    const parsed = JSON.parse(text) as Partial<SaveData>;
    if (!parsed || parsed.version !== 2) return null;
    const base = defaultSave();
    return {
      ...base,
      ...parsed,
      version: 2,
      coins: typeof parsed.coins === 'string' ? parsed.coins : base.coins,
      gems: typeof parsed.gems === 'string' ? parsed.gems : base.gems,
      cores: typeof parsed.cores === 'string' ? parsed.cores : base.cores,
      coresEarned:
        typeof parsed.coresEarned === 'string'
          ? parsed.coresEarned
          : typeof parsed.cores === 'string'
            ? parsed.cores
            : base.coresEarned,
      lastSeen: typeof parsed.lastSeen === 'number' ? parsed.lastSeen : Date.now(),
      workshop: typeof parsed.workshop === 'object' && parsed.workshop ? parsed.workshop : {},
      prestigeNodes:
        typeof parsed.prestigeNodes === 'object' && parsed.prestigeNodes
          ? parsed.prestigeNodes
          : {},
      abilities: Array.isArray(parsed.abilities)
        ? parsed.abilities.filter((id): id is AbilityId =>
            id === 'nova' || id === 'aegis' || id === 'overdrive',
          )
        : ['nova', 'aegis'],
      playerName: normalizePlayerName(parsed.playerName) ?? base.playerName,
      playerTag: normalizePlayerTag(parsed.playerTag) ?? base.playerTag,
      daily: normalizeDaily(parsed.daily),
      entitlements:
        typeof parsed.entitlements === 'object' && parsed.entitlements
          ? parsed.entitlements
          : {},
      purchaseCounts:
        typeof parsed.purchaseCounts === 'object' && parsed.purchaseCounts
          ? parsed.purchaseCounts
          : {},
      bestWave: typeof parsed.bestWave === 'number' ? parsed.bestWave : 0,
      runs: typeof parsed.runs === 'number' ? parsed.runs : 0,
      cosmetics: normalizeCosmetics(parsed.cosmetics),
      foundryPurchases:
        typeof parsed.foundryPurchases === 'number' ? Math.max(0, parsed.foundryPurchases) : 0,
      foundryWeek: weekKey(),
      foundryWeekPurchases:
        parsed.foundryWeek === weekKey() && typeof parsed.foundryWeekPurchases === 'number'
          ? Math.max(0, parsed.foundryWeekPurchases)
          : 0,
    };
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage can be unavailable in private browsing; the run still works.
  }
}

export function clearSave(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Ignore storage failures.
  }
}
