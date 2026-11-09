import { angleDelta, clamp } from '../core/math';
import type { TowerShot } from './Tower';

let nextProjectileId = 1;

export class Projectile {
  readonly id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  readonly damage: number;
  readonly crit: boolean;
  readonly radius = 5;
  readonly speed: number;
  readonly targetId: number | null;
  life = 1.7;
  dead = false;
  readonly hitIds = new Set<number>();

  constructor(shot: TowerShot, targetId: number | null = null, id = nextProjectileId++) {
    this.id = id;
    this.x = shot.x;
    this.y = shot.y;
    this.prevX = shot.x;
    this.prevY = shot.y;
    this.speed = shot.speed;
    this.vx = Math.cos(shot.angle) * shot.speed;
    this.vy = Math.sin(shot.angle) * shot.speed;
    this.damage = shot.damage;
    this.crit = shot.crit;
    this.targetId = targetId;
  }

  get angle(): number {
    return Math.atan2(this.vy, this.vx);
  }

  update(dt: number, target: { x: number; y: number } | null): void {
    this.prevX = this.x;
    this.prevY = this.y;

    if (target) {
      const desired = Math.atan2(target.y - this.y, target.x - this.x);
      const current = Math.atan2(this.vy, this.vx);
      const turn = clamp(angleDelta(current, desired), -7 * dt, 7 * dt);
      const nextAngle = current + turn;
      this.vx = Math.cos(nextAngle) * this.speed;
      this.vy = Math.sin(nextAngle) * this.speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  registerHit(enemyId: number): boolean {
    if (this.hitIds.has(enemyId)) return false;
    this.hitIds.add(enemyId);
    return true;
  }
}
