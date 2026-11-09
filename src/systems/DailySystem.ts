import type { BannerAccent, DailyContractView, DailyState, LeaderboardEntry } from '../core/types';
import { emptyDailyState, todayKey } from '../utils/daily';
import type { EconomySystem } from './EconomySystem';

interface ContractDefinition {
  id: string;
  name: string;
  description: string;
  goal: number;
  metric: 'waves' | 'kills' | 'abilityUses' | 'runs';
  rewardCoins?: number;
  rewardGems?: number;
  rewardCores?: number;
  accent: BannerAccent;
}

export const DAILY_CONTRACTS: ReadonlyArray<ContractDefinition> = [
  {
    id: 'wave-sweep',
    name: 'Wave Sweep',
    description: 'Clear 6 waves today.',
    goal: 6,
    metric: 'waves',
    rewardCoins: 150,
    accent: 'cyan',
  },
  {
    id: 'hostile-cull',
    name: 'Hostile Cull',
    description: 'Destroy 80 hostiles today.',
    goal: 80,
    metric: 'kills',
    rewardCoins: 120,
    accent: 'pink',
  },
  {
    id: 'ability-drill',
    name: 'Ability Drill',
    description: 'Trigger 5 equipped abilities today.',
    goal: 5,
    metric: 'abilityUses',
    rewardGems: 10,
    accent: 'violet',
  },
  {
    id: 'full-deployment',
    name: 'Full Deployment',
    description: 'Complete 2 runs today.',
    goal: 2,
    metric: 'runs',
    rewardCores: 1,
    accent: 'gold',
  },
];

export class DailySystem {
  private state: DailyState;

  constructor(state: DailyState = emptyDailyState()) {
    this.state = this.normalize(state);
  }

  getSnapshot(): DailyState {
    this.ensureToday();
    return {
      ...this.state,
      claimed: [...this.state.claimed],
      leaderboard: this.state.leaderboard.map((entry) => ({ ...entry })),
    };
  }

  getContracts(): DailyContractView[] {
    this.ensureToday();
    return DAILY_CONTRACTS.map((contract) => {
      const progress = Math.min(contract.goal, this.state[contract.metric]);
      const claimed = this.state.claimed.includes(contract.id);
      return {
        id: contract.id,
        name: contract.name,
        description: contract.description,
        progress,
        goal: contract.goal,
        rewardLabel: this.rewardLabel(contract),
        claimable: progress >= contract.goal && !claimed,
        claimed,
        accent: contract.accent,
      };
    });
  }

  getClaimableCount(): number {
    return this.getContracts().filter((contract) => contract.claimable).length;
  }

  getLeaderboard(): LeaderboardEntry[] {
    this.ensureToday();
    return this.state.leaderboard.slice(0, 5).map((entry) => ({ ...entry }));
  }

  recordKill(count = 1): void {
    this.ensureToday();
    this.state.kills += count;
  }

  recordWaveClear(): void {
    this.ensureToday();
    this.state.waves += 1;
  }

  recordAbilityUse(): void {
    this.ensureToday();
    this.state.abilityUses += 1;
  }

  recordRun(wave: number, kills: number, name = 'PILOT'): void {
    this.ensureToday();
    this.state.runs += 1;
    if (wave <= 0) return;
    this.state.leaderboard.push({ wave, kills, date: todayKey(), name });
    this.state.leaderboard.sort((a, b) => b.wave - a.wave || b.kills - a.kills);
    this.state.leaderboard = this.state.leaderboard.slice(0, 5);
  }

  claim(id: string, economy: EconomySystem): { ok: boolean; message: string } {
    this.ensureToday();
    const def = DAILY_CONTRACTS.find((contract) => contract.id === id);
    if (!def) return { ok: false, message: 'Unknown contract.' };
    if (this.state.claimed.includes(id)) return { ok: false, message: 'Contract already claimed.' };
    if (this.state[def.metric] < def.goal) return { ok: false, message: 'Contract not complete.' };
    if (def.rewardCoins) economy.earnCoins(def.rewardCoins, false);
    if (def.rewardGems) economy.earnGems(def.rewardGems);
    if (def.rewardCores) economy.earnCores(def.rewardCores);
    this.state.claimed.push(id);
    return { ok: true, message: `${def.name} claimed. ${this.rewardLabel(def)}` };
  }

  private rewardLabel(def: ContractDefinition): string {
    if (def.rewardCores) return `+${def.rewardCores} CORE`;
    if (def.rewardGems) return `+${def.rewardGems} GEMS`;
    return `+${def.rewardCoins ?? 0} COINS`;
  }

  private ensureToday(): void {
    if (this.state.date !== todayKey()) {
      this.state = emptyDailyState();
    }
  }

  private normalize(state: DailyState): DailyState {
    const today = todayKey();
    if (state.date !== today) return emptyDailyState(today);
    return {
      ...emptyDailyState(today),
      ...state,
      claimed: Array.isArray(state.claimed) ? [...state.claimed] : [],
      leaderboard: Array.isArray(state.leaderboard)
        ? state.leaderboard.slice(0, 5).map((entry) => ({ ...entry }))
        : [],
    };
  }
}
