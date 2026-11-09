import { TAU } from '../core/math';

export class Orbital {
  readonly id: number;
  angle: number;
  radius: number;
  damage: number;
  spinSpeed: number;
  size: number;
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  private readonly cooldowns = new Map<number, number>();

  constructor(id: number, index: number, count: number, radius: number, damage: number, spinSpeed: number, size: number) {
    this.id = id;
    this.angle = (index / Math.max(1, count)) * TAU;
    this.radius = radius;
    this.damage = damage;
    this.spinSpeed = spinSpeed;
    this.size = size;
    this.updatePosition(0);
    this.prevX = this.x;
    this.prevY = this.y;
  }

  applyStats(radius: number, damage: number, spinSpeed: number, size: number): void {
    this.radius = radius;
    this.damage = damage;
    this.spinSpeed = spinSpeed;
    this.size = size;
  }

  update(dt: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.angle = (this.angle + this.spinSpeed * dt) % TAU;
    this.updatePosition(dt);
    for (const [enemyId, remaining] of this.cooldowns) {
      const next = remaining - dt;
      if (next <= 0) this.cooldowns.delete(enemyId);
      else this.cooldowns.set(enemyId, next);
    }
  }

  canHit(enemyId: number): boolean {
    return !this.cooldowns.has(enemyId);
  }

  registerHit(enemyId: number): void {
    this.cooldowns.set(enemyId, 0.42);
  }

  private updatePosition(_dt: number): void {
    this.x = Math.cos(this.angle) * this.radius;
    this.y = Math.sin(this.angle) * this.radius;
  }
}
