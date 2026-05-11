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

  const [activeView, setActiveView] = useState<'vaults' | 'settings' | 'archived' | 'favorites'>(
    'vaults'
  );

  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  const [lockTimeout, setLockTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('raiz_auto_lock');
    return saved ? parseInt(saved, 10) : 5;
  });

  useEffect(() => {
    localStorage.setItem('raiz_auto_lock', lockTimeout.toString());
  }, [lockTimeout]);

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
          {/* FIX: Wrapped children in a Render Prop function to receive lifted TitleBar states */}
          {({ searchQuery, isCreatingTrigger, resetCreatingTrigger }) =>
            activeView === 'vaults' || activeView === 'archived' || activeView === 'favorites' ? (
              <VaultDashboard
                selectedVaultId={selectedVaultId}
                activeView={activeView}
                searchQuery={searchQuery}
                isCreatingTrigger={isCreatingTrigger}
                resetCreatingTrigger={resetCreatingTrigger}
              />
            ) : (
              <SettingsView lockTimeout={lockTimeout} setLockTimeout={setLockTimeout} />
            )
          }
        </AppShell>
      </Gateway>
    </ThemeProvider>
  );
}

export default App;
