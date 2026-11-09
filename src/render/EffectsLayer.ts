import { Container, Graphics, Text } from 'pixi.js';
import { COLORS, ENEMY_PALETTES, FONT_DISPLAY } from './palette';
import { formatCompact } from '../utils/format';
import type { DamageType, EnemyKind } from '../core/types';

interface Particle {
  view: Graphics;
  vx: number;
  vy: number;
  drag: number;
  life: number;
  maxLife: number;
  startScale: number;
}

interface Shockwave {
  view: Graphics;
  life: number;
  maxLife: number;
  targetRadius: number;
  startRadius: number;
}

interface FloatingText {
  view: Text;
  vy: number;
  life: number;
  maxLife: number;
}

interface ArcBolt {
  view: Graphics;
  life: number;
  maxLife: number;
}

/**
 * World-space effects. Simulation events feed this layer; it never writes back
 * to game state.
 */
export class EffectsLayer {
  readonly container = new Container();
  private readonly particles: Particle[] = [];
  private readonly shockwaves: Shockwave[] = [];
  private readonly texts: FloatingText[] = [];
  private readonly arcs: ArcBolt[] = [];
  private readonly particlePool: Graphics[] = [];

  constructor() {
    this.container.label = 'effects';
  }

  spawnMuzzle(x: number, y: number, angle: number, crit: boolean): void {
    const color = crit ? COLORS.pinkSoft : COLORS.cyan;
    for (let i = 0; i < 4; i += 1) {
      const spread = angle + (Math.random() - 0.5) * 0.7;
      this.addParticle(
        x,
        y,
        Math.cos(spread) * (42 + Math.random() * 70),
        Math.sin(spread) * (42 + Math.random() * 70),
        color,
        4,
        0.18 + Math.random() * 0.14,
        0.7,
      );
    }
    this.spawnShockwave(x, y, color, crit ? 22 : 14, 0.18);
  }

  spawnHit(
    x: number,
    y: number,
    kind: EnemyKind,
    crit: boolean,
    damageType?: DamageType,
  ): void {
    const palette = ENEMY_PALETTES[kind];
    const typeColor =
      damageType === 'thermal'
        ? COLORS.gold
        : damageType === 'arc'
          ? COLORS.violet
          : damageType === 'kinetic'
            ? COLORS.cyan
            : palette.primary;
    const color = crit ? COLORS.white : typeColor;
    const count = crit ? 10 : 6;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * (crit ? 160 : 95);
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        crit ? 5.5 : 3.5,
        0.2 + Math.random() * 0.24,
        0.9,
      );
    }
    if (crit) this.spawnShockwave(x, y, COLORS.pink, 34, 0.26);
  }

  spawnOrbHit(x: number, y: number, crit: boolean): void {
    const color = crit ? COLORS.pink : COLORS.violet;
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 26 + Math.random() * 80;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        3.5,
        0.18 + Math.random() * 0.2,
        0.8,
      );
    }
  }

  spawnDeath(x: number, y: number, kind: EnemyKind, reward: number): void {
    const palette = ENEMY_PALETTES[kind];
    const count = kind === 'crusher' ? 22 : 11;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * (kind === 'crusher' ? 230 : 130);
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        i % 3 === 0 ? COLORS.white : palette.primary,
        kind === 'crusher' ? 7 : 4.5,
        0.35 + Math.random() * 0.4,
        1.1,
      );
    }
    this.spawnShockwave(x, y, palette.primary, kind === 'crusher' ? 120 : 50, kind === 'crusher' ? 0.6 : 0.34);
    this.addText(x, y - 8, `+$${formatCompact(reward)}`, COLORS.gold, 22, 0.9);
  }

  spawnTowerHit(x: number, y: number): void {
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.atan2(-y, -x) + (Math.random() - 0.5) * 1.4;
      const speed = 30 + Math.random() * 110;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        COLORS.pink,
        4.5,
        0.3 + Math.random() * 0.25,
        1,
      );
    }
    this.spawnShockwave(x, y, COLORS.pink, 50, 0.4);
  }

  spawnWavePulse(color: number): void {
    this.spawnShockwave(0, 0, color, 380, 1.2, 20);
    this.spawnShockwave(0, 0, color, 230, 0.95, 10);
  }

  spawnCorePulse(): void {
    this.spawnShockwave(0, 0, COLORS.cyan, 160, 0.6, 24);
  }

  spawnBossWarning(x: number, y: number): void {
    this.spawnShockwave(x, y, COLORS.pink, 170, 0.85, 20);
    for (let i = 0; i < 14; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 140;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        COLORS.pink,
        5,
        0.4 + Math.random() * 0.4,
        1,
      );
    }
  }

  spawnNova(x: number, y: number, radius: number): void {
    const colors = [COLORS.violet, COLORS.cyan, COLORS.white];
    for (let i = 0; i < 34; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 330;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        colors[i % colors.length],
        i % 4 === 0 ? 7 : 4,
        0.55 + Math.random() * 0.55,
        1.2,
      );
    }
    this.spawnShockwave(x, y, COLORS.violet, radius, 1.05, 8);
    this.spawnShockwave(x, y, COLORS.cyan, radius * 0.72, 0.8, 6);
    this.spawnShockwave(x, y, COLORS.pink, radius * 0.42, 0.55, 4);
    this.addText(x, y - 72, 'NOVA', COLORS.cyan, 34, 0.9);
  }

  spawnAegis(x: number, y: number): void {
    for (let i = 0; i < 22; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        i % 2 === 0 ? COLORS.cyan : COLORS.green,
        4,
        0.4 + Math.random() * 0.4,
        0.9,
      );
    }
    this.spawnShockwave(x, y, COLORS.cyan, 150, 0.75, 10);
    this.spawnShockwave(x, y, COLORS.green, 90, 0.55, 6);
    this.addText(x, y - 74, 'AEGIS', COLORS.cyan, 28, 0.9);
  }

  spawnOverdrive(x: number, y: number): void {
    for (let i = 0; i < 20; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 170;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        i % 3 === 0 ? COLORS.pink : COLORS.gold,
        4,
        0.35 + Math.random() * 0.4,
        1.2,
      );
    }
    this.spawnShockwave(x, y, COLORS.gold, 130, 0.6, 8);
    this.addText(x, y - 74, 'OVERDRIVE', COLORS.gold, 26, 0.9);
  }

  spawnSummon(x: number, y: number): void {
    this.spawnShockwave(x, y, COLORS.violet, 90, 0.6, 5);
    for (let i = 0; i < 12; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        COLORS.violet,
        3.5,
        0.35 + Math.random() * 0.3,
        0.8,
      );
    }
  }

  spawnArtillery(fromX: number, fromY: number, toX: number, toY: number): void {
    const view = new Graphics();
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    const nx = length > 0 ? -dy / length : 0;
    const ny = length > 0 ? dx / length : 0;
    const points: number[] = [fromX, fromY];
    for (let i = 1; i < 6; i += 1) {
      const t = i / 6;
      const offset = (Math.random() * 2 - 1) * 12;
      points.push(fromX + dx * t + nx * offset, fromY + dy * t + ny * offset);
    }
    points.push(toX, toY);
    view.poly(points).stroke({ width: 12, color: COLORS.gold, alpha: 0.12 });
    view.poly(points).stroke({ width: 3, color: COLORS.pinkSoft, alpha: 0.9 });
    this.container.addChild(view);
    this.arcs.push({ view, life: 0.32, maxLife: 0.32 });
    this.spawnShockwave(toX, toY, COLORS.gold, 130, 0.6, 4);
    this.spawnShockwave(toX, toY, COLORS.pink, 80, 0.45, 3);
  }

  spawnChain(fromX: number, fromY: number, toX: number, toY: number): void {
    const view = new Graphics();
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    const nx = -dy / length;
    const ny = dx / length;
    const points: number[] = [fromX, fromY];
    for (let i = 1; i < 5; i += 1) {
      const t = i / 5;
      const offset = (Math.random() * 2 - 1) * 9;
      points.push(fromX + dx * t + nx * offset, fromY + dy * t + ny * offset);
    }
    points.push(toX, toY);

    view
      .poly(points)
      .stroke({ width: 8, color: COLORS.violet, alpha: 0.16 });
    view
      .poly(points)
      .stroke({ width: 2.4, color: COLORS.cyanSoft, alpha: 0.95 });
    this.container.addChild(view);
    this.arcs.push({ view, life: 0.26, maxLife: 0.26 });
  }

  spawnBossSlam(x: number, y: number): void {
    for (let i = 0; i < 26; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 230;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        i % 4 === 0 ? COLORS.gold : COLORS.pink,
        i % 3 === 0 ? 6 : 4,
        0.4 + Math.random() * 0.4,
        1.2,
      );
    }
    this.spawnShockwave(x, y, COLORS.pink, 190, 0.75, 8);
    this.spawnShockwave(x, y, COLORS.gold, 110, 0.55, 6);
  }

  spawnBossPhase(x: number, y: number): void {
    this.spawnShockwave(x, y, COLORS.pink, 150, 0.8, 8);
    for (let i = 0; i < 18; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.addParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        COLORS.pink,
        4.5,
        0.35 + Math.random() * 0.35,
        1,
      );
    }
  }

  spawnWeakPoint(x: number, y: number): void {
    this.spawnShockwave(x, y, COLORS.gold, 44, 0.45, 4);
  }

  spawnCriticalDamage(x: number, y: number, damage: number): void {
    this.addText(x + 8, y - 24, `${formatCompact(damage)}`, COLORS.pinkSoft, 20, 0.6);
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.removeParticle(i);
        continue;
      }
      const damping = Math.max(0, 1 - particle.drag * dt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.view.x += particle.vx * dt;
      particle.view.y += particle.vy * dt;
      const progress = 1 - particle.life / particle.maxLife;
      particle.view.alpha = 1 - progress;
      particle.view.scale.set(particle.startScale * (1 + progress * 1.4));
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) {
      const wave = this.shockwaves[i];
      wave.life -= dt;
      if (wave.life <= 0) {
        this.removeShockwave(i);
        continue;
      }
      const progress = 1 - wave.life / wave.maxLife;
      const startScale = wave.startRadius / wave.targetRadius;
      wave.view.scale.set(startScale + (1 - startScale) * progress);
      wave.view.alpha = (1 - progress) * 0.9;
    }

    for (let i = this.arcs.length - 1; i >= 0; i -= 1) {
      const arc = this.arcs[i];
      arc.life -= dt;
      if (arc.life <= 0) {
        this.container.removeChild(arc.view);
        arc.view.destroy();
        this.arcs.splice(i, 1);
        continue;
      }
      arc.view.alpha = arc.life / arc.maxLife;
    }

    for (let i = this.texts.length - 1; i >= 0; i -= 1) {
      const text = this.texts[i];
      text.life -= dt;
      if (text.life <= 0) {
        this.container.removeChild(text.view);
        text.view.destroy({ style: true });
        this.texts.splice(i, 1);
        continue;
      }
      const progress = 1 - text.life / text.maxLife;
      text.view.y += text.vy * dt;
      text.view.alpha = 1 - progress * progress;
      text.view.scale.set(1 + (1 - Math.min(1, progress * 4)) * 0.3);
    }
  }

  clear(): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) this.removeParticle(i);
    for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) this.removeShockwave(i);
    for (const arc of this.arcs) {
      this.container.removeChild(arc.view);
      arc.view.destroy();
    }
    this.arcs.length = 0;
    for (const text of this.texts) {
      this.container.removeChild(text.view);
      text.view.destroy({ style: true });
    }
    this.texts.length = 0;
  }

  destroy(): void {
    this.clear();
    for (const view of this.particlePool) view.destroy();
    this.particlePool.length = 0;
    this.container.destroy({ children: true });
  }

  private addParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: number,
    size: number,
    life: number,
    drag: number,
  ): void {
    const view = this.particlePool.pop() ?? new Graphics();
    view.clear();
    view.circle(0, 0, size).fill({ color, alpha: 0.95 });
    view.circle(0, 0, size * 1.8).fill({ color, alpha: 0.12 });
    view.position.set(x, y);
    view.visible = true;
    view.alpha = 1;
    view.scale.set(1);
    this.container.addChild(view);
    this.particles.push({
      view,
      vx,
      vy,
      drag,
      life,
      maxLife: life,
      startScale: 1,
    });
  }

  private addText(x: number, y: number, value: string, color: number, size: number, life: number): void {
    const view = new Text({
      text: value,
      style: {
        fontFamily: FONT_DISPLAY,
        fontSize: size,
        fill: color,
        stroke: { color: COLORS.ink, width: 5 },
        letterSpacing: 0.5,
      },
    });
    view.anchor.set(0.5);
    view.position.set(x, y);
    this.container.addChild(view);
    this.texts.push({ view, vy: -34, life, maxLife: life });
  }

  private spawnShockwave(
    x: number,
    y: number,
    color: number,
    targetRadius: number,
    life: number,
    startRadius = 2,
  ): void {
    const view = new Graphics();
    view.circle(0, 0, targetRadius).stroke({ width: 2.5, color, alpha: 1 });
    view.circle(0, 0, targetRadius * 0.72).stroke({ width: 1.2, color, alpha: 0.65 });
    view.position.set(x, y);
    view.scale.set(startRadius / targetRadius);
    this.container.addChild(view);
    this.shockwaves.push({
      view,
      life,
      maxLife: life,
      targetRadius,
      startRadius,
    });
  }

  private removeParticle(index: number): void {
    const particle = this.particles[index];
    this.container.removeChild(particle.view);
    particle.view.visible = false;
    if (this.particlePool.length < 220) {
      this.particlePool.push(particle.view);
    } else {
      particle.view.destroy();
    }
    this.particles.splice(index, 1);
  }

  private removeShockwave(index: number): void {
    const wave = this.shockwaves[index];
    this.container.removeChild(wave.view);
    wave.view.destroy();
    this.shockwaves.splice(index, 1);
  }
}
