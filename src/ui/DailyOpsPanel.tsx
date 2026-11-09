import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { DailyContractView } from '../core/types';
import { dispatchCommand } from '../game/commands';
import { getGameSession } from '../game/session';
import { parseSaveText, writeSave } from '../game/save';
import { normalizePlayerName } from '../utils/profile';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { Icon } from './components/Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function DailyOpsPanel() {
  const contracts = useGameStore((state) => state.snapshot.dailyContracts);
  const leaderboard = useGameStore((state) => state.snapshot.dailyLeaderboard);
  const coins = useGameStore((state) => state.snapshot.coins);
  const gems = useGameStore((state) => state.snapshot.gems);
  const cores = useGameStore((state) => state.snapshot.cores);
  const playerName = useGameStore((state) => state.snapshot.playerName);
  const playerTag = useGameStore((state) => state.snapshot.playerTag);
  const screenShake = useSettingsStore((state) => state.screenShake);
  const showRange = useSettingsStore((state) => state.showRange);
  const reducedEffects = useSettingsStore((state) => state.reducedEffects);
  const setScreenShake = useSettingsStore((state) => state.setScreenShake);
  const setShowRange = useSettingsStore((state) => state.setShowRange);
  const setReducedEffects = useSettingsStore((state) => state.setReducedEffects);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [draftName, setDraftName] = useState(playerName);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    setDraftName(playerName);
  }, [playerName]);

  const canSaveName = normalizePlayerName(draftName) !== null && draftName.trim() !== playerName;

  const handleExport = () => {
    const code = getGameSession().createSaveExport();
    const blob = new Blob([code], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `monolith-save-${playerTag}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    useGameStore.getState().pushToast('SAVE EXPORTED · KEEP THE FILE SAFE', 'cyan');
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const parsed = parseSaveText(await file.text());
    if (!parsed) {
      useGameStore.getState().pushToast('INVALID SAVE FILE', 'pink');
      return;
    }
    if (!window.confirm('Import this save and replace the current local progress? The page will reload.')) {
      return;
    }
    writeSave({ ...parsed, lastSeen: Date.now() });
    window.location.reload();
  };

  return (
    <div className="ops-panel">
      <div className="panel-intro">
        <div>
          <span className="eyebrow">DAILY OPERATIONS</span>
          <h2>OPS BOARD</h2>
        </div>
        <p>Complete daily contracts, compare local runs, and tune the arena display.</p>
      </div>

      <div className="ops-resources">
        <span>
          <Icon name="cash" size={14} /> {coins}
        </span>
        <span>
          <Icon name="gem" size={14} /> {gems} GEMS
        </span>
        <span>
          <Icon name="core" size={14} /> {cores} CORES
        </span>
        <strong>{new Date().toLocaleDateString()}</strong>
      </div>

      <section className="profile-card">
        <div className="profile-mark" aria-hidden="true">
          <Icon name="core" size={25} />
        </div>
        <div className="profile-main">
          <span className="eyebrow">PILOT PROFILE</span>
          <div className="profile-name-line">
            <input
              type="text"
              value={draftName}
              maxLength={16}
              aria-label="Player name"
              spellCheck={false}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <span className="profile-tag">#{playerTag}</span>
            <button
              type="button"
              className="profile-save"
              disabled={!canSaveName}
              onClick={() => dispatchCommand({ type: 'setPlayerName', name: draftName })}
            >
              SAVE NAME
            </button>
          </div>
          <small>2-16 characters. This name appears in the local leaderboard.</small>
        </div>
        <div className="profile-actions">
          <button type="button" className="profile-action" onClick={handleExport}>
            EXPORT SAVE
          </button>
          <button
            type="button"
            className="profile-action"
            onClick={() => importInputRef.current?.click()}
          >
            IMPORT SAVE
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="profile-file"
            onChange={handleImportFile}
          />
        </div>
      </section>

      <div className="ops-grid">
        <section className="ops-section">
          <div className="ops-section-head">
            <span className="eyebrow">CONTRACT BOARD</span>
            <strong>DAILY CONTRACTS</strong>
          </div>
          <div className="contract-list">
            {contracts.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))}
          </div>
        </section>

        <section className="ops-section">
          <div className="ops-section-head">
            <span className="eyebrow">LOCAL RECORD</span>
            <strong>LEADERBOARD</strong>
          </div>
          {leaderboard.length > 0 ? (
            <div className="leaderboard">
              {leaderboard.map((entry, index) => (
                <div className="leaderboard-row" key={`${entry.date}-${index}-${entry.wave}`}>
                  <span className="leaderboard-rank">{index + 1}</span>
                  <div className="leaderboard-main">
                    <strong className="leaderboard-name">{entry.name ?? 'PILOT'}</strong>
                    <span>
                      WAVE {String(entry.wave).padStart(2, '0')} · {entry.kills} KILLS
                    </span>
                  </div>
                  <span className="leaderboard-date">{entry.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ops-empty">
              <Icon name="trophy" size={26} />
              <span>No run recorded today.</span>
            </div>
          )}
        </section>
      </div>

      <section className="settings-panel">
        <div className="ops-section-head">
          <span className="eyebrow">SYSTEM SETTINGS</span>
          <strong>ARENA DISPLAY</strong>
        </div>
        <div className="settings-grid">
          <label className="setting-control">
            <span>
              SCREEN SHAKE <strong>{Math.round(screenShake * 100)}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={screenShake}
              onChange={(event) => setScreenShake(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className={`setting-toggle ${showRange ? 'is-on' : ''}`}
            aria-pressed={showRange}
            onClick={() => setShowRange(!showRange)}
          >
            <Icon name="range" size={16} />
            RANGE INDICATOR
          </button>
          <button
            type="button"
            className={`setting-toggle ${reducedEffects ? 'is-on' : ''}`}
            aria-pressed={reducedEffects}
            onClick={() => setReducedEffects(!reducedEffects)}
          >
            <Icon name="shield" size={16} />
            REDUCED EFFECTS
          </button>
          <div className="install-card">
            <Icon name="core" size={18} />
            <div>
              <strong>MOBILE PWA</strong>
              <span>Installable via browser menu.</span>
            </div>
            {installPrompt ? (
              <button
                type="button"
                className="install-button"
                onClick={async () => {
                  await installPrompt.prompt();
                  setInstallPrompt(null);
                }}
              >
                INSTALL
              </button>
            ) : (
              <span className="install-status">READY</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ContractRow({ contract }: { contract: DailyContractView }) {
  const percent = Math.min(100, (contract.progress / Math.max(1, contract.goal)) * 100);
  return (
    <div className={`contract-row accent-${contract.accent} ${contract.claimed ? 'is-claimed' : ''}`}>
      <div className="contract-main">
        <div className="contract-title">
          <strong>{contract.name}</strong>
          <span>{contract.rewardLabel}</span>
        </div>
        <p>{contract.description}</p>
        <div className="contract-progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        <small>
          {contract.progress}/{contract.goal}
        </small>
      </div>
      <button
        type="button"
        className="contract-claim"
        disabled={!contract.claimable}
        onClick={() => dispatchCommand({ type: 'claimContract', id: contract.id })}
      >
        {contract.claimed ? 'CLAIMED' : contract.claimable ? 'CLAIM' : 'IN PROGRESS'}
      </button>
    </div>
  );
}
