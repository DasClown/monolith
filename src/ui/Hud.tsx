import type { CSSProperties } from 'react';
import { useGameStore } from '../store/gameStore';
import { dispatchCommand } from '../game/commands';
import { MUTATOR_DEFS } from '../config/content';
import { formatCompact } from '../utils/format';
import { toRoman } from '../utils/roman';
import { CurrencyPill } from './components/CurrencyPill';
import { Icon, MonolithMark } from './components/Icons';
import { GameOverOverlay } from './GameOverOverlay';
import { RewardOverlay } from './RewardOverlay';

export function Hud() {
  const snapshot = useGameStore((state) => state.snapshot);
  const banner = useGameStore((state) => state.banner);
  const toasts = useGameStore((state) => state.toasts);
  const setActiveTab = useGameStore((state) => state.setActiveTab);

  const isIntermission = snapshot.phase === 'intermission';
  const isCombat = snapshot.phase === 'combat';
  const isReward = snapshot.phase === 'reward';
  const nextWave = displayWaveNumber(snapshot.wave, snapshot.phase);
  const preview = snapshot.nextWavePreview;
  const visibleMutators = isIntermission
    ? preview?.mutators ?? []
    : snapshot.waveMutators;
  const progress =
    snapshot.waveTotal > 0 ? Math.min(1, snapshot.waveKilled / snapshot.waveTotal) : 0;
  const hpPercent = Math.max(0, Math.min(1, snapshot.towerHp / Math.max(1, snapshot.towerMaxHp)));
  const earlyBonus = Math.max(1, Math.ceil(snapshot.nextWaveIn * 2.5));
  const critical = hpPercent <= 0.3;
  const barrierPercent = Math.max(
    0,
    Math.min(0.75, snapshot.barrier / Math.max(1, snapshot.towerMaxHp)),
  );

  const cycleSpeed = () => {
    const next = snapshot.speed === 1 ? 2 : snapshot.speed === 2 ? 3 : 1;
    dispatchCommand({ type: 'setSpeed', speed: next });
  };

  return (
    <div className="hud">
      <header className="hud-top">
        <div className="hud-left">
          <div className="brand">
            <div className="brand-mark">
              <MonolithMark size={48} />
            </div>
            <div className="brand-copy">
              <span className="brand-kicker">
                <i className="live-dot" /> SECTOR 09
              </span>
              <strong className="brand-name">MONOLITH</strong>
              <span className="brand-sub">DEFENSE PROTOCOL</span>
            </div>
          </div>

          <div className="wave-card">
            <div className="wave-card-top">
              <span className="eyebrow">{isIntermission ? 'INBOUND' : snapshot.phase === 'gameover' ? 'SIGNAL LOST' : 'SECTOR'}</span>
              <span className={`tier-chip ${snapshot.isBossWave ? 'tier-chip--boss' : ''}`}>{snapshot.isBossWave ? 'BOSS' : `TIER ${toRoman(snapshot.waveTier)}`}</span>
            </div>
            <div className="wave-number">
              <span>WAVE</span>
              <strong>{String(nextWave).padStart(2, '0')}</strong>
            </div>
            <div className="wave-track" aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="wave-card-meta">
              {isIntermission ? (
                <>
                  <Icon name="timer" size={13} />
                  <span>AUTO-LAUNCH IN {snapshot.nextWaveIn.toFixed(1)}s</span>
                </>
              ) : isReward ? (
                <>
                  <Icon name="sparkle" size={13} />
                  <span>BANNER SIGNAL · CHOOSE</span>
                </>
              ) : (
                <>
                  <Icon name="skull" size={13} />
                  <span>
                    {snapshot.waveKilled}/{snapshot.waveTotal} CLEARED · {snapshot.enemiesAlive} LIVE
                  </span>
                </>
              )}
            </div>
            {(isIntermission && preview) || visibleMutators.length > 0 ? (
              <div className="wave-preview-line">
                {isIntermission && preview ? (
                  <span className="wave-preview-count">
                    {preview.total} HOSTILES{preview.isBoss ? ' · BOSS' : ''}
                  </span>
                ) : (
                  <span className="wave-preview-count">MUTATORS</span>
                )}
                {visibleMutators.map((id) => {
                  const mutator = MUTATOR_DEFS[id];
                  return (
                    <span
                      key={id}
                      className={`mutator-chip mutator-chip--${mutator.accent}`}
                      title={`${mutator.name}: ${mutator.description}`}
                    >
                      {mutator.name.toUpperCase()}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hud-right">
          <div className="currency-cluster" aria-label="Currencies">
            <CurrencyPill
              icon="cash"
              value={snapshot.cash}
              label="Run cash"
              variant="cash"
            />
            <CurrencyPill
              icon="coin"
              value={snapshot.coins}
              label="Workshop coins"
              variant="coins"
            />
            <CurrencyPill
              icon="gem"
              value={snapshot.gems}
              label="Premium gems"
              variant="gems"
              onClick={() => setActiveTab('vault')}
            />
          </div>
          <div className="hud-multipliers">
            {snapshot.entitlements.coinDoubler && <span>×2 COINS</span>}
            {snapshot.entitlements.battlePass && <span>NEON PASS</span>}
            {snapshot.entitlements.adFree && <span>AD-FREE</span>}
            <span>WAVE {snapshot.bestWave > 0 ? `BEST ${snapshot.bestWave}` : 'RECORD PENDING'}</span>
          </div>
        </div>
      </header>

      {snapshot.isBossWave && (
        <div
          className={`boss-alert ${snapshot.bossWeakPoint ? 'is-weakpoint' : ''}`}
          role="status"
        >
          <span className="boss-alert-icon">
            <Icon name="skull" size={16} />
          </span>
          <span>BOSS SIGNAL</span>
          <strong>
            {snapshot.bossWeakPoint
              ? 'WEAK POINT OPEN'
              : snapshot.bossPhase > 1
                ? `${snapshot.bossName || 'BOSS'} · PHASE ${toRoman(snapshot.bossPhase)}`
                : snapshot.bossName || 'BOSS INBOUND'}
          </strong>
        </div>
      )}

      <div className={`core-health ${critical ? 'is-critical' : ''}`} style={{ '--hp': `${hpPercent * 100}%` } as CSSProperties}>
        <div className={`core-health-icon ${critical ? 'is-critical' : ''}`}>
          <Icon name="core" size={25} />
        </div>
        <div className="core-health-main">
          <div className="core-health-meta">
            <span>CORE INTEGRITY</span>
            <strong>
              {snapshot.towerHp}
              <em>/{snapshot.towerMaxHp}</em>
            </strong>
          </div>
          <div
            className="core-bar"
            aria-hidden="true"
            style={{ '--barrier': `${barrierPercent * 100}%` } as CSSProperties}
          >
            <span />
            <i className="core-bar-barrier" />
          </div>
          <div className="core-health-sub">
            <span>DPS {formatCompact(snapshot.dps)}</span>
            <i />
            <span>ARM {Math.round(snapshot.armor * 100)}%</span>
            <i />
            <span>RANK {toRoman(snapshot.workshopRank)}</span>
          </div>
        </div>
      </div>

      <div className="battle-right">
        <div className="ability-dock" aria-label="Equipped abilities">
          {snapshot.abilities.map((ability) => {
            const charge =
              ability.cooldownMax > 0
                ? Math.max(0, Math.min(1, 1 - ability.cooldown / ability.cooldownMax))
                : 1;
            const active = ability.id === 'overdrive' && snapshot.overdriveRemaining > 0;
            const disabled =
              !ability.ready ||
              snapshot.paused ||
              snapshot.phase === 'gameover' ||
              snapshot.phase === 'reward';
            return (
              <button
                key={ability.id}
                type="button"
                className={`nova-button nova-button--${ability.accent} ${!disabled ? 'is-ready' : ''} ${active ? 'is-active' : ''}`}
                style={{ '--nova-charge': charge } as CSSProperties}
                onClick={() => dispatchCommand({ type: 'useAbility', id: ability.id })}
                disabled={disabled}
                aria-label={
                  disabled
                    ? `${ability.name} unavailable${ability.ready ? ' while the run is held' : `, ${Math.ceil(ability.cooldown)} seconds remaining`}`
                    : `Use ${ability.name}: ${ability.description}`
                }
                title={
                  ability.ready
                    ? `${ability.name} (${ability.slot === 0 ? 'N' : 'M'})`
                    : `${ability.name} recharging: ${Math.ceil(ability.cooldown)}s`
                }
              >
                <span className="nova-button-glow" aria-hidden="true" />
                <span className="nova-button-icon">
                  <Icon name={ability.icon} size={22} />
                </span>
                <span className="nova-button-name">{ability.shortName}</span>
                <span className="nova-button-state">
                  {snapshot.phase === 'gameover'
                    ? 'OFF'
                    : snapshot.paused || snapshot.phase === 'reward'
                      ? 'HELD'
                      : active
                        ? 'ACTIVE'
                        : ability.ready
                          ? 'READY'
                          : `${Math.ceil(ability.cooldown)}s`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="control-row" aria-label="Battle controls">
          <button
            type="button"
            className={`control-button ${snapshot.paused ? 'is-active' : ''}`}
            onClick={() => dispatchCommand({ type: 'togglePause' })}
            aria-label={snapshot.paused ? 'Resume simulation' : 'Pause simulation'}
            title={snapshot.paused ? 'Resume (Space)' : 'Pause (Space)'}
          >
            <Icon name={snapshot.paused ? 'play' : 'pause'} size={19} />
          </button>
          <button
            type="button"
            className="control-button control-button--speed"
            onClick={cycleSpeed}
            aria-label={`Game speed ×${snapshot.speed}. Cycle speed.`}
            title="Cycle game speed (1 / 2 / 3)"
          >
            <Icon name="fast" size={17} />
            <span>×{snapshot.speed}</span>
          </button>
        </div>

        {isIntermission ? (
          <button
            type="button"
            className="launch-button"
            onClick={() => dispatchCommand({ type: 'startWave' })}
            disabled={snapshot.nextWaveIn <= 0.05}
            aria-label={`Launch wave ${nextWave} early for ${earlyBonus} cash`}
          >
            <span className="launch-icon">
              <Icon name="wave" size={20} />
            </span>
            <span className="launch-copy">
              <strong>LAUNCH EARLY</strong>
              <small>BONUS +${earlyBonus}</small>
            </span>
            <span className="launch-arrow">
              <Icon name="arrow-right" size={18} />
            </span>
          </button>
        ) : isCombat ? (
          <div className="wave-live" aria-label={`Wave ${snapshot.wave} live`}>
            <i />
            <span>WAVE {String(snapshot.wave).padStart(2, '0')} LIVE</span>
            <strong>{snapshot.enemiesAlive}</strong>
          </div>
        ) : isReward ? (
          <div className="wave-live wave-live--reward" aria-label="Banner reward ready">
            <Icon name="sparkle" size={14} />
            <span>BANNER READY</span>
          </div>
        ) : null}
      </div>

      {snapshot.paused && snapshot.phase !== 'gameover' && (
        <div className="pause-rang" role="status">
          <Icon name="pause" size={16} />
          <span>SIMULATION HELD</span>
          <small>SPACE TO RESUME</small>
        </div>
      )}

      {banner && (
        <div
          key={banner.id}
          className={`wave-banner wave-banner--${banner.accent}`}
          role="status"
          aria-live="polite"
        >
          <span>{banner.kicker}</span>
          <strong>{banner.title}</strong>
          <i />
        </div>
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span className="toast-dot" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <RewardOverlay />
      <GameOverOverlay />
    </div>
  );
}

function displayWaveNumber(wave: number, phase: string): number {
  if (phase === 'intermission') return wave + 1;
  return Math.max(1, wave);
}
