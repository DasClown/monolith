import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import type { ShopProduct } from '../core/types';
import { getCloudUser } from '../services/cloud';
import type { IapAdapter, IapPurchaseResult } from './MonetizationSystem';

const CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim() ?? '';
const ENVIRONMENT = import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox';

const PRICE_IDS: Record<string, string | undefined> = {
  supporter_pack: import.meta.env.VITE_PADDLE_PRICE_SUPPORTER?.trim(),
};

export function isPaddleConfigured(): boolean {
  return Boolean(CLIENT_TOKEN);
}

export class PaddleIapAdapter implements IapAdapter {
  readonly mode = 'live' as const;
  private paddlePromise: Promise<Paddle | undefined> | null = null;

  private getPaddle(): Promise<Paddle | undefined> {
    if (!this.paddlePromise) {
      this.paddlePromise = initializePaddle({
        environment: ENVIRONMENT,
        token: CLIENT_TOKEN,
      });
    }
    return this.paddlePromise;
  }

  async purchase(product: ShopProduct): Promise<IapPurchaseResult> {
    if (!CLIENT_TOKEN) {
      return { success: false, error: 'Payment provider is not configured.' };
    }
    const user = await getCloudUser();
    if (!user) {
      return {
        success: false,
        error: 'Sign in to your cloud account before buying a supporter pack.',
      };
    }
    const priceId = PRICE_IDS[product.id];
    if (!priceId) {
      return { success: false, error: 'This product has no live price configured.' };
    }
    const paddle = await this.getPaddle();
    if (!paddle) {
      return { success: false, error: 'Paddle checkout could not be loaded.' };
    }

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: {
        user_id: user.id,
        product_id: product.id,
      },
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'de',
      },
    });

    return {
      success: true,
      pending: true,
      receipt: 'paddle_checkout_opened',
    };
  }
}
