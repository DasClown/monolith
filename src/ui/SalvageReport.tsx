import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Icon } from './components/Icons';

export function SalvageReport({ inline = false }: { inline?: boolean }) {
  const reward = useGameStore((state) => state.offlineReward);
  const dismiss = useGameStore((state) => state.dismissOfflineReward);

  useEffect(() => {
    if (!reward) return undefined;
    const timeout = window.setTimeout(dismiss, 9000);
    return () => window.clearTimeout(timeout);
  }, [reward, dismiss]);

  if (!reward) return null;

  return (
    <div className={`salvage-report ${inline ? 'salvage-report--inline' : ''}`} role="status">
      <div className="salvage-icon">
        <Icon name="coin" size={22} />
      </div>
      <div className="salvage-copy">
        <span>OFFLINE SALVAGE</span>
        <strong>+{reward.coins} COINS</strong>
        <small>
          {reward.minutes}m away · {reward.rate}/min
        </small>
      </div>
      <button type="button" className="salvage-close" onClick={dismiss} aria-label="Dismiss salvage report">
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
