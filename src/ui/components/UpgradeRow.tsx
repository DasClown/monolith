import type { UpgradeView } from '../../core/types';
import { dispatchCommand } from '../../game/commands';
import { useGameStore } from '../../store/gameStore';
import { Icon } from './Icons';

interface UpgradeRowProps {
  upgrade: UpgradeView;
}

export function UpgradeRow({ upgrade }: UpgradeRowProps) {
  const phase = useGameStore((state) => state.snapshot.phase);
  const progress = upgrade.maxLevel > 0 ? upgrade.level / upgrade.maxLevel : 0;
  const currencyIcon = upgrade.currency === 'coins' ? 'coin' : 'cash';
  const runEnded = phase === 'gameover' && upgrade.currency === 'cash';
  const disabled = upgrade.maxed || !upgrade.affordable || runEnded;

  const handleBuy = () => {
    if (disabled) return;
    dispatchCommand({ type: 'buyUpgrade', id: upgrade.id });
  };

  return (
    <article className={`upgrade-row accent-${upgrade.accent} ${upgrade.maxed ? 'is-maxed' : ''}`}>
      <div className="upgrade-icon" aria-hidden="true">
        <Icon name={upgrade.icon} size={28} />
      </div>
      <div className="upgrade-copy">
        <div className="upgrade-title-line">
          <h3>{upgrade.name}</h3>
          <span className="level-chip">
            LV {String(upgrade.level).padStart(2, '0')}
            <span>/{upgrade.maxLevel}</span>
          </span>
        </div>
        <p>{upgrade.description}</p>
        <div className="upgrade-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </div>
      <button
        type="button"
        className={`buy-button buy-button--${upgrade.currency}`}
        onClick={handleBuy}
        disabled={disabled}
        aria-label={
          upgrade.maxed
            ? `${upgrade.name} is maxed`
            : runEnded
              ? `${upgrade.name} cannot be upgraded after the run ends`
              : `Upgrade ${upgrade.name} for ${upgrade.costLabel} ${upgrade.currency}`
        }
        title={
          upgrade.maxed
            ? 'Maximum level reached'
            : runEnded
              ? 'Redeploy to spend cash'
              : !upgrade.affordable
                ? `Need ${upgrade.costLabel} ${upgrade.currency}`
                : `Upgrade to level ${upgrade.level + 1}`
        }
      >
        {upgrade.maxed ? (
          <span className="buy-max">MAXED</span>
        ) : runEnded ? (
          <span className="buy-max">ENDED</span>
        ) : (
          <>
            <Icon name={currencyIcon} size={16} />
            <span>{upgrade.costLabel}</span>
          </>
        )}
      </button>
    </article>
  );
}
