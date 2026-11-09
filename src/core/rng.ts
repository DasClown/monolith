/**
 * Mulberry32: small, fast, deterministic PRNG.
 * The same seed always produces the same wave composition and crit sequence.
 */
export class RNG {
  private state: number;

  constructor(seed = 0x4d4f4e4f) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, maxExclusive: number): number {
    return Math.floor(this.range(min, maxExclusive));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)] ?? items[0];
  }

  /** A stable seed stream for a specific wave. */
  static forWave(baseSeed: number, wave: number): RNG {
    return new RNG((baseSeed ^ Math.imul(wave + 17, 0x9e3779b1)) >>> 0);
  }
}
