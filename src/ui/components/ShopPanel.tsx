import { useGameStore } from '../../store/gameStore';
import { dispatchCommand } from '../../game/commands';
import { GEM_EXCHANGE } from '../../systems/MonetizationSystem';
import { COSMETICS, cosmeticHex } from '../../config/cosmetics';
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
  const storeStatus = snapshot.storeStatus;
  const gems = Number(snapshot.gemsRaw);
  const canExchange = Number.isFinite(gems) && gems >= GEM_EXCHANGE.gemCost;
  const ownedCosmetics = new Set(snapshot.ownedCosmetics);

  return (
    <div className="vault-panel">
      <div className="panel-intro">
        <div>
          <span className="eyebrow">PREMIUM SIGNAL</span>
          <h2>NEON VAULT</h2>
        </div>
        <p>
          {storeStatus === 'live'
            ? 'Secure Paddle checkout. Support MONOLITH without changing the free core game.'
            : storeStatus === 'mock'
              ? 'Development checkout. No real charge.'
              : 'Store offline. Add Paddle keys to enable real purchases.'}
        </p>
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
          <span className={snapshot.entitlements.supporter ? 'flag is-on' : 'flag'}>
            <Icon name="rocket" size={13} /> SUPPORTER
          </span>
        </div>
      </div>

      <section className="chroma-panel" aria-labelledby="chroma-title">
        <div className="chroma-head">
          <div>
            <span className="eyebrow">GEM ATELIER</span>
            <h3 id="chroma-title">CHROMA COLLECTION</h3>
          </div>
          <span className="chroma-count">
            {snapshot.ownedCosmetics.length}/{COSMETICS.length} UNLOCKED
          </span>
        </div>
        <p className="chroma-intro">
          Permanent cosmetic palettes for the monolith core, projectiles and orbital trail.
          No combat effect.
        </p>
        <div className="chroma-grid">
          {COSMETICS.map((cosmetic) => {
            const owned = ownedCosmetics.has(cosmetic.id);
            const equipped = snapshot.cosmeticId === cosmetic.id;
            const canBuy = Number.isFinite(gems) && gems >= cosmetic.cost;
            const core = cosmeticHex(cosmetic.core);
            const accent = cosmeticHex(cosmetic.accent);
            return (
              <article
                key={cosmetic.id}
                className={`chroma-card ${owned ? 'is-owned' : ''} ${equipped ? 'is-equipped' : ''}`}
              >
                <div
                  className="chroma-preview"
                  style={{
                    borderColor: core,
                    background: `radial-gradient(circle at 50% 50%, ${core}26, transparent 68%)`,
                  }}
                  aria-hidden="true"
                >
                  <span className="chroma-halo" style={{ borderColor: accent }} />
                  <span
                    className="chroma-orb"
                    style={{ background: core, boxShadow: `0 0 18px ${core}` }}
                  />
                </div>
                <div className="chroma-copy">
                  <strong>{cosmetic.name}</strong>
                  <p>{cosmetic.tagline}</p>
                </div>
                <button
                  type="button"
                  className={`chroma-action ${equipped ? 'is-equipped' : ''}`}
                  disabled={equipped || (!owned && !canBuy)}
                  aria-pressed={equipped}
                  onClick={() =>
                    dispatchCommand(
                      owned
                        ? { type: 'equipCosmetic', id: cosmetic.id }
                        : { type: 'buyCosmetic', id: cosmetic.id },
                    )
                  }
                >
                  {equipped ? (
                    <>
                      <Icon name="check" size={14} /> EQUIPPED
                    </>
                  ) : owned ? (
                    'EQUIP'
                  ) : (
                    <>
                      <Icon name="gem" size={13} /> {cosmetic.cost}
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {storeStatus === 'disabled' ? (
        <div className="vault-offline">
          <Icon name="shield" size={24} />
          <div>
            <strong>VAULT CLOSED</strong>
            <span>Live payments are not configured yet. The core game remains free to play.</span>
          </div>
        </div>
      ) : (
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
      )}

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
        {storeStatus === 'live'
          ? 'SECURE CHECKOUT VIA PADDLE. PURCHASES SYNC TO YOUR CLOUD ACCOUNT.'
          : storeStatus === 'mock'
            ? 'DEVELOPMENT CHECKOUT. NO REAL CHARGE.'
            : 'STORE OFFLINE. LIVE PAYMENTS ARE DISABLED UNTIL PADDLE IS CONFIGURED.'}
      </p>
    </div>
  );
}
