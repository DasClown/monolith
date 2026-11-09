import type { Entitlements, ShopProduct, ShopView } from '../core/types';
import type { EconomySystem } from './EconomySystem';
import { isPaddleConfigured, PaddleIapAdapter } from './PaddleIapAdapter';
import { isCloudConfigured } from '../services/cloud';

export type StoreStatus = 'live' | 'mock' | 'disabled';

export interface IapPurchaseResult {
  success: boolean;
  receipt?: string;
  error?: string;
  pending?: boolean;
}

/**
 * Replace this adapter with RevenueCat / StoreKit / Play Billing for native
 * builds. The game only depends on this interface.
 */
export interface IapAdapter {
  readonly mode: StoreStatus;
  purchase(product: ShopProduct): Promise<IapPurchaseResult>;
}

export class MockIapAdapter implements IapAdapter {
  readonly mode = 'mock' as const;

  async purchase(_product: ShopProduct): Promise<IapPurchaseResult> {
    // Local development only. Production without Paddle configuration is
    // deliberately disabled so nothing can be unlocked for free.
    await new Promise((resolve) => setTimeout(resolve, 620));
    return { success: true, receipt: `demo_${Date.now()}` };
  }
}

export class DisabledIapAdapter implements IapAdapter {
  readonly mode = 'disabled' as const;

  async purchase(): Promise<IapPurchaseResult> {
    return { success: false, error: 'Store is not configured.' };
  }
}

export const SHOP_PRODUCTS: ReadonlyArray<ShopProduct> = [
  {
    id: 'supporter_pack',
    name: 'Supporter Pack',
    description: 'A one-time tip for MONOLITH. Unlocks the supporter badge on your pilot profile.',
    detail: 'Cosmetic supporter status',
    price: '€2.99',
    currency: 'EUR',
    icon: 'rocket',
    badge: 'SUPPORT',
    repeatable: false,
  },
  {
    id: 'coin_doubler',
    name: 'Coin Doubler',
    description: 'Doubles every coin earned from wave clears, forever.',
    detail: 'Permanent ×2 coins',
    price: '€2.99',
    currency: 'EUR',
    icon: 'coins',
    badge: 'BEST VALUE',
    repeatable: false,
  },
  {
    id: 'battle_pass',
    name: 'Neon Pass',
    description: 'Seasonal battle-pass hook with boosted run payouts.',
    detail: '+25% cash and coins',
    price: '€4.99',
    currency: 'EUR',
    icon: 'pass',
    repeatable: false,
  },
  {
    id: 'ad_free',
    name: 'Ad-Free Core',
    description: 'Removes all ad hooks and unlocks the clean HUD flag.',
    detail: 'No ads, forever',
    price: '€2.99',
    currency: 'EUR',
    icon: 'shield',
    repeatable: false,
  },
  {
    id: 'starter_pack',
    name: 'Starter Reactor',
    description: 'A one-time cache of coins and gems for a fresh campaign.',
    detail: '300 coins + 40 gems',
    price: '€2.99',
    currency: 'EUR',
    icon: 'rocket',
    badge: 'START HERE',
    repeatable: false,
  },
  {
    id: 'gem_hoard',
    name: 'Gem Hoard',
    description: 'A pouch of premium gems for the vault.',
    detail: '+80 gems',
    price: '€1.99',
    currency: 'EUR',
    icon: 'gem',
    badge: 'POPULAR',
    repeatable: true,
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
    supporter: false,
  };
  private readonly purchaseCounts: Record<string, number> = {};
  private readonly catalog = new Map<string, ShopProduct>(
    SHOP_PRODUCTS.map((product) => [product.id, product]),
  );

  constructor(adapter?: IapAdapter) {
    if (adapter) {
      this.adapter = adapter;
    } else if (isPaddleConfigured() && isCloudConfigured) {
      this.adapter = new PaddleIapAdapter();
    } else if (import.meta.env.DEV) {
      this.adapter = new MockIapAdapter();
    } else {
      this.adapter = new DisabledIapAdapter();
    }
  }

  get storeStatus(): StoreStatus {
    return this.adapter.mode;
  }

  get isLive(): boolean {
    return this.adapter.mode === 'live';
  }

  /** Hook for remote config or additional store products at runtime. */
  registerProduct(product: ShopProduct): void {
    this.catalog.set(product.id, product);
  }

  getProducts(): ShopProduct[] {
    return [...this.catalog.values()].filter((product) => {
      if (!this.isLive) return true;
      // Consumable balances live in the client save today. Until a server
      // wallet exists they are intentionally not offered for real money.
      return (
        product.id !== 'starter_pack' &&
        product.id !== 'gem_hoard' &&
        product.id !== 'ad_free'
      );
    });
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
      case 'supporter_pack':
        return this.entitlements.supporter;
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
      const offline = this.adapter.mode === 'disabled';
      return {
        ...product,
        owned,
        disabled: owned || offline,
        actionLabel: owned ? 'OWNED' : offline ? 'OFFLINE' : this.adapter.mode === 'mock' ? 'DEMO BUY' : 'BUY',
      };
    });
  }

  async purchase(productId: string, economy: EconomySystem): Promise<{ ok: boolean; message: string }> {
    const product = this.catalog.get(productId);
    if (!product) return { ok: false, message: 'Unknown product.' };
    if (this.isOwned(product)) return { ok: false, message: 'Already owned.' };

    const result = await this.adapter.purchase(product);
    if (!result.success) return { ok: false, message: result.error ?? 'Purchase failed.' };
    if (result.pending) {
      return {
        ok: true,
        message: 'CHECKOUT OPENED · COMPLETE PAYMENT, THEN SYNC PURCHASES',
      };
    }

    this.purchaseCounts[product.id] = (this.purchaseCounts[product.id] ?? 0) + 1;

    switch (product.id) {
      case 'supporter_pack':
        this.entitlements.supporter = true;
        return { ok: true, message: 'Thank you · supporter status unlocked.' };
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
