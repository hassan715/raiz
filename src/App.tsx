import { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import Gateway from './components/auth/Gateway';
import VaultDashboard from './components/dashboard/VaultDashboard';
import SettingsView from './components/settings/SettingsView';
import TitleBar from './components/layout/TitleBar';
import { useVault } from './context/VaultContext';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const { status, lockVault } = useVault();

  // Root layout navigation parameters
  const [activeView, setActiveView] = useState<'vaults' | 'settings' | 'archived' | 'favorites'>(
    'vaults'
  );
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  // Hoisted interactive controls shared across layout modules
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingTrigger, setIsCreatingTrigger] = useState(false);

  const [lockTimeout, setLockTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('raiz_auto_lock');
    return saved ? parseInt(saved, 10) : 5;
  });

  useEffect(() => {
    localStorage.setItem('raiz_auto_lock', lockTimeout.toString());
  }, [lockTimeout]);

  useIdleTimeout(lockTimeout, lockVault);

  // Actions are only permitted when fully unlocked and actively viewing workspace lists
  const isFullyUnlocked = status === 'UNLOCKED';
  const disableHeaderActions = !isFullyUnlocked || activeView === 'archived';

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen w-full bg-background text-text-main overflow-hidden">
        {/* GLOBAL CLIENT-SIDE TITLE BAR DECORATION */}
        {/* GLOBAL CLIENT-SIDE TITLE BAR DECORATION */}
        <TitleBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewItemClick={() => setIsCreatingTrigger(true)}
          disableActions={disableHeaderActions}
          isSidebarVisible={isFullyUnlocked}
          hasBottomBorder={isFullyUnlocked}
        />

        {/* Core routing execution */}
        <div className="flex flex-1 w-full overflow-hidden relative">
          <Gateway>
            <AppShell
              activeView={activeView}
              setActiveView={setActiveView}
              selectedVaultId={selectedVaultId}
              setSelectedVaultId={setSelectedVaultId}
            >
              {activeView === 'vaults' ||
              activeView === 'archived' ||
              activeView === 'favorites' ? (
                <VaultDashboard
                  selectedVaultId={selectedVaultId}
                  activeView={activeView}
                  searchQuery={searchQuery}
                  isCreatingTrigger={isCreatingTrigger}
                  resetCreatingTrigger={() => setIsCreatingTrigger(false)}
                />
              ) : (
                <SettingsView lockTimeout={lockTimeout} setLockTimeout={setLockTimeout} />
              )}
            </AppShell>
          </Gateway>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
