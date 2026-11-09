import { useEffect, useRef, type Ref } from 'react';
import type { BannerView } from '../core/types';
import { dispatchCommand } from '../game/commands';
import { useGameStore } from '../store/gameStore';
import { Icon } from './components/Icons';

export function RewardOverlay() {
  const offer = useGameStore((state) => state.snapshot.bannerOffer);
  const wave = useGameStore((state) => state.snapshot.wave);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!offer) return undefined;
    const timeout = window.setTimeout(() => firstChoiceRef.current?.focus(), 300);
    return () => window.clearTimeout(timeout);
  }, [offer]);

  if (!offer || offer.length === 0) return null;

  return (
    <div className="reward-overlay">
      <div className="reward-panel" role="dialog" aria-labelledby="reward-title">
        <div className="reward-kicker">
          <span className="reward-beacon" aria-hidden="true" />
          <span>ROGUELITE SIGNAL</span>
          <span className="reward-beacon" aria-hidden="true" />
        </div>
        <h2 id="reward-title">CHOOSE A BANNER</h2>
        <p className="reward-copy">
          One permanent modifier for this run. Wave {wave + 1} launch is holding.
        </p>

        <div className="reward-grid">
          {offer.map((banner, index) => (
            <BannerChoice
              key={banner.id}
              banner={banner}
              index={index}
              ref={index === 0 ? firstChoiceRef : undefined}
            />
          ))}
        </div>

        <span className="reward-hint">
          <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd>
          or tap a banner
        </span>
      </div>
    </div>
  );
}

function BannerChoice({
  banner,
  index,
  ref,
}: {
  banner: BannerView;
  index: number;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      className={`reward-card reward-card--${banner.rarity} accent-${banner.accent}`}
      onClick={() => dispatchCommand({ type: 'chooseBanner', id: banner.id })}
      aria-label={`Choose ${banner.name}: ${banner.description}`}
    >
      <span className="reward-index">{index + 1}</span>
      <span className="reward-rarity">{banner.rarity}</span>
      <span className="reward-icon">
        <Icon name={banner.icon} size={34} />
      </span>
      <strong>{banner.name}</strong>
      <span className="reward-desc">{banner.description}</span>
      <span className="reward-stack">
        STACK {banner.stack + 1}/{banner.maxStacks}
      </span>
    </button>
  );
}
