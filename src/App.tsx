import { useState, useEffect, useMemo, useRef } from 'react';
import { getCurrentWindow, getAllWindows, Window } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { register, unregisterAll, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { Shield } from 'lucide-react';
import AppShell from './components/layout/AppShell';
import Gateway from './components/auth/Gateway';
import VaultDashboard from './components/dashboard/VaultDashboard';
import SettingsView from './components/settings/SettingsView';
import TitleBar from './components/layout/TitleBar';
import { useVault } from './context/VaultContext';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { ThemeProvider } from './context/ThemeContext';

// Helper to safely enforce strict Tauri shortcut formatting
const sanitizeShortcut = (sc: string) => {
  if (!sc) return '';
  const cleaned = sc.replace(/\s+/g, '');
  return cleaned
    .split('+')
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'ctrl' || lower === 'cmd' || lower === 'command') {
        return 'CommandOrControl';
      }
      return part;
    })
    .join('+');
};

// Reusable frosted glass overlay component
const PrivacyOverlay = ({ isBlurred }: { isBlurred: boolean }) => {
  if (!isBlurred) return null;
  return (
    <div className="fixed inset-0 z-[99999] bg-background/60 backdrop-blur-2xl flex flex-col items-center justify-center pointer-events-none select-none animate-in fade-in duration-200">
      <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mb-3 shadow-xl">
        <Shield className="w-8 h-8 text-primary" />
      </div>
      <p className="text-sm font-bold text-text-main">Privacy Mode Active</p>
    </div>
  );
};

// --- MAIN WINDOW EXECUTION COMPONENT ---
function MainWindow({ appWindow, isBlurred }: { appWindow: Window; isBlurred: boolean }) {
  const { status, lockVault } = useVault();
  const [activeView, setActiveView] = useState<'vaults' | 'archived' | 'favorites'>('vaults');
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingTrigger, setIsCreatingTrigger] = useState(false);

  const [lockTimeout, setLockTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('raiz_auto_lock');
    return saved ? parseInt(saved, 10) : 10;
  });

  const lockVaultRef = useRef(lockVault);
  useEffect(() => {
    lockVaultRef.current = lockVault;
  }, [lockVault]);

  useEffect(() => {
    let lastTime = Date.now();
    const interval = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime - lastTime > 10000) {
        const lockOnSleep = localStorage.getItem('raiz_lock_sleep') !== 'false';
        if (lockOnSleep) lockVaultRef.current();
      }
      lastTime = currentTime;
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let clipboardTimeout: ReturnType<typeof setTimeout>;
    const handleClipboardCopy = () => {
      const shouldClear = localStorage.getItem('raiz_clear_clipboard') !== 'false';
      if (shouldClear) {
        clearTimeout(clipboardTimeout);
        clipboardTimeout = setTimeout(async () => {
          try {
            await writeText('');
          } catch (err) {
            console.error('Failed to clear clipboard:', err);
          }
        }, 90 * 1000);
      }
    };
    window.addEventListener('app-clipboard-copied', handleClipboardCopy);
    return () => {
      window.removeEventListener('app-clipboard-copied', handleClipboardCopy);
      clearTimeout(clipboardTimeout);
    };
  }, []);

  useEffect(() => {
    const applyZoom = () => {
      const zoom = localStorage.getItem('raiz_zoom') || '100';
      (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = `${zoom}%`;
    };
    applyZoom();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'raiz_zoom' && e.newValue) {
        (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom =
          `${e.newValue}%`;
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const unlistenLeftClick = listen('tray-left-clicked', async () => {
      const action = localStorage.getItem('raiz_tray_action') || 'show_main';
      if (action === 'show_main') {
        await appWindow.show();
        await appWindow.setFocus();
      } else if (action === 'lock_vault') {
        lockVaultRef.current();
        await appWindow.hide();
      }
    });

    const unlistenToggle = listen('tray-toggle-clicked', async () => {
      const isVisible = await appWindow.isVisible();
      if (isVisible) {
        await appWindow.hide();
      } else {
        await appWindow.show();
        await appWindow.setFocus();
      }
    });

    return () => {
      unlistenLeftClick.then((f) => f());
      unlistenToggle.then((f) => f());
    };
  }, [appWindow]);

  useEffect(() => {
    const setupShortcuts = async () => {
      const rawLockSc = localStorage.getItem('raiz_sc_lock') || 'Ctrl+Shift+L';
      const lockSc = sanitizeShortcut(rawLockSc);
      if (!lockSc) return;

      try {
        await unregisterAll();
      } catch (e) {
        console.debug('No shortcuts to unregister', e);
      }

      try {
        const alreadyRegistered = await isRegistered(lockSc);
        if (!alreadyRegistered) {
          await register(lockSc, (event) => {
            if (event.state === 'Pressed') lockVaultRef.current();
          });
        }
      } catch (err) {
        console.error(`Failed to register global lock shortcut [${lockSc}]:`, err);
      }
    };

    setupShortcuts();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'raiz_auto_lock' && e.newValue) {
        setLockTimeout(parseInt(e.newValue, 10));
      }
      if (e.key === 'raiz_sc_lock') setupShortcuts();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (status !== 'UNLOCKED') {
      getAllWindows().then((windows) => {
        const settingsWin = windows.find((w) => w.label === 'settings');
        settingsWin?.hide().catch(() => {});
      });
    }
  }, [status]);

  useEffect(() => {
    const unlisten = listen('vault-deleted-global', () => window.location.reload());
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    let unlistenClose: () => void;
    let unlistenFocus: () => void;

    const enforceModality = async () => {
      unlistenClose = await appWindow.onCloseRequested(
        async (event: { preventDefault: () => void }) => {
          const windows = await getAllWindows();
          const settingsWin = windows.find((w) => w.label === 'settings');

          if (settingsWin && (await settingsWin.isVisible())) {
            event.preventDefault();
            await settingsWin.setFocus();
            return;
          }

          const keepInTray = localStorage.getItem('raiz_keep_tray') !== 'false';
          if (keepInTray) {
            event.preventDefault();
            await appWindow.hide();
          }
        }
      );

      unlistenFocus = await appWindow.onFocusChanged(
        async ({ payload: focused }: { payload: boolean }) => {
          if (focused) {
            const windows = await getAllWindows();
            const settingsWin = windows.find((w) => w.label === 'settings');
            if (settingsWin && (await settingsWin.isVisible())) {
              await settingsWin.setFocus();
            }
          }
        }
      );
    };

    enforceModality();

    return () => {
      if (unlistenClose) unlistenClose();
      if (unlistenFocus) unlistenFocus();
    };
  }, [appWindow]);

  useIdleTimeout(lockTimeout, lockVault);

  const isFullyUnlocked = status === 'UNLOCKED';
  const disableHeaderActions = !isFullyUnlocked || activeView === 'archived';

  return (
    <>
      {isFullyUnlocked && <PrivacyOverlay isBlurred={isBlurred} />}

      <div className="flex flex-col h-screen w-full bg-background text-text-main overflow-hidden">
        <TitleBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewItemClick={() => setIsCreatingTrigger(true)}
          disableActions={disableHeaderActions}
          isSidebarVisible={isFullyUnlocked}
          hasBottomBorder={isFullyUnlocked}
        />

        <div className="flex flex-1 w-full overflow-hidden relative">
          <Gateway>
            <AppShell
              activeView={activeView}
              setActiveView={setActiveView}
              selectedVaultId={selectedVaultId}
              setSelectedVaultId={setSelectedVaultId}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
            >
              <VaultDashboard
                selectedVaultId={selectedVaultId}
                activeView={activeView}
                searchQuery={searchQuery}
                isCreatingTrigger={isCreatingTrigger}
                resetCreatingTrigger={() => setIsCreatingTrigger(false)}
                selectedTag={selectedTag}
              />
            </AppShell>
          </Gateway>
        </div>
      </div>
    </>
  );
}

// --- ROOT ROUTER ---
export default function App() {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    const applyContentProtection = async () => {
      try {
        const protect = localStorage.getItem('raiz_prevent_capture') === 'true';
        await appWindow.setContentProtected(protect);
      } catch (err) {
        console.debug('Failed to set content protected:', err);
      }
    };
    applyContentProtection();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'raiz_prevent_capture') applyContentProtection();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [appWindow]);

  useEffect(() => {
    let unlistenFocus: () => void;
    const setupFocusListener = async () => {
      unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
        const blurEnabled = localStorage.getItem('raiz_blur_unfocus') === 'true';
        setIsBlurred(!focused && blurEnabled);
      });
    };
    setupFocusListener();
    return () => {
      if (unlistenFocus) unlistenFocus();
    };
  }, [appWindow]);

  // Launching the standalone settings window
  if (appWindow.label === 'settings') {
    return (
      <ThemeProvider>
        <PrivacyOverlay isBlurred={isBlurred} />
        <SettingsView />
      </ThemeProvider>
    );
  }

  // Launching the main app window
  return (
    <ThemeProvider>
      <MainWindow appWindow={appWindow} isBlurred={isBlurred} />
    </ThemeProvider>
  );
}
