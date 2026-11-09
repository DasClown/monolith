import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { clamp, easeOutCubic, lerp } from '../core/math';
import type { VisualEvent } from '../core/types';
import type { GameSession, SessionRenderer } from '../game/GameSession';
import { useSettingsStore } from '../store/settingsStore';
import {
  COSMETIC_BY_ID,
  DEFAULT_COSMETIC,
  type CosmeticDefinition,
} from '../config/cosmetics';
import { COLORS } from './palette';
import { createArena, createSpaceTexture, type ArenaView } from './background';
import { EffectsLayer } from './EffectsLayer';
import {
  createEnemyView,
  createOrbitalView,
  createProjectileView,
  createTowerView,
  type EnemyView,
  type OrbitalView,
  type ProjectileView,
  type TowerView,
} from './spriteFactory';

/**
 * All Pixi objects live here. The renderer reads simulation state and drains
 * visual events; it never mutates entities or game systems.
 */
export class GameRenderer implements SessionRenderer {
  private readonly host: HTMLElement;
  private readonly app = new Application();
  private readonly backgroundTexture: Texture;
  private readonly backgroundSprite: Sprite;
  private readonly world = new Container();
  private readonly enemyLayer = new Container();
  private readonly healthLayer = new Container();
  private readonly projectileLayer = new Container();
  private readonly orbitalLayer = new Container();
  private readonly towerLayer = new Container();
  private readonly projectileTrail = new Graphics();
  private readonly orbitalTrail = new Graphics();
  private readonly rangeIndicator = new Graphics();
  private readonly overdriveAura = new Graphics();
  private readonly cosmeticAura = new Graphics();
  private currentCosmetic: CosmeticDefinition = COSMETIC_BY_ID[DEFAULT_COSMETIC];
  private lastCosmeticId = '';
  private readonly screenFx = new Container();
  private readonly flash = new Graphics();
  private readonly threatArrows: Graphics[] = [];
  private readonly arena: ArenaView;
  private readonly towerView: TowerView;
  private readonly effects = new EffectsLayer();
  private readonly enemyViews = new Map<number, EnemyView>();
  private readonly projectileViews = new Map<number, ProjectileView>();
  private readonly orbitalViews = new Map<number, OrbitalView>();
  private resizeObserver: ResizeObserver | null = null;
  private width = 0;
  private height = 0;
  private time = 0;
  private shakeAmount = 0;
  private flashAmount = 0;
  private destroyed = false;
  private worldScale = 0.6;
  private worldCenterX = 0;
  private worldCenterY = 0;
  private lastRange = -1;
  private readonly reducedMotion: boolean;

  private constructor(host: HTMLElement) {
    this.host = host;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.backgroundTexture = createSpaceTexture();
    this.backgroundSprite = new Sprite(this.backgroundTexture);
    this.arena = createArena();
    this.towerView = createTowerView();
  }

  static async create(host: HTMLElement): Promise<GameRenderer> {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const renderer = new GameRenderer(host);
    await renderer.init();
    return renderer;
  }

  private async init(): Promise<void> {
    const width = Math.max(320, this.host.clientWidth);
    const height = Math.max(280, this.host.clientHeight);
    await this.app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
      powerPreference: 'high-performance',
    });
    this.app.canvas.className = 'arena-canvas';
    this.host.appendChild(this.app.canvas);

    this.backgroundSprite.anchor.set(0);
    this.app.stage.addChild(this.backgroundSprite);

    this.world.label = 'world';
    this.world.addChild(
      this.arena.container,
      this.rangeIndicator,
      this.projectileTrail,
      this.orbitalTrail,
      this.enemyLayer,
      this.projectileLayer,
      this.orbitalLayer,
      this.towerLayer,
      this.healthLayer,
      this.effects.container,
    );
    this.overdriveAura
      .circle(0, 0, 76)
      .stroke({ width: 3, color: COLORS.gold, alpha: 0.85 })
      .circle(0, 0, 94)
      .stroke({ width: 1.5, color: COLORS.pink, alpha: 0.45 });
    this.towerLayer.addChild(this.cosmeticAura, this.towerView.container, this.overdriveAura);
    this.app.stage.addChild(this.world);

    for (let i = 0; i < 8; i += 1) {
      const arrow = new Graphics();
      arrow
        .poly([-7, -5, 7, 0, -7, 5])
        .fill({ color: COLORS.cyan, alpha: 0.82 })
        .stroke({ width: 1.5, color: COLORS.ink, alpha: 0.9 });
      arrow.visible = false;
      this.threatArrows.push(arrow);
      this.screenFx.addChild(arrow);
    }
    this.flash.rect(0, 0, 1, 1).fill({ color: COLORS.pink, alpha: 1 });
    this.flash.alpha = 0;
    this.screenFx.addChild(this.flash);
    this.app.stage.addChild(this.screenFx);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
  }

  render(session: GameSession, alpha: number, realDelta: number): void {
    if (this.destroyed) return;
    const dt = Math.min(realDelta, 0.05);
    this.time += dt;
    this.shakeAmount = Math.max(0, this.shakeAmount - dt * 54);
    this.flashAmount = Math.max(0, this.flashAmount - dt * 3.8);

    this.layoutWorld();
    this.applyCosmetic(session);
    this.arena.outerRing.rotation += dt * 0.12;
    this.arena.innerRing.rotation -= dt * 0.2;
    this.syncTower(session, dt);
    this.syncEnemies(session, alpha, dt);
    this.syncProjectiles(session, alpha);
    this.syncOrbitals(session, alpha, dt);
    this.updateRangeIndicator(session);
    this.updateThreatArrows(session);
    this.processEvents(session.drainVisualEvents());
    this.effects.update(dt);

    const settings = useSettingsStore.getState();
    this.flash.alpha = this.flashAmount * (settings.reducedEffects ? 0.35 : 1);
    this.app.renderer.render(this.app.stage);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.enemyViews.clear();
    this.projectileViews.clear();
    this.orbitalViews.clear();
    this.app.destroy(
      { removeView: true },
      { children: true, texture: true, textureSource: true },
    );
  }

  private resize(): void {
    if (this.destroyed) return;
    const width = Math.max(320, this.host.clientWidth);
    const height = Math.max(280, this.host.clientHeight);
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.app.renderer.resize(width, height);
    this.backgroundSprite.width = width;
    this.backgroundSprite.height = height;
    this.flash.clear();
    this.flash.rect(0, 0, width, height).fill({ color: COLORS.pink, alpha: 1 });
    this.layoutWorld();
  }

  private layoutWorld(): void {
    if (this.destroyed) return;
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    if (width <= 0 || height <= 0) return;

    const scale = clamp(Math.min(width / 860, height / 900), 0.32, 0.84);
    const shakeX = (Math.random() * 2 - 1) * this.shakeAmount;
    const shakeY = (Math.random() * 2 - 1) * this.shakeAmount;
    this.worldScale = scale;
    this.worldCenterX = width / 2 + shakeX;
    this.worldCenterY = height * 0.485 + shakeY;
    this.world.scale.set(scale);
    this.world.position.set(this.worldCenterX, this.worldCenterY);
  }

  private syncTower(session: GameSession, dt: number): void {
    const tower = session.tower;
    const view = this.towerView;
    view.aimPivot.rotation = tower.aimAngle;
    view.barrel.position.x = -tower.recoil * 6;
    view.outerRing.rotation += dt * 0.34;
    view.core.rotation -= dt * 0.7;
    const corePulse = 1 + Math.sin(this.time * 4.2) * 0.06;
    view.core.scale.set(corePulse);
    view.coreGlow.scale.set(1 + Math.sin(this.time * 2.8) * 0.085);
    const hit = Math.min(0.9, tower.hitFlash * 4);
    view.damageOverlay.alpha = hit;
    view.container.x = Math.sin(this.time * 95) * tower.hitFlash * 4;

    const armorRatio = clamp(tower.stats.armor / 0.6, 0, 1);
    const barrierRatio = clamp(tower.barrier / Math.max(1, tower.maxHp), 0, 1);
    const shieldStrength = Math.max(armorRatio, barrierRatio * 1.4);
    view.shield.visible = shieldStrength > 0.001;
    view.shield.alpha = shieldStrength * (0.42 + Math.sin(this.time * 3.2) * 0.08);
    this.overdriveAura.visible = session.overdriveTimeRemaining > 0;
    this.overdriveAura.alpha = 0.45 + Math.sin(this.time * 9) * 0.25;
    view.shield.rotation += dt * (0.18 + armorRatio * 0.32);
    view.shield.scale.set(1 + Math.sin(this.time * 2.4) * 0.015);
    this.cosmeticAura.rotation += dt * 0.08;
    this.cosmeticAura.alpha = 0.36 + Math.sin(this.time * 1.7) * 0.1;

    const ascensionTier = session.ascensionTier;
    view.frameRings.forEach((ring, index) => {
      const active = index === ascensionTier - 1;
      ring.visible = active;
      if (active) {
        ring.rotation += dt * (0.16 + index * 0.06) * (index % 2 === 0 ? 1 : -1);
        ring.alpha = 0.32 + Math.sin(this.time * 1.8 + index) * 0.1;
        ring.scale.set(1 + Math.sin(this.time * 2.1 + index) * 0.012);
      }
    });
  }

  private applyCosmetic(session: GameSession): void {
    const next = COSMETIC_BY_ID[session.equippedCosmetic] ?? COSMETIC_BY_ID[DEFAULT_COSMETIC];
    if (next.id === this.lastCosmeticId) return;
    this.lastCosmeticId = next.id;
    this.currentCosmetic = next;
    this.towerView.coreGlow.tint = next.core;
    this.towerView.core.tint = next.core;
    this.towerView.outerRing.tint = next.accent;
    this.towerView.shield.tint = next.core;
    this.lastRange = -1;
    this.cosmeticAura.clear();
    this.cosmeticAura
      .circle(0, 0, 111)
      .stroke({ width: 1.5, color: next.accent, alpha: 0.2 });
    for (let i = 0; i < 6; i += 1) {
      const start = i * (Math.PI / 3) + 0.18;
      this.cosmeticAura
        .arc(0, 0, 117, start, start + 0.42)
        .stroke({ width: 2.5, color: next.core, alpha: 0.34 });
    }
    for (const view of this.projectileViews.values()) view.root.tint = next.projectile;
    for (const view of this.orbitalViews.values()) view.root.tint = next.orbit;
  }

  private syncEnemies(session: GameSession, alpha: number, dt: number): void {
    const seen = new Set<number>();
    for (const enemy of session.enemies) {
      seen.add(enemy.id);
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = createEnemyView(enemy);
        this.enemyViews.set(enemy.id, view);
        this.enemyLayer.addChild(view.root);
        this.healthLayer.addChild(view.healthBar);
      }

      const x = lerp(enemy.prevX, enemy.x, alpha);
      const y = lerp(enemy.prevY, enemy.y, alpha);
      const spawnScale = 0.54 + 0.46 * easeOutCubic(enemy.spawnProgress);
      let scale = spawnScale;
      if (enemy.boss) scale *= 1 + Math.sin(this.time * 2.6 + enemy.id) * 0.022;
      view.root.position.set(x, y);
      view.root.scale.set(scale);
      view.healthBar.position.set(x, y - (enemy.radius + 17) * scale);
      view.healthBar.scale.set(scale);
      view.body.rotation = enemy.angle;
      view.overlay.alpha = Math.min(0.72, enemy.hitFlash * 5.2);
      view.healthFill.scale.x = Math.max(0.001, (view.healthWidth - 3) * enemy.healthRatio);
      view.healthHit.alpha = Math.min(0.55, enemy.hitFlash * 2.4);

      view.burnAura.visible = enemy.isBurning;
      if (enemy.isBurning) {
        view.burnAura.rotation += dt * 1.7;
        view.burnAura.alpha = 0.45 + Math.sin(this.time * 12 + enemy.id) * 0.22;
      }
      view.slowAura.visible = enemy.isSlowed;
      if (enemy.isSlowed) {
        view.slowAura.rotation -= dt * 0.7;
        view.slowAura.alpha = 0.45 + Math.sin(this.time * 4 + enemy.id) * 0.12;
      }
      view.shieldAura.visible = enemy.maxShield > 0 && enemy.shield > 0;
      if (view.shieldAura.visible) {
        view.shieldAura.rotation += dt * 0.45;
        view.shieldAura.alpha = 0.25 + enemy.shieldRatio * 0.55;
      }
      view.mutatorAura.rotation += dt * 0.25;
      view.phaseAura.visible = enemy.boss && enemy.phase > 1;
      if (view.phaseAura.visible) {
        view.phaseAura.rotation -= dt * (0.5 + enemy.phase * 0.2);
        view.phaseAura.alpha = 0.35 + Math.sin(this.time * 5 + enemy.id) * 0.18;
      }
      view.weakPoint.visible = enemy.boss && enemy.weakPointOpen;
      if (view.weakPoint.visible) {
        const pulse = 1 + Math.sin(this.time * 8) * 0.22;
        view.weakPoint.scale.set(pulse);
      }
      view.telegraph.visible = enemy.slamWindup > 0;
      if (view.telegraph.visible) {
        const progress = 1 - enemy.slamWindup / 1.35;
        view.telegraph.scale.set(0.72 + progress * 0.36);
        view.telegraph.alpha = 0.4 + progress * 0.55;
      }
    }

    for (const [id, view] of this.enemyViews) {
      if (seen.has(id)) continue;
      this.enemyLayer.removeChild(view.root);
      this.healthLayer.removeChild(view.healthBar);
      view.root.destroy({ children: true });
      view.healthBar.destroy({ children: true });
      this.enemyViews.delete(id);
    }
  }

  private syncProjectiles(session: GameSession, alpha: number): void {
    const seen = new Set<number>();
    this.projectileTrail.clear();
    for (const projectile of session.projectiles) {
      seen.add(projectile.id);
      let view = this.projectileViews.get(projectile.id);
      if (!view) {
        view = createProjectileView(projectile);
        this.projectileViews.set(projectile.id, view);
        this.projectileLayer.addChild(view.root);
      }
      view.root.tint = this.currentCosmetic.projectile;
      const x = lerp(projectile.prevX, projectile.x, alpha);
      const y = lerp(projectile.prevY, projectile.y, alpha);
      view.root.position.set(x, y);
      view.root.rotation = projectile.angle;
      const color = projectile.crit
        ? this.currentCosmetic.accent
        : this.currentCosmetic.projectile;
      this.projectileTrail
        .moveTo(x - Math.cos(projectile.angle) * 12, y - Math.sin(projectile.angle) * 12)
        .lineTo(x - Math.cos(projectile.angle) * 44, y - Math.sin(projectile.angle) * 44)
        .stroke({ width: projectile.crit ? 4 : 2.5, color, alpha: 0.16 });
    }
    for (const [id, view] of this.projectileViews) {
      if (seen.has(id)) continue;
      this.projectileLayer.removeChild(view.root);
      view.root.destroy({ children: true });
      this.projectileViews.delete(id);
    }
  }

  private syncOrbitals(session: GameSession, alpha: number, _dt: number): void {
    const seen = new Set<number>();
    this.orbitalTrail.clear();
    const orbitRadius = session.orbitals[0]?.radius;
    if (orbitRadius) {
      this.orbitalTrail
        .circle(0, 0, orbitRadius)
        .stroke({ width: 1.5, color: this.currentCosmetic.orbit, alpha: 0.24 });
      this.orbitalTrail
        .circle(0, 0, orbitRadius)
        .stroke({ width: 5, color: this.currentCosmetic.orbit, alpha: 0.035 });
    }
    session.orbitals.forEach((orbital, index) => {
      seen.add(orbital.id);
      let view = this.orbitalViews.get(orbital.id);
      if (!view) {
        view = createOrbitalView(index);
        this.orbitalViews.set(orbital.id, view);
        this.orbitalLayer.addChild(view.root);
      }
      view.root.tint = this.currentCosmetic.orbit;
      const x = lerp(orbital.prevX, orbital.x, alpha);
      const y = lerp(orbital.prevY, orbital.y, alpha);
      view.root.position.set(x, y);
      view.root.rotation = this.time * 2.2 + orbital.angle;
      const scale = 1 + Math.sin(this.time * 5 + index) * 0.07;
      view.root.scale.set(scale);
      const color = this.currentCosmetic.orbit;
      this.orbitalTrail
        .arc(0, 0, orbital.radius, orbital.angle - 0.72, orbital.angle)
        .stroke({ width: 7, color, alpha: 0.24 });
    });
    for (const [id, view] of this.orbitalViews) {
      if (seen.has(id)) continue;
      this.orbitalLayer.removeChild(view.root);
      view.root.destroy({ children: true });
      this.orbitalViews.delete(id);
    }
  }

  private processEvents(events: VisualEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'shot':
          this.effects.spawnMuzzle(event.x, event.y, event.angle, event.crit);
          break;
        case 'hit':
          this.effects.spawnHit(event.x, event.y, event.kind, event.crit, event.damageType);
          if (event.crit) this.effects.spawnCriticalDamage(event.x, event.y, event.damage);
          break;
        case 'enemyDeath':
          this.effects.spawnDeath(event.x, event.y, event.kind, event.reward);
          if (
            event.kind === 'crusher' ||
            event.kind === 'summoner' ||
            event.kind === 'artillery'
          ) {
            this.addShake(10);
          }
          break;
        case 'towerHit':
          this.effects.spawnTowerHit(event.x, event.y);
          this.flashAmount = Math.max(this.flashAmount, 0.075);
          this.addShake(4.5);
          break;
        case 'orbHit':
          this.effects.spawnOrbHit(event.x, event.y, event.crit);
          break;
        case 'waveStart':
          this.effects.spawnWavePulse(event.wave % 5 === 0 ? COLORS.pink : COLORS.cyan);
          this.addShake(4);
          break;
        case 'waveClear':
          this.effects.spawnWavePulse(COLORS.gold);
          this.addShake(5);
          break;
        case 'bossSpawn':
          this.effects.spawnBossWarning(event.x, event.y);
          this.flashAmount = Math.max(this.flashAmount, 0.15);
          this.addShake(9);
          break;
        case 'nova':
          this.effects.spawnNova(event.x, event.y, event.radius);
          this.flashAmount = Math.max(this.flashAmount, 0.12);
          this.addShake(12);
          break;
        case 'chain':
          this.effects.spawnChain(event.fromX, event.fromY, event.toX, event.toY);
          break;
        case 'bossSlam':
          this.effects.spawnBossSlam(event.x, event.y);
          this.flashAmount = Math.max(this.flashAmount, 0.16);
          this.addShake(13);
          break;
        case 'bossPhase':
          this.effects.spawnBossPhase(event.x, event.y);
          this.flashAmount = Math.max(this.flashAmount, 0.16);
          this.addShake(8);
          break;
        case 'weakPoint':
          this.effects.spawnWeakPoint(event.x, event.y);
          break;
        case 'summon':
          this.effects.spawnSummon(event.x, event.y);
          break;
        case 'artillery':
          this.effects.spawnArtillery(event.fromX, event.fromY, event.toX, event.toY);
          this.flashAmount = Math.max(this.flashAmount, 0.18);
          this.addShake(8);
          break;
        case 'aegis':
          this.effects.spawnAegis(event.x, event.y);
          this.flashAmount = Math.max(this.flashAmount, 0.12);
          this.addShake(4);
          break;
        case 'overdrive':
          this.effects.spawnOverdrive(event.x, event.y);
          this.addShake(5);
          break;
        case 'corePulse':
          this.effects.spawnCorePulse();
          break;
        default:
          break;
      }
    }
  }

  private addShake(amount: number): void {
    if (this.reducedMotion) return;
    const settings = useSettingsStore.getState();
    this.shakeAmount = Math.max(
      this.shakeAmount,
      amount * settings.screenShake * (settings.reducedEffects ? 0.4 : 1),
    );
  }

  private updateRangeIndicator(session: GameSession): void {
    const settings = useSettingsStore.getState();
    if (!settings.showRange) {
      this.rangeIndicator.visible = false;
      this.lastRange = -1;
      return;
    }
    this.rangeIndicator.visible = true;
    const range = session.tower.stats.range;
    if (Math.abs(range - this.lastRange) < 0.5) return;
    this.lastRange = range;
    this.rangeIndicator.clear();
    this.rangeIndicator
      .circle(0, 0, range)
      .stroke({ width: 2, color: this.currentCosmetic.core, alpha: 0.3 });
    for (let i = 0; i < 18; i += 1) {
      const start = (i / 18) * Math.PI * 2;
      this.rangeIndicator
        .arc(0, 0, range, start, start + 0.16)
        .stroke({ width: 4, color: this.currentCosmetic.core, alpha: 0.15 });
    }
  }

  private updateThreatArrows(session: GameSession): void {
    for (const arrow of this.threatArrows) arrow.visible = false;
    const settings = useSettingsStore.getState();
    if (settings.reducedEffects) return;
    const margin = 20;
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const offscreen = session.enemies
      .filter((enemy) => !enemy.dead)
      .map((enemy) => {
        const sx = this.worldCenterX + enemy.x * this.worldScale;
        const sy = this.worldCenterY + enemy.y * this.worldScale;
        return { enemy, sx, sy };
      })
      .filter(
        ({ sx, sy }) =>
          sx < margin || sx > width - margin || sy < margin || sy > height - margin,
      )
      .sort((a, b) => Number(b.enemy.boss) - Number(a.enemy.boss));
    offscreen.slice(0, this.threatArrows.length).forEach(({ enemy, sx, sy }, index) => {
      const anchorX = clamp(sx, margin, width - margin);
      const anchorY = clamp(sy, margin, height - margin);
      const arrow = this.threatArrows[index];
      arrow.visible = true;
      arrow.position.set(anchorX, anchorY);
      arrow.rotation = Math.atan2(sy - anchorY, sx - anchorX);
      arrow.alpha = enemy.boss ? 1 : 0.66;
      arrow.scale.set(enemy.boss ? 1.15 : 0.9);
    });
  }
}
