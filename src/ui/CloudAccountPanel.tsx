import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getGameSession } from '../game/session';
import { writeSave } from '../game/save';
import {
  disableCloudAutoSync,
  enableCloudAutoSync,
  getCloudSession,
  isCloudConfigured,
  loadCloudSave,
  onCloudAuthChange,
  saveCloudSave,
  sendMagicLink,
  signInWithGoogle,
  signOutCloud,
  upsertCloudProfile,
} from '../services/cloud';
import { useGameStore } from '../store/gameStore';
import { Icon } from './components/Icons';

export function CloudAccountPanel() {
  const playerName = useGameStore((state) => state.snapshot.playerName);
  const playerTag = useGameStore((state) => state.snapshot.playerTag);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isCloudConfigured) return undefined;
    void getCloudSession().then(setSession);
    return onCloudAuthChange(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    void upsertCloudProfile(playerName, playerTag);
    void getGameSession().refreshCloudEntitlements();
  }, [session, playerName, playerTag]);

  const sendLink = async () => {
    if (!email.includes('@')) {
      useGameStore.getState().pushToast('ENTER A VALID EMAIL', 'pink');
      return;
    }
    setBusy(true);
    const result = await sendMagicLink(email.trim());
    setBusy(false);
    useGameStore.getState().pushToast(result.message, result.ok ? 'cyan' : 'pink');
  };

  const google = async () => {
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    useGameStore.getState().pushToast(result.message, result.ok ? 'cyan' : 'pink');
  };

  const syncSave = async () => {
    setBusy(true);
    const ok = await saveCloudSave(getGameSession().exportSaveData());
    if (ok) enableCloudAutoSync();
    setBusy(false);
    useGameStore
      .getState()
      .pushToast(ok ? 'CLOUD SAVE WRITTEN' : 'CLOUD SAVE FAILED', ok ? 'cyan' : 'pink');
  };

  const loadSave = async () => {
    setBusy(true);
    const cloud = await loadCloudSave();
    setBusy(false);
    if (!cloud) {
      useGameStore.getState().pushToast('NO CLOUD SAVE FOUND', 'pink');
      return;
    }
    if (!window.confirm('Load the cloud save and replace local progress? The page will reload.')) {
      return;
    }
    writeSave({ ...cloud, lastSeen: Date.now() });
    window.location.reload();
  };

  const syncPurchases = async () => {
    setBusy(true);
    await getGameSession().refreshCloudEntitlements();
    setBusy(false);
    useGameStore.getState().pushToast('PURCHASES SYNCED', 'cyan');
  };

  if (!isCloudConfigured) return null;

  return (
    <section className={`cloud-card ${session ? 'is-signed-in' : ''}`}>
      <div className="cloud-mark" aria-hidden="true">
        <Icon name="core" size={19} />
      </div>
      <div className="cloud-main">
        <div className="cloud-title">
          <span className="eyebrow">CLOUD ACCESS</span>
          <strong>{session ? 'ACCOUNT LINKED' : 'OPTIONAL ACCOUNT'}</strong>
          <span className={`cloud-dot ${session ? 'is-on' : ''}`} />
        </div>

        {session ? (
          <>
            <span className="cloud-email">{session.user.email ?? session.user.id.slice(0, 8)}</span>
            <div className="cloud-actions">
              <button type="button" className="cloud-action" onClick={syncSave} disabled={busy}>
                SYNC SAVE
              </button>
              <button type="button" className="cloud-action" onClick={loadSave} disabled={busy}>
                LOAD CLOUD
              </button>
              <button type="button" className="cloud-action" onClick={syncPurchases} disabled={busy}>
                SYNC PURCHASES
              </button>
              <button
                type="button"
                className="cloud-action cloud-action--quiet"
                onClick={() => {
                  disableCloudAutoSync();
                  void signOutCloud();
                }}
                disabled={busy}
              >
                SIGN OUT
              </button>
            </div>
            <p className="cloud-note">
              After the first sync, changes upload automatically. Use LOAD CLOUD to pull
              another device's save.
            </p>
          </>
        ) : (
          <>
            <div className="cloud-login">
              <input
                type="email"
                value={email}
                placeholder="pilot@example.com"
                aria-label="Email for magic link"
                onChange={(event) => setEmail(event.target.value)}
              />
              <button type="button" className="cloud-action" onClick={sendLink} disabled={busy}>
                SEND MAGIC LINK
              </button>
              <button type="button" className="cloud-action" onClick={google} disabled={busy}>
                GOOGLE
              </button>
            </div>
            <p className="cloud-note">
              Optional. Local play stays available; a linked account enables cross-device
              saves and purchase sync.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
