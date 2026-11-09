import type { EnemyKind } from '../core/types';

export const COLORS = {
  void: 0x0a0a0c,
  ink: 0x05060a,
  panel: 0x12141f,
  panelLight: 0x1b1e30,
  panelEdge: 0x2c3048,
  cyan: 0x00f0ff,
  cyanSoft: 0x7af8ff,
  cyanDeep: 0x007f99,
  pink: 0xff0055,
  pinkSoft: 0xff5a8c,
  pinkDeep: 0x8a0030,
  violet: 0x8f6bff,
  violetDeep: 0x3a2a72,
  gold: 0xffc83d,
  goldDeep: 0x9c6300,
  green: 0x58e38b,
  white: 0xf7f7ff,
  muted: 0x8d91ad,
} as const;

export const FONT_DISPLAY = 'Lilita One, Arial Black, sans-serif';
export const FONT_BODY = 'Nunito Variable, Nunito, Arial, sans-serif';

export interface EnemyPalette {
  primary: number;
  secondary: number;
  glow: number;
  body: number;
  eye: number;
}

export const ENEMY_PALETTES: Record<EnemyKind, EnemyPalette> = {
  skitter: {
    primary: 0xff2f68,
    secondary: 0xff9ab8,
    glow: 0xff0055,
    body: 0x471b2c,
    eye: 0x7af8ff,
  },
  wisp: {
    primary: 0xffb03a,
    secondary: 0xffe08a,
    glow: 0xff8a00,
    body: 0x5a370f,
    eye: 0xfff6d8,
  },
  brute: {
    primary: 0x9a6bff,
    secondary: 0xcfb8ff,
    glow: 0x7b45ff,
    body: 0x38295f,
    eye: 0xff5a8c,
  },
  warden: {
    primary: 0x00d9ff,
    secondary: 0xa6f7ff,
    glow: 0x00a6c7,
    body: 0x123f4d,
    eye: 0xff3d7d,
  },
  crusher: {
    primary: 0xff0055,
    secondary: 0xff8bb1,
    glow: 0xff0055,
    body: 0x5d1229,
    eye: 0xffe28a,
  },
  summoner: {
    primary: 0xb483ff,
    secondary: 0xe3d5ff,
    glow: 0x8f6bff,
    body: 0x2a1b47,
    eye: 0x7af8ff,
  },
  artillery: {
    primary: 0xffa33a,
    secondary: 0xffd694,
    glow: 0xff7a00,
    body: 0x3b2210,
    eye: 0xff0055,
  },
};

export const ORB_COLORS = [COLORS.violet, COLORS.cyan, COLORS.pink] as const;
