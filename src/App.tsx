import { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import Gateway from './components/auth/Gateway';
import VaultDashboard from './components/dashboard/VaultDashboard';
import SettingsView from './components/settings/SettingsView';
import { useVault } from './context/VaultContext';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const { lockVault } = useVault();
  const [activeView, setActiveView] = useState<'vaults' | 'settings'>('vaults');

  // Track the active vault filter (null means "All Vaults")
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

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
  useIdleTimeout(lockTimeout, lockVault);

  return (
    <ThemeProvider>
      <Gateway>
        <AppShell
          activeView={activeView}
          setActiveView={setActiveView}
          selectedVaultId={selectedVaultId}
          setSelectedVaultId={setSelectedVaultId}
        >
          {activeView === 'vaults' ? (
            <VaultDashboard selectedVaultId={selectedVaultId} />
          ) : (
            <SettingsView lockTimeout={lockTimeout} setLockTimeout={setLockTimeout} />
          )}
        </AppShell>
      </Gateway>
    </ThemeProvider>
  );
}

export default App;
