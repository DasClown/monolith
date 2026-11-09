/**
 * Broad phase and narrow phase collision utilities.
 * Circles only: cheap, deterministic, and ideal for a radial tower defense.
 */

export interface Collider {
  readonly id: number;
  x: number;
  y: number;
  radius: number;
}

export interface CircleHit {
  id: number;
}

export const circleOverlap = (a: Collider, b: Collider): boolean => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radii = a.radius + b.radius;
  return dx * dx + dy * dy <= radii * radii;
};

export const circleContainsPoint = (
  x: number,
  y: number,
  radius: number,
  pointX: number,
  pointY: number,
): boolean => {
  const dx = x - pointX;
  const dy = y - pointY;
  return dx * dx + dy * dy <= radius * radius;
};

/**
 * Uniform spatial hash. Insert once per simulation step, query for projectile
 * and orbital overlap checks. Queries are sorted by distance then id so that
 * hit selection is deterministic.
 */
export class SpatialHash<T extends Collider> {
  private readonly buckets = new Map<number, T[]>();
  private readonly inverseCellSize: number;
  private readonly queryScratch: T[] = [];
  private readonly seen = new Set<number>();

  constructor(cellSize = 96) {
    this.inverseCellSize = 1 / cellSize;
  }

  clear(): void {
    for (const bucket of this.buckets.values()) bucket.length = 0;
  }

  private hash(cx: number, cy: number): number {
    // Cantor-style pairing keeps the integer key stable and compact.
    return ((cx + 32768) << 16) ^ (cy + 32768);
  }

  insert(item: T): void {
    const cx = Math.floor(item.x * this.inverseCellSize);
    const cy = Math.floor(item.y * this.inverseCellSize);
    const key = this.hash(cx, cy);
    const bucket = this.buckets.get(key);
    if (bucket) bucket.push(item);
    else this.buckets.set(key, [item]);
  }

  /**
   * Returns colliders whose circle may overlap the query circle.
   * Results are exact overlaps, sorted nearest-first with id as a tiebreak.
   */
  queryCircle(x: number, y: number, radius: number): T[] {
    const minX = Math.floor((x - radius) * this.inverseCellSize);
    const maxX = Math.floor((x + radius) * this.inverseCellSize);
    const minY = Math.floor((y - radius) * this.inverseCellSize);
    const maxY = Math.floor((y + radius) * this.inverseCellSize);
    const results = this.queryScratch;
    results.length = 0;
    this.seen.clear();

    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const bucket = this.buckets.get(this.hash(cx, cy));
        if (!bucket) continue;
        for (const item of bucket) {
          if (this.seen.has(item.id)) continue;
          const dx = item.x - x;
          const dy = item.y - y;
          const sum = item.radius + radius;
          if (dx * dx + dy * dy <= sum * sum) {
            this.seen.add(item.id);
            results.push(item);
          }
        }
      }
    }

    results.sort((a, b) => {
      const da = (a.x - x) ** 2 + (a.y - y) ** 2;
      const db = (b.x - x) ** 2 + (b.y - y) ** 2;
      return da === db ? a.id - b.id : da - db;
    });

    return results;
  }
}
