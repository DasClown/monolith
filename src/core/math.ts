/**
 * Deterministic, allocation-light 2D math used by the simulation.
 * Rendering never feeds values back into these functions.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export const clamp01 = (value: number): number => clamp(value, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const inverseLerp = (a: number, b: number, value: number): number =>
  a === b ? 0 : clamp01((value - a) / (b - a));

export const distanceSq = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export const distance = (ax: number, ay: number, bx: number, by: number): number =>
  Math.sqrt(distanceSq(ax, ay, bx, by));

export const length = (x: number, y: number): number => Math.hypot(x, y);

export const angleOf = (x: number, y: number): number => Math.atan2(y, x);

export const fromAngle = (angle: number, magnitude = 1): Vec2 => ({
  x: Math.cos(angle) * magnitude,
  y: Math.sin(angle) * magnitude,
});

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Vec2, scalar: number): Vec2 => ({
  x: a.x * scalar,
  y: a.y * scalar,
});

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const normalize = (x: number, y: number): Vec2 => {
  const magnitude = Math.hypot(x, y);
  if (magnitude < 1e-9) return { x: 0, y: 0 };
  return { x: x / magnitude, y: y / magnitude };
};

export const rotate = (x: number, y: number, angle: number): Vec2 => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
};

/** Move a scalar toward a target at a bounded rate. */
export const approach = (current: number, target: number, maxDelta: number): number => {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
};

/** Shortest signed angular delta, in radians. */
export const angleDelta = (from: number, to: number): number => {
  let delta = (to - from) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  return delta;
};

export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
