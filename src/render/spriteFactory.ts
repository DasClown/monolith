import { Container, Graphics } from 'pixi.js';
import type { Enemy } from '../entities/Enemy';
import type { Projectile } from '../entities/Projectile';
import { COLORS, ENEMY_PALETTES, ORB_COLORS } from './palette';

const TAU = Math.PI * 2;

const hex = (radius: number, rotation = 0): number[] => {
  const points: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = rotation + (i / 6) * TAU;
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return points;
};

export interface TowerView {
  container: Container;
  aimPivot: Container;
  barrel: Container;
  core: Container;
  coreGlow: Graphics;
  outerRing: Container;
  innerRing: Container;
  shield: Graphics;
  frameRings: Graphics[];
  damageOverlay: Graphics;
}

export function createTowerView(): TowerView {
  const container = new Container();
  container.label = 'monolith';

  const aura = new Graphics();
  aura.circle(0, 0, 104).fill({ color: COLORS.cyan, alpha: 0.025 });
  aura.circle(0, 0, 76).stroke({ width: 2, color: COLORS.cyan, alpha: 0.16 });
  aura.circle(0, 0, 64).stroke({ width: 1, color: COLORS.pink, alpha: 0.13 });
  container.addChild(aura);

  const shadow = new Graphics();
  shadow.ellipse(0, 27, 62, 26).fill({ color: COLORS.ink, alpha: 0.68 });
  container.addChild(shadow);

  const beacon = new Graphics();
  beacon.poly([-17, 48, 17, 48, 8, -112, -8, -112]).fill({ color: COLORS.cyan, alpha: 0.05 });
  beacon.circle(0, -36, 48).fill({ color: COLORS.cyan, alpha: 0.04 });
  beacon.circle(0, -36, 26).stroke({ width: 1.5, color: COLORS.cyan, alpha: 0.18 });
  container.addChild(beacon);

  const outerRing = new Container();
  const outerRingGraphics = new Graphics();
  for (let i = 0; i < 6; i += 1) {
    const start = i * (TAU / 6) + 0.18;
    outerRingGraphics.arc(0, 0, 70, start, start + 0.54).stroke({
      width: 3,
      color: i % 2 === 0 ? COLORS.cyan : COLORS.pink,
      alpha: 0.46,
    });
  }
  outerRingGraphics.circle(0, -70, 4).fill(COLORS.pink);
  outerRingGraphics.circle(0, 70, 3).fill(COLORS.cyan);
  outerRing.addChild(outerRingGraphics);
  container.addChild(outerRing);

  const base = new Graphics();
  base
    .poly(hex(58, Math.PI / 6))
    .fill(0x15192a)
    .stroke({ width: 6, color: COLORS.ink, alignment: 1 });
  base
    .poly(hex(49, Math.PI / 6))
    .fill(0x242b43)
    .stroke({ width: 2, color: COLORS.panelEdge, alignment: 0.5 });
  base
    .poly(hex(41, Math.PI / 6))
    .fill({ color: COLORS.cyan, alpha: 0.09 })
    .stroke({ width: 2, color: COLORS.cyan, alpha: 0.5 });
  base
    .poly(hex(34, Math.PI / 6))
    .stroke({ width: 1, color: COLORS.pink, alpha: 0.34 });

  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * TAU;
    const x = Math.cos(angle) * 50;
    const y = Math.sin(angle) * 50;
    base.circle(x, y, 4.5).fill(0x2b3049).stroke({ width: 2, color: COLORS.ink });
    if (i % 2 === 0) base.circle(x, y, 1.8).fill(COLORS.cyan);
  }

  // Two brake fins on the base.
  base
    .moveTo(-48, 6)
    .lineTo(-78, 17)
    .lineTo(-53, 24)
    .closePath()
    .fill(0x201523)
    .stroke({ width: 3, color: COLORS.pink, alpha: 0.85 });
  base
    .moveTo(48, 6)
    .lineTo(78, 17)
    .lineTo(53, 24)
    .closePath()
    .fill(0x201523)
    .stroke({ width: 3, color: COLORS.pink, alpha: 0.85 });
  container.addChild(base);

  const shard = new Graphics();
  // Tall central monolith, drawn with a chunky cartoon bevel.
  shard
    .poly([0, -102, -26, -26, -18, 24, 0, 40, 18, 24, 26, -26])
    .fill(0x1b2136)
    .stroke({ width: 5, color: COLORS.ink, alignment: 1 });
  shard
    .poly([0, -102, -26, -26, -18, 24, 0, 40])
    .fill(0x10131f)
    .stroke({ width: 2, color: COLORS.panelEdge, alpha: 0.85 });
  shard.poly([0, -102, 0, 40, 18, 24, 26, -26]).fill(0x2b3453);
  shard
    .poly([0, -102, -26, -26, -18, 24, 0, 40, 18, 24, 26, -26])
    .stroke({ width: 2.2, color: COLORS.cyan, alpha: 0.58 });
  shard
    .poly([0, -98, 7, -42, 3, 29, 0, 36, -3, 29, -7, -42])
    .fill({ color: COLORS.cyan, alpha: 0.34 });
  shard
    .poly([0, -88, 3, -42, 1, 24, 0, 29, -1, 24, -3, -42])
    .fill({ color: COLORS.cyanSoft, alpha: 0.72 });
  shard
    .moveTo(-18, -54)
    .lineTo(17, -62)
    .stroke({ width: 2, color: COLORS.cyan, alpha: 0.26 });
  shard
    .moveTo(-19, -24)
    .lineTo(18, -32)
    .stroke({ width: 2, color: COLORS.pink, alpha: 0.22 });
  shard
    .moveTo(-9, 20)
    .lineTo(8, 15)
    .stroke({ width: 2, color: COLORS.cyan, alpha: 0.28 });
  shard
    .poly([-23, -30, -40, -20, -26, -11])
    .fill(0x2b1321)
    .stroke({ width: 3, color: COLORS.pink, alpha: 0.8 });
  shard
    .poly([23, -30, 40, -20, 26, -11])
    .fill(0x2b1321)
    .stroke({ width: 3, color: COLORS.pink, alpha: 0.8 });
  container.addChild(shard);

  const coreGlow = new Graphics();
  coreGlow.circle(0, -34, 31).fill({ color: COLORS.cyan, alpha: 0.06 });
  coreGlow.circle(0, -34, 20).fill({ color: COLORS.cyan, alpha: 0.14 });
  coreGlow.circle(0, -34, 12).fill({ color: COLORS.cyan, alpha: 0.42 });
  coreGlow.circle(0, -34, 8).fill(COLORS.cyan);
  coreGlow.circle(0, -34, 3.4).fill(COLORS.white);
  coreGlow
    .poly([0, -74, 13, -34, 0, 6, -13, -34])
    .stroke({ width: 1.8, color: COLORS.cyan, alpha: 0.44 });
  container.addChild(coreGlow);

  const core = new Container();
  const coreRing = new Graphics();
  coreRing
    .arc(0, 0, 18, 0.1, 1.3)
    .stroke({ width: 3, color: COLORS.cyan, alpha: 0.7 });
  coreRing
    .arc(0, 0, 18, Math.PI + 0.1, Math.PI + 1.3)
    .stroke({ width: 3, color: COLORS.pink, alpha: 0.6 });
  coreRing.circle(0, 0, 5).fill(COLORS.white);
  core.position.set(0, -34);
  core.addChild(coreRing);
  container.addChild(core);

  const aimPivot = new Container();
  const barrel = new Container();
  const barrelGraphics = new Graphics();
  barrelGraphics
    .roundRect(12, -7, 56, 14, 7)
    .fill(0x22273c)
    .stroke({ width: 4, color: COLORS.ink, alignment: 1 });
  barrelGraphics
    .roundRect(18, -4, 34, 8, 4)
    .fill({ color: COLORS.cyan, alpha: 0.34 });
  barrelGraphics
    .roundRect(57, -6, 12, 12, 3)
    .fill(COLORS.pink)
    .stroke({ width: 3, color: COLORS.ink });
  barrelGraphics.circle(63, 0, 2).fill(COLORS.white);
  barrelGraphics
    .moveTo(27, -10)
    .lineTo(50, -10)
    .stroke({ width: 2, color: COLORS.cyanSoft, alpha: 0.35 });
  barrel.addChild(barrelGraphics);
  aimPivot.addChild(barrel);
  container.addChild(aimPivot);

  const shield = new Graphics();
  for (let i = 0; i < 6; i += 1) {
    const start = i * (TAU / 6) + 0.16;
    shield.arc(0, 0, 88, start, start + 0.56).stroke({
      width: 3,
      color: i % 2 === 0 ? COLORS.cyan : COLORS.green,
      alpha: 0.8,
    });
  }
  shield
    .circle(0, 0, 88)
    .stroke({ width: 1, color: COLORS.cyan, alpha: 0.28 });
  shield.alpha = 0;
  container.addChild(shield);

  const frameColors = [COLORS.cyan, COLORS.violet, COLORS.gold, COLORS.pink];
  const frameRings: Graphics[] = [];
  for (let tier = 0; tier < 4; tier += 1) {
    const ring = new Graphics();
    const radius = 100 + tier * 5;
    for (let i = 0; i < 8; i += 1) {
      const start = i * (TAU / 8) + 0.1 + tier * 0.04;
      ring.arc(0, 0, radius, start, start + 0.34).stroke({
        width: 2.5 + tier * 0.35,
        color: frameColors[tier],
        alpha: 0.72,
      });
    }
    ring.circle(0, 0, radius + 4).stroke({
      width: 1,
      color: frameColors[tier],
      alpha: 0.2,
    });
    ring.visible = false;
    container.addChild(ring);
    frameRings.push(ring);
  }

  const damageOverlay = new Graphics();
  damageOverlay
    .circle(0, 0, 84)
    .fill({ color: COLORS.pink, alpha: 0.12 })
    .stroke({ width: 5, color: COLORS.pink, alpha: 0.7 });
  damageOverlay.alpha = 0;
  container.addChild(damageOverlay);

  container.scale.set(1.18);

  return {
    container,
    aimPivot,
    barrel,
    core,
    coreGlow,
    outerRing,
    innerRing: core,
    shield,
    frameRings,
    damageOverlay,
  };
}

export interface EnemyView {
  root: Container;
  body: Container;
  overlay: Graphics;
  healthBar: Container;
  healthFill: Graphics;
  healthHit: Graphics;
  healthWidth: number;
  burnAura: Graphics;
  slowAura: Graphics;
  shieldAura: Graphics;
  mutatorAura: Graphics;
  telegraph: Graphics;
  weakPoint: Graphics;
  phaseAura: Graphics;
}

export function createEnemyView(enemy: Enemy): EnemyView {
  const palette = ENEMY_PALETTES[enemy.kind];
  const r = enemy.radius;
  const root = new Container();
  const body = new Container();

  const shadow = new Graphics();
  shadow.ellipse(1, 5, r * 1.05, r * 0.6).fill({ color: COLORS.ink, alpha: 0.5 });
  body.addChild(shadow);

  const mutatorAura = new Graphics();
  if (enemy.mutators.length > 0) {
    const color = mutatorColor(enemy.mutators[0]);
    for (let i = 0; i < 5; i += 1) {
      const start = i * (TAU / 5) + 0.2;
      mutatorAura.arc(0, 0, r + 12, start, start + 0.62).stroke({
        width: 2.5,
        color,
        alpha: 0.58,
      });
    }
  }
  root.addChild(mutatorAura);

  const telegraph = new Graphics();
  telegraph
    .circle(0, 0, r + 42)
    .fill({ color: COLORS.pink, alpha: 0.08 })
    .stroke({ width: 3, color: COLORS.pink, alpha: 0.8 });
  for (let i = 0; i < 8; i += 1) {
    const start = i * (TAU / 8) + 0.12;
    telegraph.arc(0, 0, r + 42, start, start + 0.3).stroke({
      width: 5,
      color: COLORS.gold,
      alpha: 0.5,
    });
  }
  telegraph.visible = false;
  root.addChild(telegraph);

  const burnAura = new Graphics();
  for (let i = 0; i < 5; i += 1) {
    const start = i * (TAU / 5) + 0.15;
    burnAura.arc(0, 0, r + 8, start, start + 0.5).stroke({
      width: 4,
      color: i % 2 === 0 ? COLORS.gold : COLORS.pink,
      alpha: 0.78,
    });
  }
  burnAura.circle(0, 0, r + 15).fill({ color: COLORS.pink, alpha: 0.07 });
  burnAura.visible = false;
  root.addChild(burnAura);

  const slowAura = new Graphics();
  for (let i = 0; i < 6; i += 1) {
    const start = i * (TAU / 6) + 0.1;
    slowAura.arc(0, 0, r + 13, start, start + 0.42).stroke({
      width: 2,
      color: COLORS.cyan,
      alpha: 0.75,
    });
  }
  slowAura.circle(0, 0, r + 10).stroke({ width: 1, color: COLORS.cyan, alpha: 0.38 });
  slowAura.visible = false;
  root.addChild(slowAura);

  const shieldAura = new Graphics();
  shieldAura
    .circle(0, 0, r + 6)
    .fill({ color: COLORS.violet, alpha: 0.05 })
    .stroke({ width: 3, color: COLORS.violet, alpha: 0.72 });
  for (let i = 0; i < 4; i += 1) {
    const start = i * (TAU / 4) + 0.35;
    shieldAura.arc(0, 0, r + 10, start, start + 0.55).stroke({
      width: 2,
      color: COLORS.cyanSoft,
      alpha: 0.6,
    });
  }
  shieldAura.visible = false;
  root.addChild(shieldAura);

  const phaseAura = new Graphics();
  for (let i = 0; i < 6; i += 1) {
    const start = i * (TAU / 6) + 0.1;
    phaseAura.arc(0, 0, r + 17, start, start + 0.46).stroke({
      width: 3,
      color: i % 2 === 0 ? COLORS.pink : COLORS.gold,
      alpha: 0.65,
    });
  }
  phaseAura.visible = false;
  root.addChild(phaseAura);

  const art = new Graphics();

  if (enemy.kind === 'skitter') {
    for (let i = -1; i <= 1; i += 1) {
      art
        .moveTo(-r * 0.4, i * r * 0.42)
        .lineTo(-r * 1.12, i * r * 0.7 - 5)
        .stroke({ width: 3, color: COLORS.ink, alpha: 0.95 });
      art
        .moveTo(-r * 0.4, i * r * 0.42)
        .lineTo(-r * 1.02, i * r * 0.62 - 5)
        .stroke({ width: 1.5, color: palette.primary, alpha: 0.7 });
      art
        .moveTo(r * 0.3, i * r * 0.48)
        .lineTo(r * 0.98, i * r * 0.72)
        .stroke({ width: 2.5, color: COLORS.ink, alpha: 0.95 });
    }
    art
      .poly([r, 0, r * 0.35, -r * 0.82, -r * 0.82, -r * 0.5, -r * 0.55, 0, -r * 0.82, r * 0.5, r * 0.35, r * 0.82])
      .fill(palette.body)
      .stroke({ width: 3, color: palette.primary, alignment: 0.5 });
    art
      .poly([r * 0.55, 0, r * 0.1, -r * 0.45, -r * 0.38, 0, r * 0.1, r * 0.45])
      .fill({ color: palette.primary, alpha: 0.55 });
    art.circle(r * 0.28, -r * 0.3, 2.6).fill(palette.eye);
    art.circle(r * 0.28, r * 0.3, 2.6).fill(palette.eye);
    art
      .moveTo(r * 0.65, -r * 0.08)
      .lineTo(r * 0.95, 0)
      .lineTo(r * 0.65, r * 0.08)
      .stroke({ width: 2, color: palette.secondary, alpha: 0.85 });
  } else if (enemy.kind === 'wisp') {
    art
      .moveTo(-r * 0.7, 0)
      .lineTo(-r * 1.8, -r * 0.4)
      .stroke({ width: 2, color: palette.glow, alpha: 0.25 });
    art
      .moveTo(-r * 0.7, 0)
      .lineTo(-r * 1.8, r * 0.4)
      .stroke({ width: 2, color: palette.glow, alpha: 0.25 });
    art
      .poly([r * 1.15, 0, -r * 0.75, -r * 0.78, -r * 0.32, 0, -r * 0.75, r * 0.78])
      .fill(palette.primary)
      .stroke({ width: 3, color: COLORS.ink, alignment: 1 });
    art.poly([r * 0.58, 0, -r * 0.25, -r * 0.36, -r * 0.06, 0, -r * 0.25, r * 0.36]).fill(palette.secondary);
    art.circle(r * 0.22, 0, 2.5).fill(COLORS.white);
  } else if (enemy.kind === 'brute') {
    art.circle(-r * 0.7, -r * 0.55, r * 0.38).fill(palette.body).stroke({ width: 3, color: palette.primary });
    art.circle(-r * 0.7, r * 0.55, r * 0.38).fill(palette.body).stroke({ width: 3, color: palette.primary });
    art
      .poly([r, 0, r * 0.62, -r * 0.78, -r * 0.48, -r * 0.9, -r * 0.9, 0, -r * 0.48, r * 0.9, r * 0.62, r * 0.78])
      .fill(palette.body)
      .stroke({ width: 4, color: palette.primary, alignment: 0.5 });
    art
      .poly([r * 0.7, 0, r * 0.3, -r * 0.5, -r * 0.3, 0, r * 0.3, r * 0.5])
      .fill({ color: palette.primary, alpha: 0.42 })
      .stroke({ width: 2, color: palette.secondary, alpha: 0.4 });
    art.circle(0, 0, r * 0.3).fill(palette.primary);
    art.circle(r * 0.74, -r * 0.29, 2.8).fill(palette.eye);
    art.circle(r * 0.74, r * 0.29, 2.8).fill(palette.eye);
    art
      .moveTo(-r * 0.7, -r * 0.66)
      .lineTo(-r * 0.1, -r * 0.78)
      .stroke({ width: 2, color: palette.secondary, alpha: 0.42 });
  } else if (enemy.kind === 'warden') {
    art
      .circle(0, 0, r + 7)
      .stroke({ width: 3, color: palette.primary, alpha: 0.45 });
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU + 0.35;
      art
        .arc(0, 0, r + 7, angle, angle + 0.72)
        .stroke({ width: 4, color: palette.primary, alpha: 0.8 });
    }
    art
      .poly(hex(r, Math.PI / 6))
      .fill(palette.body)
      .stroke({ width: 4, color: palette.primary, alignment: 0.5 });
    art
      .poly(hex(r * 0.62, Math.PI / 6))
      .fill({ color: palette.primary, alpha: 0.16 })
      .stroke({ width: 1.5, color: palette.secondary, alpha: 0.55 });
    art.circle(0, 0, r * 0.28).fill(palette.eye);
    art.circle(0, 0, r * 0.12).fill(COLORS.white);
    art.circle(0, -r * 0.45, 2.2).fill(palette.secondary);
  } else if (enemy.kind === 'summoner') {
    art
      .circle(0, 0, r + 6)
      .stroke({ width: 3, color: palette.primary, alpha: 0.45 });
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * TAU + 0.2;
      art
        .arc(0, 0, r + 12, angle, angle + 0.5)
        .stroke({ width: 4, color: palette.primary, alpha: 0.8 });
      art
        .circle(Math.cos(angle) * (r + 12), Math.sin(angle) * (r + 12), 3.5)
        .fill(palette.eye);
    }
    art
      .poly(hex(r, Math.PI / 6))
      .fill(palette.body)
      .stroke({ width: 4, color: palette.primary, alignment: 0.5 });
    art
      .poly(hex(r * 0.68, Math.PI / 6))
      .fill({ color: palette.primary, alpha: 0.17 })
      .stroke({ width: 2, color: palette.secondary, alpha: 0.5 });
    art.circle(0, 0, r * 0.34).fill(palette.primary);
    art.circle(0, 0, r * 0.17).fill(COLORS.white);
    art.circle(r * 0.62, -r * 0.3, 3).fill(palette.eye);
    art.circle(r * 0.62, r * 0.3, 3).fill(palette.eye);
  } else if (enemy.kind === 'artillery') {
    art
      .poly([r * 0.95, 0, r * 0.5, -r * 0.8, -r * 0.7, -r * 0.9, -r * 0.95, 0, -r * 0.7, r * 0.9, r * 0.5, r * 0.8])
      .fill(palette.body)
      .stroke({ width: 5, color: palette.primary, alignment: 0.5 });
    art
      .roundRect(r * 0.35, -r * 0.22, r * 1.05, r * 0.44, r * 0.16)
      .fill(0x2b1a0b)
      .stroke({ width: 3, color: palette.primary });
    art
      .roundRect(r * 1.2, -r * 0.28, r * 0.32, r * 0.56, r * 0.08)
      .fill(palette.primary)
      .stroke({ width: 2, color: COLORS.ink });
    art
      .poly(hex(r * 0.3, Math.PI / 6))
      .fill({ color: palette.primary, alpha: 0.28 });
    art.circle(-r * 0.2, 0, r * 0.3).fill(palette.primary);
    art.circle(-r * 0.2, 0, r * 0.14).fill(COLORS.white);
    art.circle(r * 0.05, -r * 0.55, 3).fill(palette.eye);
    art.circle(r * 0.05, r * 0.55, 3).fill(palette.eye);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU + 0.4;
      art
        .circle(Math.cos(angle) * r * 1.1, Math.sin(angle) * r * 1.1, 3)
        .fill(COLORS.gold);
    }
  } else {
    // Crusher boss.
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU;
      const inner = r * 0.9;
      const outer = r * (i % 2 === 0 ? 1.4 : 1.18);
      art
        .moveTo(Math.cos(angle - 0.16) * inner, Math.sin(angle - 0.16) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .lineTo(Math.cos(angle + 0.16) * inner, Math.sin(angle + 0.16) * inner)
        .closePath()
        .fill(palette.body)
        .stroke({ width: 3, color: palette.primary });
    }
    art
      .poly(hex(r, Math.PI / 6))
      .fill(palette.body)
      .stroke({ width: 5, color: palette.primary, alignment: 0.5 });
    art
      .poly(hex(r * 0.72, Math.PI / 6))
      .fill(0x401322)
      .stroke({ width: 2, color: palette.secondary, alpha: 0.4 });
    art
      .poly([-r * 0.7, -r * 0.5, r * 0.9, -r * 0.1, r * 0.6, 0, -r * 0.4, r * 0.12])
      .fill({ color: palette.primary, alpha: 0.3 });
    art.circle(0, 0, r * 0.32).fill(palette.primary);
    art.circle(0, 0, r * 0.18).fill(COLORS.gold);
    art.circle(r * 0.7, -r * 0.26, 3).fill(palette.eye);
    art.circle(r * 0.7, r * 0.26, 3).fill(palette.eye);
    art
      .moveTo(r * 0.25, -r * 0.72)
      .lineTo(r * 0.62, -r * 1.08)
      .lineTo(r * 0.54, -r * 0.68)
      .stroke({ width: 4, color: palette.primary });
    art
      .moveTo(r * 0.25, r * 0.72)
      .lineTo(r * 0.62, r * 1.08)
      .lineTo(r * 0.54, r * 0.68)
      .stroke({ width: 4, color: palette.primary });
  }

  body.addChild(art);

  const weakPoint = new Graphics();
  weakPoint
    .poly([0, -7, 7, 0, 0, 7, -7, 0])
    .fill(COLORS.gold)
    .stroke({ width: 2, color: COLORS.ink });
  weakPoint.circle(0, 0, 2.2).fill(COLORS.white);
  weakPoint.position.set(r * 0.52, 0);
  weakPoint.visible = false;
  body.addChild(weakPoint);

  const overlay = new Graphics();
  overlay.circle(0, 0, r * 1.15).fill({ color: COLORS.white, alpha: 0.65 });
  overlay.alpha = 0;
  body.addChild(overlay);
  root.addChild(body);

  const healthWidth = Math.max(28, r * 2.4);
  const healthBar = new Container();
  const healthBg = new Graphics();
  healthBg
    .roundRect(-healthWidth / 2 - 1, -4.5, healthWidth + 2, 9, 4.5)
    .fill({ color: COLORS.ink, alpha: 0.92 })
    .stroke({ width: 1.5, color: COLORS.panelEdge, alpha: 0.9 });
  healthBar.addChild(healthBg);
  const healthFill = new Graphics();
  healthFill.roundRect(0, 0, 1, 6, 3).fill(enemy.boss ? COLORS.gold : palette.primary);
  healthFill.position.set(-healthWidth / 2 + 1.5, -3);
  healthBar.addChild(healthFill);

  const healthHit = new Graphics();
  healthHit
    .roundRect(-healthWidth / 2 - 1, -4.5, healthWidth + 2, 9, 4.5)
    .fill({ color: COLORS.white, alpha: 0.8 });
  healthHit.alpha = 0;
  healthBar.addChild(healthHit);

  const resistEntries = (Object.entries(enemy.resistances) as Array<[string, number | undefined]>)
    .filter(([, value]) => (value ?? 0) >= 0.1);
  if (resistEntries.length > 0) {
    const pips = new Graphics();
    const colors: Record<string, number> = {
      kinetic: COLORS.cyan,
      thermal: COLORS.gold,
      arc: COLORS.violet,
    };
    const totalWidth = resistEntries.length * 7 - 3;
    resistEntries.forEach(([type], index) => {
      pips
        .circle(-totalWidth / 2 + index * 7 + 2, -8, 2.2)
        .fill({ color: colors[type] ?? COLORS.white, alpha: 0.9 });
    });
    healthBar.addChild(pips);
  }

  healthBar.position.set(0, -r - 17);

  if (enemy.boss) {
    const bossTag = new Graphics();
    bossTag
      .poly([-15, 0, 0, -6, 15, 0, 0, 6])
      .fill(COLORS.pink)
      .stroke({ width: 1.5, color: COLORS.ink });
    bossTag.position.set(0, -r - 30);
    root.addChild(bossTag);
  }

  return {
    root,
    body,
    overlay,
    healthBar,
    healthFill,
    healthHit,
    healthWidth,
    burnAura,
    slowAura,
    shieldAura,
    mutatorAura,
    telegraph,
    weakPoint,
    phaseAura,
  };
}

function mutatorColor(id: string | undefined): number {
  switch (id) {
    case 'armored':
      return COLORS.cyan;
    case 'swift':
      return COLORS.green;
    case 'regenerating':
      return COLORS.pink;
    case 'shielded':
      return COLORS.violet;
    default:
      return COLORS.cyan;
  }
}

export interface ProjectileView {
  root: Container;
}

export function createProjectileView(projectile: Projectile): ProjectileView {
  const color = projectile.crit ? COLORS.pinkSoft : COLORS.cyan;
  const root = new Container();
  const trail = new Graphics();
  trail
    .moveTo(-11, 0)
    .lineTo(-36, 0)
    .stroke({ width: 6, color, alpha: 0.12 });
  trail
    .moveTo(-9, 0)
    .lineTo(-25, 0)
    .stroke({ width: 2, color, alpha: 0.35 });
  root.addChild(trail);
  const glow = new Graphics();
  glow.circle(0, 0, projectile.crit ? 16 : 12).fill({ color, alpha: 0.14 });
  root.addChild(glow);
  const bolt = new Graphics();
  bolt
    .roundRect(-8, -3.5, projectile.crit ? 20 : 16, projectile.crit ? 7 : 6, 3)
    .fill(color)
    .stroke({ width: 2, color: COLORS.ink, alpha: 0.9 });
  bolt.circle(projectile.crit ? 8 : 5, 0, 2).fill(COLORS.white);
  root.addChild(bolt);
  return { root };
}

export interface OrbitalView {
  root: Container;
}

export function createOrbitalView(index: number): OrbitalView {
  const color = ORB_COLORS[index % ORB_COLORS.length] ?? COLORS.cyan;
  const root = new Container();
  const aura = new Graphics();
  aura.circle(0, 0, 34).fill({ color, alpha: 0.075 });
  aura.circle(0, 0, 23).fill({ color, alpha: 0.08 });
  aura.circle(0, 0, 21).stroke({ width: 2, color, alpha: 0.42 });
  root.addChild(aura);

  const gem = new Graphics();
  gem
    .poly([0, -17, 14, 0, 0, 17, -14, 0])
    .fill(color)
    .stroke({ width: 3.5, color: COLORS.ink, alignment: 1 });
  gem.poly([0, -11, 8, 0, 0, 10, -8, 0]).fill({ color: COLORS.white, alpha: 0.55 });
  gem
    .moveTo(-22, 0)
    .lineTo(-34, 0)
    .stroke({ width: 2.5, color, alpha: 0.34 });
  gem
    .circle(-27, 0, 2)
    .fill({ color, alpha: 0.75 });
  root.addChild(gem);

  return { root };
}
