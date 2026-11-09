export const DEFAULT_PLAYER_NAME = 'PILOT';

/** 2-16 characters, letters/numbers/space/underscore/dot/hyphen. */
export function normalizePlayerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2 || cleaned.length > 16) return null;
  if (!/^[\p{L}\p{N} _.-]+$/u.test(cleaned)) return null;
  return cleaned;
}

export function createPlayerTag(): string {
  const bytes = new Uint8Array(2);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 256);
    bytes[1] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function normalizePlayerTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toUpperCase();
  return /^[A-F0-9]{4}$/.test(cleaned) ? cleaned : null;
}

export function playerLabel(name: string, tag: string): string {
  return `${name}#${tag}`;
}
