import { useState } from 'react';
import AppShell from './components/layout/AppShell';
import Gateway from './components/auth/Gateway';
import VaultDashboard from './components/dashboard/VaultDashboard';
import SettingsView from './components/settings/SettingsView';

function App() {
  // State to track which view is currently active in the main content area
  const [activeView, setActiveView] = useState<'vaults' | 'settings'>('vaults');

  return (
    <Gateway>
      <AppShell activeView={activeView} setActiveView={setActiveView}>
        {/* Render the selected view based on the sidebar navigation */}
        {activeView === 'vaults' ? <VaultDashboard /> : <SettingsView />}
      </AppShell>
    </Gateway>
  );
}

export default App;
