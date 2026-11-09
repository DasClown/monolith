import { OFFLINE_BALANCE } from '../config/balance';

export interface OfflineReward {
  coins: number;
  minutes: number;
  coinsPerMinute: number;
}

/**
 * Calculates idle salvage based on time away and the best wave reached.
 * The result is capped so a long absence cannot trivialise progression.
 */
export function calculateOfflineSalvage(
  lastSeen: number,
  bestWave: number,
  now = Date.now(),
): OfflineReward | null {
  if (!Number.isFinite(lastSeen) || lastSeen <= 0) return null;
  const elapsedMinutes = (now - lastSeen) / 60_000;
  if (elapsedMinutes < OFFLINE_BALANCE.minMinutes) return null;

  const cappedMinutes = Math.min(elapsedMinutes, OFFLINE_BALANCE.maxHours * 60);
  const rate = Math.min(
    OFFLINE_BALANCE.maxCoinsPerMinute,
    OFFLINE_BALANCE.baseCoinsPerMinute +
      Math.max(0, bestWave) * OFFLINE_BALANCE.coinsPerMinutePerBestWave,
  );
  const coins = Math.max(1, Math.floor(cappedMinutes * rate));
  return {
    coins,
    minutes: Math.floor(elapsedMinutes),
    coinsPerMinute: Math.round(rate * 10) / 10,
  };
}
