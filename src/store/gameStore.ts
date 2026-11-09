import { create } from 'zustand';
import type { AppTab, RunSnapshot, ShopView, UpgradeView } from '../core/types';

export type ToastTone = 'cyan' | 'pink' | 'gold' | 'violet' | 'green';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface Banner {
  id: number;
  kicker: string;
  title: string;
  accent: 'cyan' | 'pink' | 'gold';
}

export interface OfflineRewardView {
  coins: string;
  minutes: number;
  rate: number;
}

interface GameStore {
  snapshot: RunSnapshot;
  upgrades: UpgradeView[];
  shop: ShopView[];
  activeTab: AppTab;
  toasts: Toast[];
  banner: Banner | null;
  shopBusy: boolean;
  ready: boolean;
  offlineReward: OfflineRewardView | null;
  setActiveTab: (tab: AppTab) => void;
  applySnapshot: (snapshot: RunSnapshot, upgrades: UpgradeView[], shop: ShopView[]) => void;
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  showBanner: (kicker: string, title: string, accent?: Banner['accent']) => void;
  setShopBusy: (busy: boolean) => void;
  setReady: (ready: boolean) => void;
  setOfflineReward: (reward: OfflineRewardView | null) => void;
  dismissOfflineReward: () => void;
}

export const INITIAL_SNAPSHOT: RunSnapshot = {
  phase: 'intermission',
  wave: 0,
  waveTier: 1,
  waveTotal: 0,
  waveSpawned: 0,
  waveKilled: 0,
  enemiesAlive: 0,
  nextWaveIn: 3.2,
  waitingForStart: true,
  isBossWave: false,
  waveMutators: [],
  bossName: '',
  playerName: 'PILOT',
  playerTag: '0000',
  storeStatus: 'disabled',
  abilities: [],
  barrier: 0,
  overdriveRemaining: 0,
  towerHp: 160,
  towerMaxHp: 160,
  armor: 0,
  burnDps: 0,
  slowPercent: 0,
  chainCount: 0,
  dps: 0,
  power: 1,
  targetMode: 'closest',
  novaCooldown: 0,
  novaCooldownMax: 24,
  novaDamage: 204,
  novaReady: true,
  cash: '36',
  coins: '120',
  gems: '25',
  cashRaw: '36',
  coinsRaw: '120',
  gemsRaw: '25',
  bestWave: 0,
  speed: 1,
  paused: false,
  workshopRank: 1,
  workshopProgress: '0/4 TO RANK 2',
  coinMultiplier: 1,
  cashMultiplier: 1,
  nextWavePreview: null,
  banners: [],
  bannerOffer: null,
  cores: '0',
  coresRaw: '0',
  prestigeReward: 0,
  canPrestige: false,
  ascensionBonus: 0,
  ascensionTier: 0,
  ascensionFrame: 'BLACK MONOLITH',
  ascensionNextFrame: 'NEXT FRAME AT 4 CORES',
  coresEarned: '0',
  prestigeNodes: [],
  bossPhase: 0,
  bossWeakPoint: false,
  dailyContracts: [],
  dailyLeaderboard: [],
  entitlements: {
    coinDoubler: false,
    adFree: false,
    battlePass: false,
    starterPack: false,
    supporter: false,
  },
};

let toastId = 0;
let bannerId = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  snapshot: INITIAL_SNAPSHOT,
  upgrades: [],
  shop: [],
  activeTab: 'turret',
  toasts: [],
  banner: null,
  shopBusy: false,
  ready: false,
  offlineReward: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  applySnapshot: (snapshot, upgrades, shop) => set({ snapshot, upgrades, shop }),
  pushToast: (message, tone = 'cyan') => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, message, tone }] }));
    window.setTimeout(() => get().dismissToast(id), 2600);
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  showBanner: (kicker, title, accent = 'cyan') => {
    const id = ++bannerId;
    set({ banner: { id, kicker, title, accent } });
    window.setTimeout(() => {
      if (get().banner?.id === id) set({ banner: null });
    }, 1900);
  },
  setShopBusy: (shopBusy) => set({ shopBusy }),
  setReady: (ready) => set({ ready }),
  setOfflineReward: (offlineReward) => set({ offlineReward }),
  dismissOfflineReward: () => set({ offlineReward: null }),
}));
