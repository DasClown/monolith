import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { dispatchCommand } from '../game/commands';
import { toRoman } from '../utils/roman';
import { Icon } from './components/Icons';

export function GameOverOverlay() {
  const snapshot = useGameStore((state) => state.snapshot);
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  const redeployRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (snapshot.phase === 'gameover') {
      const timeout = window.setTimeout(() => redeployRef.current?.focus(), 250);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [snapshot.phase]);

  if (snapshot.phase !== 'gameover') return null;

  return (
    <div className="gameover-overlay">
      <div className="gameover-card" role="dialog" aria-labelledby="gameover-title">
        <div className="gameover-emblem" aria-hidden="true">
          <span className="gameover-ring" />
          <Icon name="skull" size={44} />
        </div>
        <span className="eyebrow">MONOLITH OFFLINE</span>
        <h2 id="gameover-title">CORE BREACH</h2>
        <p className="gameover-copy">
          The sector fell at wave {snapshot.wave}. Bank your coins, reinforce the workshop, and
          redeploy stronger.
        </p>

        <div className="result-stats">
          <div>
            <span>WAVE REACHED</span>
            <strong>{String(snapshot.wave).padStart(2, '0')}</strong>
          </div>
          <div>
            <span>BEST WAVE</span>
            <strong>{String(snapshot.bestWave).padStart(2, '0')}</strong>
          </div>
          <div>
            <span>WORKSHOP</span>
            <strong>{toRoman(snapshot.workshopRank)}</strong>
          </div>
        </div>

        <div className="gameover-actions">
          <button
            ref={redeployRef}
            type="button"
            className="action-button action-button--primary"
            onClick={() => dispatchCommand({ type: 'restartRun' })}
          >
            <Icon name="play" size={18} />
            REDEPLOY
          </button>
          <button
            type="button"
            className="action-button action-button--ghost"
            onClick={() => setActiveTab('workshop')}
          >
            WORKSHOP
            <Icon name="arrow-right" size={17} />
          </button>
        </div>

        <span className="gameover-hint">Permanent workshop buffs carry into the next run.</span>
      </div>
    </div>
  );
}
