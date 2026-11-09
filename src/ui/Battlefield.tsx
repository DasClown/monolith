import { useEffect, useRef, useState } from 'react';
import { dispatchCommand } from '../game/commands';
import { getGameSession } from '../game/session';
import { GameRenderer } from '../render/GameRenderer';
import { useGameStore } from '../store/gameStore';
import { Hud } from './Hud';
import { MonolithMark } from './components/Icons';

type BootStatus = 'loading' | 'ready' | 'error';

export function Battlefield() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<BootStatus>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    let renderer: GameRenderer | null = null;
    const session = getGameSession();

    GameRenderer.create(host)
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        renderer = created;
        session.setRenderer(created);
        session.start();
        setStatus('ready');
        useGameStore.getState().setReady(true);
      })
      .catch((error: unknown) => {
        console.error('Unable to initialize the arena renderer.', error);
        if (!disposed) setStatus('error');
      });

    return () => {
      disposed = true;
      session.stop();
      session.setRenderer(null);
      renderer?.destroy();
      renderer = null;
      useGameStore.getState().setReady(false);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.code === 'Space') {
        if (target?.closest('button, a')) return;
        event.preventDefault();
        dispatchCommand({ type: 'togglePause' });
        return;
      }
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        dispatchCommand({ type: 'togglePause' });
        return;
      }
      const bannerOffer = useGameStore.getState().snapshot.bannerOffer;
      if (bannerOffer && (event.key === '1' || event.key === '2' || event.key === '3')) {
        const choice = bannerOffer[Number(event.key) - 1];
        if (choice) {
          event.preventDefault();
          dispatchCommand({ type: 'chooseBanner', id: choice.id });
          return;
        }
      }
      if (event.key === '1' || event.key === '2' || event.key === '3') {
        dispatchCommand({ type: 'setSpeed', speed: Number(event.key) });
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'n' || key === 'm') {
        const ability = useGameStore.getState().snapshot.abilities[key === 'n' ? 0 : 1];
        if (ability) {
          event.preventDefault();
          dispatchCommand({ type: 'useAbility', id: ability.id });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="battlefield" aria-label="Monolith defense arena">
      <div className="battlefield-canvas" ref={hostRef} aria-hidden="true" />
      <div className="arena-grain" aria-hidden="true" />
      <div className="arena-vignette" aria-hidden="true" />
      <div className="arena-corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <Hud />

      {status === 'loading' && (
        <div className="boot-screen" role="status">
          <div className="boot-mark">
            <MonolithMark size={70} />
            <span className="boot-sweep" />
          </div>
          <span className="eyebrow">CALIBRATING CORE</span>
          <strong>MONOLITH ONLINE</strong>
          <div className="boot-bar">
            <span />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="boot-screen boot-screen--error" role="alert">
          <div className="boot-mark">
            <MonolithMark size={70} />
          </div>
          <span className="eyebrow">RENDERER OFFLINE</span>
          <strong>WEBGL COULD NOT START</strong>
          <p>Try a hardware-accelerated browser, then reload the arena.</p>
          <button type="button" className="action-button action-button--primary" onClick={() => window.location.reload()}>
            RELOAD
          </button>
        </div>
      )}
    </section>
  );
}
