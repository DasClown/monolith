import { Battlefield } from './ui/Battlefield';
import { UpgradeDrawer } from './ui/UpgradeDrawer';

export default function App() {
  return (
    <main className="app-shell">
      <Battlefield />
      <UpgradeDrawer />
    </main>
  );
}
