export type WavePhase = 'intermission' | 'combat' | 'reward' | 'gameover';

export type EnemyKind =
  | 'skitter'
  | 'wisp'
  | 'brute'
  | 'warden'
  | 'crusher'
  | 'summoner'
  | 'artillery';

export type DamageType = 'kinetic' | 'thermal' | 'arc';

export type AbilityId = 'nova' | 'aegis' | 'overdrive';

export type AbilityIcon = 'bolt' | 'shield' | 'fast';

export type WaveMutatorId = 'armored' | 'swift' | 'regenerating' | 'shielded';

export type BannerRarity = 'common' | 'rare' | 'epic';

export type BannerAccent = 'cyan' | 'pink' | 'gold' | 'violet' | 'green';

export type CurrencyKind = 'cash' | 'coins' | 'gems';

export type UpgradeTab = 'turret' | 'orbits' | 'fusion' | 'workshop';

export type AppTab = UpgradeTab | 'vault' | 'ops';

export type UpgradeIcon =
  | 'bolt'
  | 'armor'
  | 'shield'
  | 'burn'
  | 'slow'
  | 'chain'
  | 'sparkle'
  | 'cycle'
  | 'split'
  | 'range'
  | 'crit'
  | 'hull'
  | 'repair'
  | 'orb'
  | 'orb-damage'
  | 'orb-speed'
  | 'cash'
  | 'training'
  | 'blueprint'
  | 'magnet';

export type TargetMode = 'closest' | 'strongest' | 'weakest' | 'boss';

export interface TowerStats {
  damage: number;
  fireRate: number;
  range: number;
  critChance: number;
  critMultiplier: number;
  projectiles: number;
  maxHp: number;
  regen: number;
  armor: number;
  burnDps: number;
  burnDuration: number;
  slowFactor: number;
  slowDuration: number;
  chainCount: number;
  chainDamage: number;
  chainRange: number;
  thermalBonus: number;
  chainBurn: boolean;
  chainSlow: boolean;
  triadNovaBonus: number;
  orbCount: number;
  orbDamage: number;
  orbSpeed: number;
  orbRadius: number;
  projectileSpeed: number;
}

export interface EnemySpawnSpec {
  kind: EnemyKind;
  tier: number;
  wave: number;
  maxHealth: number;
  damage: number;
  speed: number;
  reward: number;
  spawnAngle: number;
  spawnRadius: number;
  armor: number;
  shield: number;
  regen: number;
  mutators: WaveMutatorId[];
}

export interface WavePreview {
  wave: number;
  total: number;
  tier: number;
  isBoss: boolean;
  mutators: WaveMutatorId[];
}

export type VisualEvent =
  | { type: 'shot'; x: number; y: number; angle: number; crit: boolean }
  | { type: 'hit'; x: number; y: number; damage: number; crit: boolean; kind: EnemyKind; damageType?: DamageType }
  | { type: 'enemyDeath'; x: number; y: number; kind: EnemyKind; reward: number }
  | { type: 'towerHit'; x: number; y: number; damage: number }
  | { type: 'orbHit'; x: number; y: number; crit: boolean }
  | { type: 'waveStart'; wave: number }
  | { type: 'waveClear'; wave: number; coins: number }
  | { type: 'bossSpawn'; x: number; y: number }
  | { type: 'bossPhase'; x: number; y: number; phase: number }
  | { type: 'bossSlam'; x: number; y: number }
  | { type: 'artillery'; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'summon'; x: number; y: number }
  | { type: 'aegis'; x: number; y: number }
  | { type: 'overdrive'; x: number; y: number }
  | { type: 'weakPoint'; x: number; y: number; open: boolean }
  | { type: 'chain'; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'nova'; x: number; y: number; radius: number }
  | { type: 'corePulse' };

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: UpgradeIcon;
  tab: UpgradeTab;
  currency: Exclude<CurrencyKind, 'gems'>;
  baseCost: number;
  growth: number;
  maxLevel: number;
  accent: 'cyan' | 'pink' | 'gold' | 'violet' | 'green';
}

export interface UpgradeView {
  id: string;
  name: string;
  description: string;
  icon: UpgradeIcon;
  tab: UpgradeTab;
  currency: Exclude<CurrencyKind, 'gems'>;
  level: number;
  maxLevel: number;
  costLabel: string;
  affordable: boolean;
  maxed: boolean;
  accent: 'cyan' | 'pink' | 'gold' | 'violet' | 'green';
}

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  detail: string;
  price: string;
  currency: 'EUR' | 'USD' | 'gems' | 'free';
  icon: 'gem' | 'coins' | 'rocket' | 'pass' | 'shield';
  badge?: string;
  repeatable: boolean;
}

export interface ShopView extends ShopProduct {
  owned: boolean;
  disabled: boolean;
  actionLabel: string;
}

export interface Entitlements {
  coinDoubler: boolean;
  adFree: boolean;
  battlePass: boolean;
  starterPack: boolean;
  supporter: boolean;
}

export interface BannerView {
  id: string;
  name: string;
  description: string;
  icon: UpgradeIcon;
  rarity: BannerRarity;
  accent: BannerAccent;
  stack: number;
  maxStacks: number;
}

export interface AbilityView {
  id: AbilityId;
  slot: number;
  name: string;
  shortName: string;
  description: string;
  icon: AbilityIcon;
  accent: BannerAccent;
  cooldown: number;
  cooldownMax: number;
  ready: boolean;
}

export type PrestigeBranch = 'offense' | 'defense' | 'economy';

export interface PrestigeNodeView {
  id: string;
  name: string;
  description: string;
  branch: PrestigeBranch;
  level: number;
  maxLevel: number;
  cost: number;
  canBuy: boolean;
  locked: boolean;
  accent: BannerAccent;
}

export interface DailyContractView {
  id: string;
  name: string;
  description: string;
  progress: number;
  goal: number;
  rewardLabel: string;
  claimable: boolean;
  claimed: boolean;
  accent: BannerAccent;
}

export interface LeaderboardEntry {
  wave: number;
  kills: number;
  date: string;
  name?: string;
}

export interface DailyState {
  date: string;
  kills: number;
  waves: number;
  abilityUses: number;
  runs: number;
  claimed: string[];
  leaderboard: LeaderboardEntry[];
}

export interface RunSnapshot {
  phase: WavePhase;
  wave: number;
  waveTier: number;
  waveTotal: number;
  waveSpawned: number;
  waveKilled: number;
  enemiesAlive: number;
  nextWaveIn: number;
  waitingForStart: boolean;
  isBossWave: boolean;
  waveMutators: WaveMutatorId[];
  towerHp: number;
  towerMaxHp: number;
  armor: number;
  burnDps: number;
  slowPercent: number;
  chainCount: number;
  dps: number;
  power: number;
  targetMode: TargetMode;
  novaCooldown: number;
  novaCooldownMax: number;
  novaDamage: number;
  novaReady: boolean;
  cash: string;
  coins: string;
  gems: string;
  cashRaw: string;
  coinsRaw: string;
  gemsRaw: string;
  bestWave: number;
  speed: number;
  paused: boolean;
  workshopRank: number;
  workshopProgress: string;
  coinMultiplier: number;
  cashMultiplier: number;
  entitlements: Entitlements;
  bossName: string;
  playerName: string;
  playerTag: string;
  storeStatus: 'live' | 'mock' | 'disabled';
  abilities: AbilityView[];
  barrier: number;
  overdriveRemaining: number;
  nextWavePreview: WavePreview | null;
  banners: BannerView[];
  bannerOffer: BannerView[] | null;
  cores: string;
  coresRaw: string;
  prestigeReward: number;
  canPrestige: boolean;
  ascensionBonus: number;
  ascensionTier: number;
  ascensionFrame: string;
  ascensionNextFrame: string;
  coresEarned: string;
  prestigeNodes: PrestigeNodeView[];
  bossPhase: number;
  bossWeakPoint: boolean;
  dailyContracts: DailyContractView[];
  dailyLeaderboard: LeaderboardEntry[];
}
