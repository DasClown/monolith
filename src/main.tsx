import '@fontsource/lilita-one/400.css';
import '@fontsource-variable/nunito';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootstrapCloud } from './services/cloud';
import { getGameSession } from './game/session';
import './styles.css';

// Boot the session before React paints so the store already holds a run
// snapshot and the upgrade drawer renders populated on its first frame.
getGameSession();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element.');

createRoot(root).render(<App />);
bootstrapCloud();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => registration.update())
      .catch(() => {
        // Offline mode is optional; the game still runs normally.
      });
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
