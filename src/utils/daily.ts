import type { DailyState } from '../core/types';

export function todayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function emptyDailyState(date = todayKey()): DailyState {
  return {
    date,
    kills: 0,
    waves: 0,
    abilityUses: 0,
    runs: 0,
    claimed: [],
    leaderboard: [],
  };
}
