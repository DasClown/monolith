import { angleDelta, clamp, fromAngle } from '../core/math';
import type { TargetMode, TowerStats } from '../core/types';
import type { Enemy } from './Enemy';

export interface TowerShot {
  x: number;
  y: number;
  angle: number;
  damage: number;
  crit: boolean;
  speed: number;
}

export interface FireResult {
  shots: TowerShot[];
  targetId: number | null;
}

export class Tower {
  readonly x = 0;
  readonly y = 0;
  readonly radius = 52;
  stats: TowerStats;
  hp: number;
  maxHp: number;
  barrier = 0;
  aimAngle = Math.PI / 2;
  fireCooldown = 0;
  recoil = 0;
  hitFlash = 0;
  age = 0;
  idleAngle = 0;
  targetMode: TargetMode = 'closest';
  lastDamage = 0;

  constructor(stats: TowerStats) {
    this.stats = stats;
    this.maxHp = stats.maxHp;
    this.hp = stats.maxHp;
  }

  applyStats(stats: TowerStats): void {
    const previousMax = this.maxHp;
    this.stats = stats;
    this.maxHp = stats.maxHp;
    if (stats.maxHp > previousMax) this.hp += stats.maxHp - previousMax;
    this.hp = Math.min(this.hp, this.maxHp);
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  get healthRatio(): number {
    return clamp(this.hp / this.maxHp, 0, 1);
  }

  setTargetMode(mode: TargetMode): void {
    this.targetMode = mode;
  }

  update(dt: number, enemies: readonly Enemy[], critRoll: () => boolean): FireResult {
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.hp = Math.min(this.maxHp, this.hp + this.stats.regen * dt);

    const target = this.findTarget(enemies);
    if (!target) {
      this.idleAngle += dt * 0.28;
      const desired = this.idleAngle;
      this.aimAngle += angleDelta(this.aimAngle, desired) * Math.min(1, dt * 2.2);
      return { shots: [], targetId: null };
    }

    const desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
    this.aimAngle += angleDelta(this.aimAngle, desiredAngle) * Math.min(1, dt * 12);

    if (this.fireCooldown <= 0 && Math.abs(angleDelta(this.aimAngle, desiredAngle)) < 0.24) {
      this.fireCooldown = 1 / this.stats.fireRate;
      this.recoil = 1;
      const shots = this.buildVolley(critRoll);
      return { shots, targetId: target.id };
    }

    return { shots: [], targetId: target.id };
  }

  takeDamage(amount: number): boolean {
    const reduced = amount * (1 - clamp(this.stats.armor, 0, 0.9));
    const absorbed = Math.min(this.barrier, reduced);
    this.barrier -= absorbed;
    const applied = reduced - absorbed;
    this.lastDamage = applied;
    this.hp = Math.max(0, this.hp - applied);
    this.hitFlash = 0.25;
    return this.hp <= 0;
  }

  grantBarrier(amount: number): void {
    this.barrier = Math.min(this.maxHp * 0.75, this.barrier + amount);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  private findTarget(enemies: readonly Enemy[]): Enemy | null {
    const rangeSq = this.stats.range * this.stats.range;
    let closest: Enemy | null = null;
    let closestDistance = rangeSq;
    let bossTarget: Enemy | null = null;
    let bossDistance = rangeSq;
    let strongest: Enemy | null = null;
    let weakest: Enemy | null = null;

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > rangeSq) continue;

      if (distSq < closestDistance) {
        closestDistance = distSq;
        closest = enemy;
      }
      if (enemy.boss && distSq < bossDistance) {
        bossDistance = distSq;
        bossTarget = enemy;
      }
      if (!strongest || enemy.hp > strongest.hp) strongest = enemy;
      if (!weakest || enemy.hp < weakest.hp) weakest = enemy;
    }

    switch (this.targetMode) {
      case 'strongest':
        return strongest;
      case 'weakest':
        return weakest;
      case 'boss':
        return bossTarget ?? closest;
      case 'closest':
      default:
        return closest;
    }
  }

  private buildVolley(critRoll: () => boolean): TowerShot[] {
    const count = Math.max(1, this.stats.projectiles);
    const spread = count === 1 ? 0 : 0.11;
    const shots: TowerShot[] = [];
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const angle = this.aimAngle + offset;
      const muzzle = fromAngle(angle, this.radius + 18);
      const crit = critRoll();
      shots.push({
        x: muzzle.x,
        y: muzzle.y,
        angle,
        damage: this.stats.damage * (crit ? this.stats.critMultiplier : 1),
        crit,
        speed: this.stats.projectileSpeed,
      });
    }
    return shots;
  }
}
