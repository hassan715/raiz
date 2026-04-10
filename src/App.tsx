import { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import Gateway from './components/auth/Gateway';
import VaultDashboard from './components/dashboard/VaultDashboard';
import SettingsView from './components/settings/SettingsView';
import { useVault } from './context/VaultContext';
import { useIdleTimeout } from './hooks/useIdleTimeout';

function App() {
  const { lockVault } = useVault();
  const [activeView, setActiveView] = useState<'vaults' | 'settings'>('vaults');

  // Load the saved timeout from local storage (default to 5 minutes)
  const [lockTimeout, setLockTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('raiz_auto_lock');
    return saved ? parseInt(saved, 10) : 5;
  });

  // When lockTimeout changes, save it to local storage
  useEffect(() => {
    localStorage.setItem('raiz_auto_lock', lockTimeout.toString());
  }, [lockTimeout]);

  // ACTIVATE THE INVISIBLE WATCHER
  // If the user goes idle for `lockTimeout` minutes, trigger `lockVault`
  useIdleTimeout(lockTimeout, lockVault);

  return (
    <Gateway>
      <AppShell activeView={activeView} setActiveView={setActiveView}>
        {activeView === 'vaults' ? (
          <VaultDashboard />
        ) : (
          <SettingsView lockTimeout={lockTimeout} setLockTimeout={setLockTimeout} />
        )}
      </AppShell>
    </Gateway>
  );
}

export default App;
