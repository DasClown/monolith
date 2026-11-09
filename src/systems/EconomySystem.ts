import Decimal from 'decimal.js';

export interface EconomySnapshot {
  cash: Decimal;
  coins: Decimal;
  gems: Decimal;
  cores: Decimal;
  coresEarned: Decimal;
  lifetimeCash: Decimal;
  cashMultiplier: number;
  coinMultiplier: number;
}

/**
 * Every currency is a Decimal. Cash is run-scoped, coins and gems are meta.
 * Multipliers are injected by MonetizationSystem and the Workshop, keeping the
 * economy free of hard-coded product logic.
 */
export class EconomySystem {
  private cash = new Decimal(0);
  private coins = new Decimal(0);
  private gems = new Decimal(0);
  private cores = new Decimal(0);
  private coresEarned = new Decimal(0);
  private lifetimeCash = new Decimal(0);
  private cashMultiplier = 1;
  private coinMultiplier = 1;

  constructor(
    initialCoins: Decimal.Value = 0,
    initialGems: Decimal.Value = 25,
    initialCores: Decimal.Value = 0,
    initialCoresEarned: Decimal.Value = initialCores,
  ) {
    this.coins = new Decimal(initialCoins);
    this.gems = new Decimal(initialGems);
    this.cores = new Decimal(initialCores);
    this.coresEarned = new Decimal(initialCoresEarned);
  }

  resetRun(startingCash: Decimal.Value = 36): void {
    this.cash = new Decimal(startingCash);
    this.lifetimeCash = new Decimal(0);
  }

  hydrateMeta(
    coins: Decimal.Value,
    gems: Decimal.Value,
    cores: Decimal.Value = 0,
    coresEarned: Decimal.Value = cores,
  ): void {
    this.coins = new Decimal(coins);
    this.gems = new Decimal(gems);
    this.cores = new Decimal(cores);
    this.coresEarned = new Decimal(coresEarned);
  }

  setMultipliers(cashMultiplier: number, coinMultiplier: number): void {
    this.cashMultiplier = Math.max(0, cashMultiplier);
    this.coinMultiplier = Math.max(0, coinMultiplier);
  }

  get snapshot(): EconomySnapshot {
    return {
      cash: this.cash,
      coins: this.coins,
      gems: this.gems,
      cores: this.cores,
      coresEarned: this.coresEarned,
      lifetimeCash: this.lifetimeCash,
      cashMultiplier: this.cashMultiplier,
      coinMultiplier: this.coinMultiplier,
    };
  }

  getCash(): Decimal {
    return this.cash;
  }

  getCoins(): Decimal {
    return this.coins;
  }

  getGems(): Decimal {
    return this.gems;
  }

  getCores(): Decimal {
    return this.cores;
  }

  getCoresEarned(): Decimal {
    return this.coresEarned;
  }

  canAffordCash(cost: Decimal.Value): boolean {
    return this.cash.gte(cost);
  }

  canAffordCoins(cost: Decimal.Value): boolean {
    return this.coins.gte(cost);
  }

  canAffordGems(cost: Decimal.Value): boolean {
    return this.gems.gte(cost);
  }

  canAffordCores(cost: Decimal.Value): boolean {
    return this.cores.gte(cost);
  }

  spendCash(cost: Decimal.Value): boolean {
    const amount = new Decimal(cost);
    if (amount.lt(0) || this.cash.lt(amount)) return false;
    this.cash = this.cash.minus(amount);
    return true;
  }

  spendCoins(cost: Decimal.Value): boolean {
    const amount = new Decimal(cost);
    if (amount.lt(0) || this.coins.lt(amount)) return false;
    this.coins = this.coins.minus(amount);
    return true;
  }

  spendGems(cost: Decimal.Value): boolean {
    const amount = new Decimal(cost);
    if (amount.lt(0) || this.gems.lt(amount)) return false;
    this.gems = this.gems.minus(amount);
    return true;
  }

  /** Cash earned in combat is multiplied by permanent cash bonuses. */
  earnCash(amount: Decimal.Value, applyMultiplier = true): Decimal {
    const awarded = new Decimal(amount).times(applyMultiplier ? this.cashMultiplier : 1);
    if (awarded.lte(0)) return new Decimal(0);
    this.cash = this.cash.plus(awarded);
    this.lifetimeCash = this.lifetimeCash.plus(awarded);
    return awarded;
  }

  earnCoins(amount: Decimal.Value, applyMultiplier = true): Decimal {
    const awarded = new Decimal(amount).times(applyMultiplier ? this.coinMultiplier : 1);
    if (awarded.lte(0)) return new Decimal(0);
    this.coins = this.coins.plus(awarded);
    return awarded;
  }

  earnCores(amount: Decimal.Value): Decimal {
    const awarded = new Decimal(amount);
    if (awarded.lte(0)) return new Decimal(0);
    this.cores = this.cores.plus(awarded);
    this.coresEarned = this.coresEarned.plus(awarded);
    return awarded;
  }

  spendCores(amount: Decimal.Value): boolean {
    const cost = new Decimal(amount);
    if (cost.lt(0) || this.cores.lt(cost)) return false;
    this.cores = this.cores.minus(cost);
    return true;
  }

  earnGems(amount: Decimal.Value): Decimal {
    const awarded = new Decimal(amount);
    if (awarded.lte(0)) return new Decimal(0);
    this.gems = this.gems.plus(awarded);
    return awarded;
  }

  /** Used by the premium vault's gem-to-coin exchange. */
  exchangeGemsForCoins(gemCost: Decimal.Value, coinReward: Decimal.Value): boolean {
    if (!this.spendGems(gemCost)) return false;
    this.coins = this.coins.plus(coinReward);
    return true;
  }
}
