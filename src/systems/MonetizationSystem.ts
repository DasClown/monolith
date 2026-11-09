import type { Entitlements, ShopProduct, ShopView } from '../core/types';
import type { EconomySystem } from './EconomySystem';

/**
 * Replace this adapter with a RevenueCat / StoreKit / Play Billing bridge.
 * The rest of the game only depends on the MonetizationSystem surface.
 */
export interface IapAdapter {
  purchase(product: ShopProduct): Promise<{ success: boolean; receipt?: string; error?: string }>;
}

export class MockIapAdapter implements IapAdapter {
  async purchase(_product: ShopProduct): Promise<{ success: boolean; receipt?: string }> {
    // A local demo checkout: no network, no real charge. The delay sells the
    // store interaction while remaining deterministic enough for local play.
    await new Promise((resolve) => setTimeout(resolve, 620));
    return { success: true, receipt: `demo_${Date.now()}` };
  }
}

export const SHOP_PRODUCTS: ReadonlyArray<ShopProduct> = [
  {
    id: 'starter_pack',
    name: 'Starter Reactor',
    description: 'A one-time cache of coins and gems for a fresh campaign.',
    detail: '300 coins + 40 gems',
    price: '$2.99',
    currency: 'USD',
    icon: 'rocket',
    badge: 'START HERE',
    repeatable: false,
  },
  {
    id: 'gem_hoard',
    name: 'Gem Hoard',
    description: 'A pouch of premium gems for the vault.',
    detail: '+80 gems',
    price: '$1.99',
    currency: 'USD',
    icon: 'gem',
    badge: 'POPULAR',
    repeatable: true,
  },
  {
    id: 'coin_doubler',
    name: 'Coin Doubler',
    description: 'Doubles every coin earned from wave clears, forever.',
    detail: 'Permanent ×2 coins',
    price: '$4.99',
    currency: 'USD',
    icon: 'coins',
    badge: 'BEST VALUE',
    repeatable: false,
  },
  {
    id: 'battle_pass',
    name: 'Neon Pass',
    description: 'Seasonal battle-pass hook with boosted run payouts.',
    detail: '+25% cash and coins',
    price: '$9.99',
    currency: 'USD',
    icon: 'pass',
    repeatable: false,
  },
  {
    id: 'ad_free',
    name: 'Ad-Free Core',
    description: 'Removes all ad hooks and unlocks the clean HUD flag.',
    detail: 'No ads, forever',
    price: '$2.99',
    currency: 'USD',
    icon: 'shield',
    repeatable: false,
  },
];

export const GEM_EXCHANGE = {
  id: 'gem_exchange',
  gemCost: 20,
  coinReward: 300,
} as const;

export class MonetizationSystem {
  private readonly adapter: IapAdapter;
  private entitlements: Entitlements = {
    coinDoubler: false,
    adFree: false,
    battlePass: false,
    starterPack: false,
  };
  private readonly purchaseCounts: Record<string, number> = {};
  private readonly catalog = new Map<string, ShopProduct>(
    SHOP_PRODUCTS.map((product) => [product.id, product]),
  );

  constructor(adapter: IapAdapter = new MockIapAdapter()) {
    this.adapter = adapter;
  }

  /** Hook for remote config or additional store products at runtime. */
  registerProduct(product: ShopProduct): void {
    this.catalog.set(product.id, product);
  }

  getProducts(): ShopProduct[] {
    return [...this.catalog.values()];
  }

  hydrate(entitlements: Partial<Entitlements>, purchaseCounts: Record<string, number> = {}): void {
    this.entitlements = { ...this.entitlements, ...entitlements };
    for (const [key, value] of Object.entries(purchaseCounts)) {
      this.purchaseCounts[key] = value;
    }
  }

  get snapshot(): Entitlements {
    return { ...this.entitlements };
  }

  get coinMultiplier(): number {
    let multiplier = this.entitlements.coinDoubler ? 2 : 1;
    if (this.entitlements.battlePass) multiplier *= 1.25;
    return multiplier;
  }

  get cashMultiplier(): number {
    return this.entitlements.battlePass ? 1.25 : 1;
  }

  isOwned(product: ShopProduct): boolean {
    if (product.repeatable) return false;
    switch (product.id) {
      case 'starter_pack':
        return this.entitlements.starterPack;
      case 'coin_doubler':
        return this.entitlements.coinDoubler;
      case 'battle_pass':
        return this.entitlements.battlePass;
      case 'ad_free':
        return this.entitlements.adFree;
      default:
        return false;
    }
  }

  getShopViews(): ShopView[] {
    return this.getProducts().map((product) => {
      const owned = this.isOwned(product);
      return {
        ...product,
        owned,
        disabled: owned,
        actionLabel: owned ? 'OWNED' : product.currency === 'USD' ? 'BUY' : 'CLAIM',
      };
    });
  }

  async purchase(productId: string, economy: EconomySystem): Promise<{ ok: boolean; message: string }> {
    const product = this.catalog.get(productId);
    if (!product) return { ok: false, message: 'Unknown product.' };
    if (this.isOwned(product)) return { ok: false, message: 'Already owned.' };

    const result = await this.adapter.purchase(product);
    if (!result.success) return { ok: false, message: result.error ?? 'Purchase failed.' };

    this.purchaseCounts[product.id] = (this.purchaseCounts[product.id] ?? 0) + 1;

    switch (product.id) {
      case 'starter_pack':
        this.entitlements.starterPack = true;
        economy.earnCoins(300, false);
        economy.earnGems(40);
        return { ok: true, message: 'Starter Reactor online. +300 coins, +40 gems.' };
      case 'gem_hoard':
        economy.earnGems(80);
        return { ok: true, message: '+80 gems secured.' };
      case 'coin_doubler':
        this.entitlements.coinDoubler = true;
        return { ok: true, message: 'Coin Doubler armed.' };
      case 'battle_pass':
        this.entitlements.battlePass = true;
        return { ok: true, message: 'Neon Pass activated.' };
      case 'ad_free':
        this.entitlements.adFree = true;
        economy.earnGems(30);
        return { ok: true, message: 'Ad-Free Core online. +30 gems.' };
      default:
        return { ok: true, message: 'Purchase complete.' };
    }
  }

  getPurchaseCounts(): Record<string, number> {
    return { ...this.purchaseCounts };
  }
}
