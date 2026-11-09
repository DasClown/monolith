import { useGameStore } from '../../store/gameStore';
import { dispatchCommand } from '../../game/commands';
import { GEM_EXCHANGE } from '../../systems/MonetizationSystem';
import { Icon, type IconName } from './Icons';

const PRODUCT_ICONS: Record<string, IconName> = {
  gem: 'gem',
  coins: 'coin',
  rocket: 'rocket',
  pass: 'pass',
  shield: 'shield',
};

export function ShopPanel() {
  const shop = useGameStore((state) => state.shop);
  const busy = useGameStore((state) => state.shopBusy);
  const snapshot = useGameStore((state) => state.snapshot);
  const gems = Number(snapshot.gemsRaw);
  const canExchange = Number.isFinite(gems) && gems >= GEM_EXCHANGE.gemCost;

  return (
    <div className="vault-panel">
      <div className="panel-intro">
        <div>
          <span className="eyebrow">PREMIUM SIGNAL</span>
          <h2>NEON VAULT</h2>
        </div>
        <p>Permanent multipliers and currency packs. Local demo checkout, no real charge.</p>
      </div>

      <div className="vault-status">
        <div className="vault-balance">
          <span className="vault-balance-icon">
            <Icon name="gem" size={20} />
          </span>
          <div>
            <span>GEM BALANCE</span>
            <strong>{snapshot.gems}</strong>
          </div>
        </div>
        <div className="vault-flags" aria-label="Active premium benefits">
          <span className={snapshot.entitlements.coinDoubler ? 'flag is-on' : 'flag'}>
            <Icon name="coin" size={13} /> ×2 COINS
          </span>
          <span className={snapshot.entitlements.battlePass ? 'flag is-on' : 'flag'}>
            <Icon name="pass" size={13} /> NEON PASS
          </span>
          <span className={snapshot.entitlements.adFree ? 'flag is-on' : 'flag'}>
            <Icon name="shield" size={13} /> AD-FREE
          </span>
        </div>
      </div>

      <div className="store-grid">
        {shop.map((product) => (
          <article
            key={product.id}
            className={`store-card store-card--${product.icon} ${product.owned ? 'is-owned' : ''}`}
          >
            {product.badge && !product.owned && <span className="store-badge">{product.badge}</span>}
            <div className="store-art" aria-hidden="true">
              <Icon name={PRODUCT_ICONS[product.icon] ?? 'gem'} size={38} />
            </div>
            <div className="store-copy">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <span className="store-detail">{product.detail}</span>
            </div>
            <button
              type="button"
              className={`store-buy ${product.owned ? 'is-owned' : ''}`}
              disabled={product.disabled || busy}
              onClick={() => dispatchCommand({ type: 'purchaseProduct', id: product.id })}
              aria-label={product.owned ? `${product.name} owned` : `Buy ${product.name} for ${product.price}`}
            >
              {product.owned ? (
                <>
                  <Icon name="check" size={15} /> OWNED
                </>
              ) : busy ? (
                'LINKING…'
              ) : (
                <>
                  <span>{product.actionLabel}</span>
                  <strong>{product.price}</strong>
                </>
              )}
            </button>
          </article>
        ))}
      </div>

      <div className="exchange-strip">
        <div className="exchange-icon">
          <Icon name="gem" size={24} />
        </div>
        <div className="exchange-copy">
          <span className="eyebrow">GEM EXCHANGE</span>
          <h3>CORE CACHE</h3>
          <p>Convert premium gems into workshop coins.</p>
        </div>
        <div className="exchange-rate">
          <span>
            <Icon name="gem" size={14} /> {GEM_EXCHANGE.gemCost}
          </span>
          <Icon name="arrow-right" size={16} />
          <span>
            <Icon name="coin" size={14} /> {GEM_EXCHANGE.coinReward}
          </span>
        </div>
        <button
          type="button"
          className="exchange-button"
          disabled={!canExchange}
          onClick={() => dispatchCommand({ type: 'exchangeGems' })}
        >
          TRADE
        </button>
      </div>

      <p className="vault-disclaimer">
        SANDBOX CHECKOUT. Hook a billing adapter into MonetizationSystem before shipping live
        products.
      </p>
    </div>
  );
}
