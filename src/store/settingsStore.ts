import { create } from 'zustand';

export interface GameSettings {
  screenShake: number;
  showRange: boolean;
  reducedEffects: boolean;
}

interface SettingsStore extends GameSettings {
  setScreenShake: (value: number) => void;
  setShowRange: (value: boolean) => void;
  setReducedEffects: (value: boolean) => void;
}

const STORAGE_KEY = 'monolith.settings.v1';

const DEFAULTS: GameSettings = {
  screenShake: 0.7,
  showRange: false,
  reducedEffects: false,
};

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      screenShake:
        typeof parsed.screenShake === 'number'
          ? Math.max(0, Math.min(1, parsed.screenShake))
          : DEFAULTS.screenShake,
      showRange: Boolean(parsed.showRange),
      reducedEffects: Boolean(parsed.reducedEffects),
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Settings are optional.
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const initial = loadSettings();
  const update = (partial: Partial<GameSettings>) => {
    const next = { ...get(), ...partial };
    const visible: GameSettings = {
      screenShake: next.screenShake,
      showRange: next.showRange,
      reducedEffects: next.reducedEffects,
    };
    persist(visible);
    set(partial);
  };

  return {
    ...initial,
    setScreenShake: (screenShake) =>
      update({ screenShake: Math.max(0, Math.min(1, screenShake)) }),
    setShowRange: (showRange) => update({ showRange }),
    setReducedEffects: (reducedEffects) => update({ reducedEffects }),
  };
});
