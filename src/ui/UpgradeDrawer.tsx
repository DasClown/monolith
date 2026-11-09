import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { AbilityId, AppTab, TargetMode } from '../core/types';
import { PRESTIGE_BALANCE } from '../config/balance';
import { ABILITY_DEFS, ABILITY_ORDER } from '../systems/AbilitySystem';
import { SYNERGY_DEFS } from '../config/content';
import { dispatchCommand } from '../game/commands';
import { useGameStore } from '../store/gameStore';
import { toRoman } from '../utils/roman';
import { Icon, type IconName } from './components/Icons';
import { SalvageReport } from './SalvageReport';
import { DailyOpsPanel } from './DailyOpsPanel';
import { ShopPanel } from './components/ShopPanel';
import { UpgradeRow } from './components/UpgradeRow';

interface TabDefinition {
  id: AppTab;
  label: string;
  shortLabel: string;
  icon: IconName;
  accent: 'cyan' | 'violet' | 'gold' | 'pink' | 'green';
}

const TARGET_MODES: ReadonlyArray<{ id: TargetMode; label: string; hint: string; icon: IconName }> = [
  { id: 'closest', label: 'NEAREST', hint: 'Shoot the closest hostile in range.', icon: 'range' },
  { id: 'strongest', label: 'STRONGEST', hint: 'Focus the hostile with the most health.', icon: 'crit' },
  { id: 'weakest', label: 'WEAKEST', hint: 'Finish the hostile with the least health.', icon: 'bolt' },
  { id: 'boss', label: 'BOSS', hint: 'Prioritize bosses, then the closest hostile.', icon: 'skull' },
];

const TABS: ReadonlyArray<TabDefinition> = [
  { id: 'turret', label: 'TURRET', shortLabel: 'TURRET', icon: 'turret', accent: 'cyan' },
  { id: 'orbits', label: 'ORBITS', shortLabel: 'ORBS', icon: 'orb', accent: 'violet' },
  { id: 'fusion', label: 'FUSION', shortLabel: 'FUSE', icon: 'chain', accent: 'green' },
  { id: 'workshop', label: 'WORKSHOP', shortLabel: 'RANK', icon: 'workshop', accent: 'gold' },
  { id: 'vault', label: 'VAULT', shortLabel: 'VAULT', icon: 'vault', accent: 'pink' },
  { id: 'ops', label: 'OPS', shortLabel: 'OPS', icon: 'trophy', accent: 'gold' },
];

export function UpgradeDrawer() {
  const activeTab = useGameStore((state) => state.activeTab);
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  const upgrades = useGameStore((state) => state.upgrades);
  const snapshot = useGameStore((state) => state.snapshot);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [confirmAscend, setConfirmAscend] = useState(false);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    setConfirmAscend(false);
  }, [activeTab]);

  useEffect(() => {
    if (!confirmAscend) return undefined;
    const timeout = window.setTimeout(() => setConfirmAscend(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [confirmAscend]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = TABS[(index + direction + TABS.length) % TABS.length];
    setActiveTab(next.id);
    requestAnimationFrame(() => {
      document.getElementById(`drawer-tab-${next.id}`)?.focus();
    });
  };

  const affordableByTab = (tab: AppTab): number =>
    tab === 'vault' || snapshot.phase === 'gameover'
      ? 0
      : upgrades.filter((upgrade) => upgrade.tab === tab && upgrade.affordable).length;

  const turretRows = upgrades.filter((upgrade) => upgrade.tab === 'turret');
  const orbitalRows = upgrades.filter((upgrade) => upgrade.tab === 'orbits');
  const workshopRows = upgrades.filter((upgrade) => upgrade.tab === 'workshop');
  const fusionRows = upgrades.filter((upgrade) => upgrade.tab === 'fusion');
  const volley = 1 + (upgrades.find((upgrade) => upgrade.id === 'multishot')?.level ?? 0);
  const crit = 5 + 4 * (upgrades.find((upgrade) => upgrade.id === 'crit')?.level ?? 0);
  const orbCount = upgrades.find((upgrade) => upgrade.id === 'orbCount')?.level ?? 0;
  const fusionLevels = {
    burn: upgrades.find((upgrade) => upgrade.id === 'burn')?.level ?? 0,
    slow: upgrades.find((upgrade) => upgrade.id === 'slow')?.level ?? 0,
    chain: upgrades.find((upgrade) => upgrade.id === 'chain')?.level ?? 0,
  };
  const activeSynergies = SYNERGY_DEFS.map((synergy) => ({
    ...synergy,
    active: synergy.requirements.every(
      (requirement) => (fusionLevels[requirement as keyof typeof fusionLevels] ?? 0) > 0,
    ),
  }));
  const workshopTotal = workshopRows.reduce((sum, upgrade) => sum + upgrade.level, 0);
  const rank = snapshot.workshopRank;
  const rankProgress = rank >= 10 ? 100 : ((workshopTotal % 4) / 4) * 100;
  const rankBonus = rank * 5;

  return (
    <section className="drawer" aria-label="Upgrade workshop">
      <header className="drawer-header">
        <nav className="tab-bar" role="tablist" aria-label="Upgrade categories">
          {TABS.map((tab, index) => {
            const active = activeTab === tab.id;
            const count = affordableByTab(tab.id);
            return (
              <button
                key={tab.id}
                id={`drawer-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="drawer-panel"
                tabIndex={active ? 0 : -1}
                className={`drawer-tab drawer-tab--${tab.accent} ${active ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <span className="drawer-tab-icon">
                  <Icon name={tab.icon} size={20} />
                </span>
                <span className="drawer-tab-label">{tab.label}</span>
                <span className="drawer-tab-short">{tab.shortLabel}</span>
                {count > 0 && (
                  <span className="drawer-tab-badge" aria-label={`${count} upgrades ready`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="drawer-readout">
          <div>
            <span>OUTPUT</span>
            <strong>{snapshot.dps.toLocaleString()} DPS</strong>
          </div>
          <i />
          <div>
            <span>BALANCE</span>
            <strong>{snapshot.cash} CASH</strong>
          </div>
        </div>
      </header>

      <div
        ref={bodyRef}
        className="drawer-body"
        id="drawer-panel"
        role="tabpanel"
        aria-labelledby={`drawer-tab-${activeTab}`}
      >
        <SalvageReport inline />

        {snapshot.banners.length > 0 && activeTab !== 'vault' && (
          <div className="run-buff-strip" aria-label="Active run banners">
            <span className="run-buff-label">RUN BANNERS</span>
            {snapshot.banners.map((banner) => (
              <span
                key={banner.id}
                className={`run-buff accent-${banner.accent}`}
                title={banner.description}
              >
                <Icon name={banner.icon} size={13} />
                {banner.name}
                {banner.stack > 1 ? <strong>×{banner.stack}</strong> : null}
              </span>
            ))}
          </div>
        )}

        {activeTab === 'turret' && (
          <div className="panel panel--turret">
            <div className="panel-intro">
              <div>
                <span className="eyebrow">LIVE LOADOUT</span>
                <h2>TURRET SYSTEMS</h2>
              </div>
              <p>Cash resets each run. Push the monolith further before the next breach.</p>
            </div>

            <div className="stat-strip">
              <StatChip label="VOLLEY" value={`${volley} BOLT${volley === 1 ? '' : 'S'}`} tone="cyan" />
              <StatChip label="CRIT" value={`${crit}%`} tone="pink" />
              <StatChip label="RANGE" value={`${Math.round(320 * Math.pow(1.055, upgrades.find((u) => u.id === 'range')?.level ?? 0))}m`} tone="violet" />
              <StatChip label="ARMOR" value={`${Math.round(snapshot.armor * 100)}%`} tone="green" />
              <StatChip label="COIN MULT" value={`×${snapshot.coinMultiplier.toFixed(snapshot.coinMultiplier % 1 === 0 ? 0 : 2)}`} tone="gold" />
            </div>

            <div className="targeting-strip">
              <div className="targeting-copy">
                <span className="eyebrow">FIRE CONTROL</span>
                <strong>Target priority</strong>
              </div>
              <div className="targeting-options" role="group" aria-label="Target priority">
                {TARGET_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`target-mode ${snapshot.targetMode === mode.id ? 'is-active' : ''}`}
                    aria-pressed={snapshot.targetMode === mode.id}
                    title={mode.hint}
                    onClick={() => dispatchCommand({ type: 'setTargetMode', mode: mode.id })}
                  >
                    <Icon name={mode.icon} size={15} />
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {snapshot.abilities.length > 0 && (
              <div className="ability-loadout">
                <div className="ability-loadout-title">
                  <span className="eyebrow">ACTIVE LOADOUT</span>
                  <strong>Ability slots</strong>
                </div>
                <div className="ability-slots">
                  {snapshot.abilities.map((ability) => (
                    <div className="ability-slot" key={ability.slot}>
                      <span className="ability-slot-label">SLOT {ability.slot + 1}</span>
                      <div className="ability-slot-options">
                        {ABILITY_ORDER.map((id) => {
                          const def = ABILITY_DEFS[id];
                          const active = ability.id === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`ability-option ${active ? 'is-active' : ''}`}
                              aria-pressed={active}
                              title={`${def.name}: ${def.description}`}
                              onClick={() =>
                                dispatchCommand({
                                  type: 'equipAbility',
                                  slot: ability.slot,
                                  id: id as AbilityId,
                                })
                              }
                            >
                              <Icon name={def.icon} size={14} />
                              <span>{def.shortName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="upgrade-grid">
              {turretRows.map((upgrade) => (
                <UpgradeRow key={upgrade.id} upgrade={upgrade} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orbits' && (
          <div className="panel panel--orbits">
            <div className="panel-intro">
              <div>
                <span className="eyebrow">CONTACT DEFENSE</span>
                <h2>ORBITAL ARRAY</h2>
              </div>
              <p>Orbiting blades deal damage on contact. They shred crowds that get too close.</p>
            </div>

            <div className="orbital-summary">
              <div className="orbital-visual" aria-hidden="true">
                <span className="orbital-orbit" />
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className={`orbital-gem ${index < orbCount ? 'is-online' : ''}`}
                    style={{ '--orb-index': index } as CSSProperties}
                  >
                    <Icon name="gem" size={15} />
                  </span>
                ))}
                <span className="orbital-core" />
              </div>
              <div className="orbital-copy">
                <span className="eyebrow">ARRAY STATUS</span>
                <strong>{orbCount === 0 ? 'NO NODES ONLINE' : `${orbCount} BLADE${orbCount === 1 ? '' : 'S'} ONLINE`}</strong>
                <p>
                  {orbCount === 0
                    ? 'Buy an Orbital Node to activate the ring.'
                    : 'Blades inherit burn, slow, and Arc Conduit chains from the fusion matrix.'}
                </p>
              </div>
              <div className="orbital-stats">
                <StatChip label="NODES" value={`${orbCount}/3`} tone="violet" />
                <StatChip
                  label="CHARGE"
                  value={`LV ${String(upgrades.find((u) => u.id === 'orbDamage')?.level ?? 0).padStart(2, '0')}`}
                  tone="pink"
                />
              </div>
            </div>

            <div className="upgrade-grid">
              {orbitalRows.map((upgrade) => (
                <UpgradeRow key={upgrade.id} upgrade={upgrade} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fusion' && (
          <div className="panel panel--fusion">
            <div className="panel-intro">
              <div>
                <span className="eyebrow">ELEMENTAL MATRIX</span>
                <h2>FUSION SYSTEMS</h2>
              </div>
              <p>Combine burn, slow, and chain lightning to unlock automatic combat synergies. Bolts are kinetic, burn is thermal, chain is arc.</p>
            </div>

            <div className="fusion-summary">
              <div className="fusion-nodes">
                {[
                  { id: 'burn' as const, label: 'BURN', icon: 'burn' as const },
                  { id: 'slow' as const, label: 'SLOW', icon: 'slow' as const },
                  { id: 'chain' as const, label: 'CHAIN', icon: 'chain' as const },
                ].map((node) => (
                  <div
                    key={node.id}
                    className={`fusion-node ${fusionLevels[node.id] > 0 ? 'is-online' : ''}`}
                  >
                    <span>
                      <Icon name={node.icon} size={18} />
                    </span>
                    <strong>{node.label}</strong>
                    <small>{fusionLevels[node.id] > 0 ? `LV ${fusionLevels[node.id]}` : 'OFFLINE'}</small>
                  </div>
                ))}
              </div>
              <div className="fusion-readout">
                <StatChip label="BURN DPS" value={snapshot.burnDps > 0 ? `${snapshot.burnDps}/s` : '—'} tone="pink" />
                <StatChip label="SLOW" value={snapshot.slowPercent > 0 ? `${snapshot.slowPercent}%` : '—'} tone="cyan" />
                <StatChip label="CHAIN" value={snapshot.chainCount > 0 ? `${snapshot.chainCount} TGT` : '—'} tone="violet" />
              </div>
            </div>

            <div className="damage-type-line">
              <span className="is-kinetic">KINETIC · BOLTS</span>
              <span className="is-thermal">THERMAL · BURN</span>
              <span className="is-arc">ARC · CHAIN</span>
            </div>

            <div className="synergy-grid">
              {activeSynergies.map((synergy) => (
                <div
                  key={synergy.id}
                  className={`synergy-card accent-${synergy.accent} ${synergy.active ? 'is-active' : ''}`}
                >
                  <span className="synergy-icon">
                    <Icon name={synergy.icon} size={20} />
                  </span>
                  <div>
                    <span>{synergy.active ? 'ACTIVE' : 'LOCKED'}</span>
                    <strong>{synergy.name}</strong>
                    <p>{synergy.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="upgrade-grid">
              {fusionRows.map((upgrade) => (
                <UpgradeRow key={upgrade.id} upgrade={upgrade} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workshop' && (
          <div className="panel panel--workshop">
            <div className="panel-intro">
              <div>
                <span className="eyebrow">PERMANENT SYSTEMS</span>
                <h2>WORKSHOP</h2>
              </div>
              <p>Coins survive every run. Rank up the workshop for permanent core output.</p>
            </div>

            <div className="rank-card">
              <div className="rank-emblem">
                <span>RANK</span>
                <strong>{toRoman(rank)}</strong>
              </div>
              <div className="rank-main">
                <div className="rank-title-line">
                  <span>WORKSHOP RANK {toRoman(rank)}</span>
                  <strong>
                    {rank >= 10 ? 'MAX RANK' : `${workshopTotal % 4}/4 TO RANK ${toRoman(rank + 1)}`}
                  </strong>
                </div>
                <div className="rank-track" aria-hidden="true">
                  <span style={{ width: `${rankProgress}%` }} />
                </div>
                <div className="rank-subline">{snapshot.workshopProgress}</div>
              </div>
              <div className="rank-bonus">
                <span>RANK BONUS</span>
                <strong>+{rankBonus}% DMG</strong>
                <strong>+{rankBonus}% COINS</strong>
              </div>
              <div className="rank-coin">
                <Icon name="coin" size={20} />
                <strong>{snapshot.coins}</strong>
              </div>
            </div>

            <div className={`ascension-card ${snapshot.canPrestige ? 'is-ready' : ''}`}>
              <div className="ascension-mark">
                <Icon name="core" size={25} />
                <span>{snapshot.cores}</span>
              </div>
              <div className="ascension-copy">
                <span className="eyebrow">ASCENSION LOOP</span>
                <strong>PRESTIGE CORES · +{snapshot.ascensionBonus}% DAMAGE</strong>
                <p>
                  {snapshot.canPrestige
                    ? `Ascend now for +${snapshot.prestigeReward} cores. Keeps workshop, coins, and gems.`
                    : `Reach wave ${PRESTIGE_BALANCE.minWave} to convert this run into permanent cores.`}
                </p>
                <span className="ascension-frame">
                  {snapshot.ascensionFrame} · {snapshot.ascensionNextFrame}
                </span>
              </div>
              <div className="ascension-actions">
                {snapshot.canPrestige ? (
                  confirmAscend ? (
                    <>
                      <button
                        type="button"
                        className="ascend-button ascend-button--confirm"
                        onClick={() => {
                          setConfirmAscend(false);
                          dispatchCommand({ type: 'prestige' });
                        }}
                      >
                        CONFIRM +{snapshot.prestigeReward}
                      </button>
                      <button
                        type="button"
                        className="ascend-cancel"
                        onClick={() => setConfirmAscend(false)}
                      >
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ascend-button"
                      onClick={() => setConfirmAscend(true)}
                    >
                      ASCEND +{snapshot.prestigeReward}
                    </button>
                  )
                ) : (
                  <span className="ascend-locked">WAVE {PRESTIGE_BALANCE.minWave}</span>
                )}
              </div>
            </div>

            <div className="prestige-tree">
              <div className="prestige-tree-head">
                <div>
                  <span className="eyebrow">ASCENSION MATRIX</span>
                  <strong>PRESTIGE SKILL TREE</strong>
                </div>
                <span className="prestige-core-bank">
                  <Icon name="core" size={15} />
                  {snapshot.cores} CORES
                </span>
              </div>
              <div className="prestige-branches">
                {(
                  [
                    { id: 'offense', label: 'OFFENSE', icon: 'bolt' },
                    { id: 'defense', label: 'DEFENSE', icon: 'shield' },
                    { id: 'economy', label: 'ECONOMY', icon: 'coin' },
                  ] as const
                ).map((branch) => (
                  <div className={`prestige-branch prestige-branch--${branch.id}`} key={branch.id}>
                    <div className="prestige-branch-title">
                      <Icon name={branch.icon} size={16} />
                      <strong>{branch.label}</strong>
                    </div>
                    {snapshot.prestigeNodes
                      .filter((node) => node.branch === branch.id)
                      .map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          className={`prestige-node accent-${node.accent} ${node.locked ? 'is-locked' : ''} ${node.level >= node.maxLevel ? 'is-maxed' : ''}`}
                          disabled={!node.canBuy || node.level >= node.maxLevel}
                          onClick={() => dispatchCommand({ type: 'buyPrestigeNode', id: node.id })}
                          title={node.locked ? 'Unlock the previous node first.' : node.description}
                        >
                          <div className="prestige-node-top">
                            <strong>{node.name}</strong>
                            <span>
                              {node.level}/{node.maxLevel}
                            </span>
                          </div>
                          <p>{node.description}</p>
                          <div className="prestige-node-foot">
                            <span>
                              {node.locked
                                ? 'LOCKED'
                                : node.level >= node.maxLevel
                                  ? 'MAXED'
                                  : `${node.cost} CORES`}
                            </span>
                            <i>
                              <b style={{ width: `${(node.level / node.maxLevel) * 100}%` }} />
                            </i>
                          </div>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="upgrade-grid">
              {workshopRows.map((upgrade) => (
                <UpgradeRow key={upgrade.id} upgrade={upgrade} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'vault' && <ShopPanel />}

        {activeTab === 'ops' && <DailyOpsPanel />}
      </div>
    </section>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'cyan' | 'pink' | 'violet' | 'gold' | 'green';
}) {
  return (
    <div className={`stat-chip stat-chip--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
