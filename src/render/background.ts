import { Container, Graphics, Texture } from 'pixi.js';
import { COLORS } from './palette';

const TAU = Math.PI * 2;

const hash = (n: number): number => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

/**
 * A hand-built deep-space plate. Generated once on a 2D canvas and uploaded as
 * a Pixi texture; no external art or network requests.
 */
export function createSpaceTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');

  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cyanWash = ctx.createRadialGradient(800, 520, 30, 800, 520, 620);
  cyanWash.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
  cyanWash.addColorStop(0.4, 'rgba(0, 150, 180, 0.055)');
  cyanWash.addColorStop(1, 'rgba(10, 10, 12, 0)');
  ctx.fillStyle = cyanWash;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pinkWash = ctx.createRadialGradient(1340, 170, 20, 1340, 170, 440);
  pinkWash.addColorStop(0, 'rgba(255, 0, 85, 0.13)');
  pinkWash.addColorStop(1, 'rgba(255, 0, 85, 0)');
  ctx.fillStyle = pinkWash;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sparse star field, denser near the center.
  for (let i = 0; i < 260; i += 1) {
    const x = hash(i * 3.1) * canvas.width;
    const y = hash(i * 7.7 + 9) * canvas.height;
    const centrePull = 1 - Math.abs(x / canvas.width - 0.5) * 0.55;
    const size = (0.4 + hash(i * 11.3) * 1.8) * centrePull;
    const alpha = 0.18 + hash(i * 19.9) * 0.62;
    ctx.fillStyle =
      i % 9 === 0 ? `rgba(255, 122, 166, ${alpha})` : `rgba(190, 244, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }

  // Faint engineering grid.
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Big slow orbital arcs, as if the arena sits inside a machine.
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(800, 540, 380 + i * 92, -2.6 + i * 0.24, 0.52 + i * 0.14);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 0, 85, 0.06)';
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(800, 540, 430 + i * 84, 2.6 + i * 0.18, 3.8 + i * 0.1);
    ctx.stroke();
  }

  // Corner registration marks.
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.lineWidth = 2;
  const marks = [
    [50, 50, 1, 1],
    [canvas.width - 50, 50, -1, 1],
    [50, canvas.height - 50, 1, -1],
    [canvas.width - 50, canvas.height - 50, -1, -1],
  ];
  for (const [x, y, dx, dy] of marks) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 22);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 22, y);
    ctx.stroke();
  }

  return Texture.from(canvas);
}

const hexPoints = (radius: number, rotation = 0): number[] => {
  const points: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = rotation + (i / 6) * TAU;
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return points;
};

export interface ArenaView {
  container: Container;
  outerRing: Container;
  innerRing: Container;
}

/** Static arena plate plus separate containers for slow rotating rings. */
export function createArena(): ArenaView {
  const container = new Container();
  container.label = 'arena';

  const floor = new Graphics();
  floor.circle(0, 0, 398).fill({ color: 0x0b0d15, alpha: 0.72 });
  floor.circle(0, 0, 398).stroke({ width: 3, color: COLORS.cyanDeep, alpha: 0.25 });
  floor.circle(0, 0, 382).stroke({ width: 1, color: COLORS.cyan, alpha: 0.14 });
  floor.circle(0, 0, 306).fill({ color: 0x10131f, alpha: 0.32 });
  floor.circle(0, 0, 306).stroke({ width: 2, color: COLORS.panelEdge, alpha: 0.55 });
  floor.circle(0, 0, 186).stroke({ width: 1, color: COLORS.cyan, alpha: 0.1 });
  floor.circle(0, 0, 118).stroke({ width: 2, color: COLORS.cyan, alpha: 0.16 });
  container.addChild(floor);

  // Hex ground tracery.
  const hexes = new Graphics();
  const size = 38;
  const rowHeight = size * Math.sqrt(3);
  for (let row = -14; row <= 14; row += 1) {
    for (let col = -14; col <= 14; col += 1) {
      const cx = col * size * 1.5;
      const cy = row * rowHeight + (col % 2 === 0 ? 0 : rowHeight / 2);
      if (Math.hypot(cx, cy) > 330) continue;
      const points = hexPoints(size * 0.94, Math.PI / 6).map((value, index) =>
        index % 2 === 0 ? value + cx : value + cy,
      );
      hexes.poly(points).stroke({
        width: 1,
        color: COLORS.cyan,
        alpha: 0.045 + Math.max(0, 1 - Math.hypot(cx, cy) / 330) * 0.035,
      });
    }
  }
  container.addChild(hexes);

  // Cardinal conduits.
  const conduits = new Graphics();
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * TAU;
    const inner = 86;
    const outer = i % 2 === 0 ? 356 : 330;
    conduits
      .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
      .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
      .stroke({ width: i % 2 === 0 ? 2 : 1, color: COLORS.cyan, alpha: 0.09 });
    const marker = new Graphics();
    marker
      .circle(Math.cos(angle) * outer, Math.sin(angle) * outer, i % 2 === 0 ? 3 : 2)
      .fill({ color: i === 0 ? COLORS.pink : COLORS.cyan, alpha: 0.6 });
    container.addChild(marker);
  }
  container.addChild(conduits);

  // Outer dashed containment ring.
  const dashes = new Graphics();
  for (let i = 0; i < 48; i += 1) {
    const start = (i / 48) * TAU;
    const end = start + (TAU / 48) * 0.48;
    dashes.arc(0, 0, 368, start, end).stroke({
      width: i % 4 === 0 ? 3 : 1.5,
      color: i % 8 === 0 ? COLORS.pink : COLORS.cyan,
      alpha: i % 8 === 0 ? 0.42 : 0.2,
    });
  }
  container.addChild(dashes);

  // Hazard chevrons around the core.
  const hazard = new Graphics();
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU + 0.08;
    const r = 150;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const tangent = angle + Math.PI / 2;
    const size2 = i % 3 === 0 ? 7 : 4;
    hazard
      .moveTo(x + Math.cos(tangent) * size2, y + Math.sin(tangent) * size2)
      .lineTo(x, y)
      .lineTo(x - Math.cos(tangent) * size2, y - Math.sin(tangent) * size2)
      .stroke({ width: 2, color: i % 3 === 0 ? COLORS.pink : COLORS.cyan, alpha: 0.28 });
  }
  container.addChild(hazard);

  const outerRing = new Container();
  const outerGraphics = new Graphics();
  for (let i = 0; i < 3; i += 1) {
    const start = i * (TAU / 3) + 0.15;
    outerGraphics.arc(0, 0, 366, start, start + 0.72).stroke({
      width: 6,
      color: COLORS.cyan,
      alpha: 0.24,
    });
  }
  outerGraphics.circle(0, -366, 5).fill(COLORS.pink);
  outerGraphics.circle(0, 366, 4).fill(COLORS.cyan);
  outerRing.addChild(outerGraphics);
  container.addChild(outerRing);

  const innerRing = new Container();
  const innerGraphics = new Graphics();
  for (let i = 0; i < 6; i += 1) {
    const start = i * (TAU / 6) + 0.2;
    innerGraphics.arc(0, 0, 208, start, start + 0.52).stroke({
      width: 3,
      color: i % 2 === 0 ? COLORS.violet : COLORS.cyan,
      alpha: 0.25,
    });
  }
  innerRing.addChild(innerGraphics);
  container.addChild(innerRing);

  // Fragmented monolith pylons at the perimeter.
  const pylons = new Graphics();
  const pylonAngles = [0.7, 2.2, 4.1, 5.4];
  for (const angle of pylonAngles) {
    const x = Math.cos(angle) * 430;
    const y = Math.sin(angle) * 430;
    const tilt = angle + Math.PI / 2;
    const topX = x + Math.cos(tilt) * 24;
    const topY = y + Math.sin(tilt) * 24;
    pylons
      .moveTo(x - 18, y + 14)
      .lineTo(topX, topY)
      .lineTo(x + 20, y + 16)
      .closePath()
      .fill({ color: 0x0d0f18, alpha: 0.9 })
      .stroke({ width: 2, color: COLORS.panelEdge, alpha: 0.7 });
    pylons.circle(topX, topY, 2.5).fill({ color: COLORS.pink, alpha: 0.75 });
  }
  container.addChild(pylons);

  return { container, outerRing, innerRing };
}
