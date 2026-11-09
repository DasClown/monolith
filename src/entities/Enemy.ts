import { angleOf, distance, normalize } from '../core/math';
import type { DamageType, EnemyKind, EnemySpawnSpec, WaveMutatorId } from '../core/types';
import { ENEMY_ARCHETYPES } from './EnemyArchetypes';

const ATTACK_INTERVAL: Record<EnemyKind, number> = {
  skitter: 1.05,
  wisp: 0.72,
  brute: 1.35,
  warden: 1.1,
  crusher: 1.55,
  summoner: 1.4,
  artillery: 1.8,
};

export interface DamageResult {
  applied: number;
  killed: boolean;
}

export type EnemyAttack = 'normal' | 'slam' | 'artillery';

let nextEnemyId = 1;

export class Enemy {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly tier: number;
  readonly maxHealth: number;
  readonly speed: number;
  readonly damage: number;
  readonly reward: number;
  readonly radius: number;
  readonly armor: number;
  readonly resistances: Partial<Record<DamageType, number>>;
  readonly boss: boolean;
  readonly attackInterval: number;
  readonly spawnAngle: number;
  readonly mutators: readonly WaveMutatorId[];
  readonly maxShield: number;
  readonly regenPerSecond: number;

  hp: number;
  shield: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  angle: number;
  age = 0;
  hitFlash = 0;
  dead = false;
  phase = 1;
  slamWindup = 0;
  weakPointOpen = false;
  burnRemaining = 0;
  burnDps = 0;
  slowRemaining = 0;
  slowFactor = 0;

  private attackCooldown: number;
  private slamCooldown = 4.5;
  private weakPointTimer = 5.5;
  private pendingPhase: number | null = null;
  private pendingWeakPoint = false;
  private pendingBossAttack: 'slam' | 'artillery' = 'slam';
  private summonCooldown = 4;
  private queuedSummons = 0;
  private readonly wobblePhase: number;

  constructor(spec: EnemySpawnSpec, id = nextEnemyId++) {
    const archetype = ENEMY_ARCHETYPES[spec.kind];
    this.id = id;
    this.kind = spec.kind;
    this.tier = spec.tier;
    this.maxHealth = spec.maxHealth;
    this.hp = spec.maxHealth;
    this.shield = spec.shield;
    this.maxShield = spec.shield;
    this.speed = spec.speed;
    this.damage = spec.damage;
    this.reward = spec.reward;
    this.radius = archetype.radius;
    this.armor = spec.armor;
    this.resistances = archetype.resistances;
    this.boss = archetype.boss;
    this.attackInterval = ATTACK_INTERVAL[spec.kind];
    this.spawnAngle = spec.spawnAngle;
    this.mutators = spec.mutators;
    this.regenPerSecond = spec.regen;
    this.attackCooldown = 0.3;
    this.wobblePhase = (id * 2.399963) % (Math.PI * 2);
    this.x = Math.cos(spec.spawnAngle) * spec.spawnRadius;
    this.y = Math.sin(spec.spawnAngle) * spec.spawnRadius;
    this.prevX = this.x;
    this.prevY = this.y;
    this.angle = angleOf(-this.x, -this.y);
  }

  get healthRatio(): number {
    return Math.max(0, this.hp / this.maxHealth);
  }

  get shieldRatio(): number {
    return this.maxShield > 0 ? Math.max(0, this.shield / this.maxShield) : 0;
  }

  get spawnProgress(): number {
    return Math.min(1, this.age / 0.4);
  }

  get isBurning(): boolean {
    return this.burnRemaining > 0;
  }

  get isSlowed(): boolean {
    return this.slowRemaining > 0 && this.slowFactor > 0;
  }

  get currentDamage(): number {
    return this.damage * (1 + (this.phase - 1) * 0.25);
  }

  /**
   * Moves the creature toward the monolith. Bosses stop to telegraph a slam.
   */
  update(dt: number, towerRadius: number): EnemyAttack | null {
    this.prevX = this.x;
    this.prevY = this.y;
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.attackCooldown -= dt;
    this.slamCooldown = Math.max(0, this.slamCooldown - dt);

    if (this.hp <= 0 || this.dead) return null;
    if (this.regenPerSecond > 0) {
      this.hp = Math.min(this.maxHealth, this.hp + this.regenPerSecond * dt);
    }
    if (this.kind === 'summoner') {
      this.summonCooldown -= dt;
      if (this.summonCooldown <= 0) {
        this.summonCooldown = 9;
        this.queuedSummons += 1 + this.phase;
      }
    }
    if (this.boss) {
      this.refreshPhase();
      this.updateWeakPoint(dt);
      if (this.slamWindup > 0) {
        this.slamWindup = Math.max(0, this.slamWindup - dt);
        if (this.slamWindup <= 0) {
          this.slamCooldown = this.kind === 'artillery' ? 6.5 : 7;
          return this.pendingBossAttack;
        }
        return null;
      }
    }

    const dist = distance(this.x, this.y, 0, 0);
    const stopDistance =
      this.kind === 'artillery'
        ? towerRadius + 155
        : towerRadius + this.radius + 5;
    const dir = normalize(-this.x, -this.y);
    this.angle = angleOf(dir.x, dir.y);

    if (dist <= stopDistance) {
      if (this.kind === 'crusher' && this.slamCooldown <= 0) {
        this.pendingBossAttack = 'slam';
        this.slamWindup = 1.35;
        return null;
      }
      if (this.kind === 'artillery') {
        if (this.slamCooldown <= 0) {
          this.pendingBossAttack = 'artillery';
          this.slamWindup = 1.4;
          return null;
        }
        return null;
      }
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackInterval;
        return 'normal';
      }
      return null;
    }

    // A small tangential wobble keeps movement organic without sacrificing
    // a clean, deterministic path to the core.
    const wobble = Math.sin(this.age * 2.2 + this.wobblePhase) * 0.16;
    const moveX = dir.x + -dir.y * wobble;
    const moveY = dir.y + dir.x * wobble;
    const move = normalize(moveX, moveY);
    const slow = this.isSlowed ? 1 - this.slowFactor : 1;
    const enrage = this.boss ? 1 + (this.phase - 1) * 0.12 : 1;
    const velocity = this.speed * slow * enrage;
    this.x += move.x * velocity * dt;
    this.y += move.y * velocity * dt;

    if (distance(this.x, this.y, 0, 0) < stopDistance) {
      this.x = -dir.x * stopDistance;
      this.y = -dir.y * stopDistance;
    }
    return null;
  }

  updateStatus(dt: number): DamageResult {
    if (this.dead) return { applied: 0, killed: true };

    if (this.slowRemaining > 0) {
      this.slowRemaining = Math.max(0, this.slowRemaining - dt);
      if (this.slowRemaining <= 0) this.slowFactor = 0;
    }

    let applied = 0;
    if (this.burnRemaining > 0) {
      this.burnRemaining = Math.max(0, this.burnRemaining - dt);
      const thermal = Math.min(0.8, (this.resistances.thermal ?? 0) + 0);
      applied = this.burnDps * dt * (1 - thermal);
      this.hp -= applied;
      if (this.hp <= 0 && !this.dead) {
        this.hp = 0;
        this.dead = true;
        return { applied, killed: true };
      }
      this.refreshPhase();
    }
    return { applied, killed: false };
  }

  takeDamage(rawDamage: number, damageType: DamageType = 'kinetic'): DamageResult {
    if (this.dead) return { applied: 0, killed: true };
    const weakPointMultiplier = this.boss && this.weakPointOpen ? 1.55 : 1;
    const kineticArmor = damageType === 'kinetic' ? this.armor : 0;
    const resistance = (this.resistances[damageType] ?? 0) + kineticArmor;
    let incoming = rawDamage * weakPointMultiplier * (1 - Math.min(0.85, resistance));
    let applied = 0;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, incoming);
      this.shield -= absorbed;
      incoming -= absorbed;
      applied += absorbed;
    }

    if (incoming > 0) {
      this.hp -= incoming;
      applied += incoming;
    }

    this.hitFlash = 0.14;
    this.refreshPhase();
    if (this.hp <= 0 && !this.dead) {
      this.hp = 0;
      this.dead = true;
      return { applied, killed: true };
    }
    return { applied, killed: false };
  }

  applyBurn(dps: number, duration: number): void {
    if (dps <= 0) return;
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnRemaining = Math.max(this.burnRemaining, duration);
  }

  applySlow(factor: number, duration: number): void {
    if (factor <= 0) return;
    this.slowFactor = Math.max(this.slowFactor, factor);
    this.slowRemaining = Math.max(this.slowRemaining, duration);
  }

  consumePhaseChange(): number | null {
    const phase = this.pendingPhase;
    this.pendingPhase = null;
    return phase;
  }

  consumeWeakPointOpen(): boolean {
    if (!this.pendingWeakPoint) return false;
    this.pendingWeakPoint = false;
    return true;
  }

  consumeSummons(): number {
    const count = this.queuedSummons;
    this.queuedSummons = 0;
    return count;
  }

  private refreshPhase(): void {
    if (!this.boss) return;
    const ratio = this.hp / this.maxHealth;
    const nextPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    if (nextPhase > this.phase) {
      this.phase = nextPhase;
      this.pendingPhase = nextPhase;
    }
  }

  private updateWeakPoint(dt: number): void {
    if (this.weakPointOpen) {
      this.weakPointTimer = Math.max(0, this.weakPointTimer - dt);
      if (this.weakPointTimer <= 0) {
        this.weakPointOpen = false;
        this.weakPointTimer = 7;
      }
      return;
    }

    this.weakPointTimer -= dt;
    if (this.weakPointTimer <= 0) {
      this.weakPointOpen = true;
      this.weakPointTimer = 3;
      this.pendingWeakPoint = true;
    }
  }
}
