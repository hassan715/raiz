import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Define the exact states our app can be in
type VaultStatus = 'LOADING' | 'SETUP' | 'LOCKED' | 'UNLOCKED';

interface VaultContextType {
  status: VaultStatus;
  setStatus: (status: VaultStatus) => void;
  lockVault: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('LOADING');

  useEffect(() => {
    // When the app boots, check the hard drive
    async function checkVault() {
      try {
        const exists = await invoke<boolean>('check_vault_exists');
        setStatus(exists ? 'LOCKED' : 'SETUP');
      } catch (error) {
        console.error('Failed to check vault status:', error);
        // Default to locked for safety if something goes wrong
        setStatus('LOCKED');
      }
    }
    checkVault();
  }, []);

  // A global function to safely lock the app from anywhere
  const lockVault = async () => {
    try {
      await invoke('lock_vault'); // Tell Rust to wipe the DEK from RAM
      setStatus('LOCKED'); // Tell React to show the login screen
    } catch (error) {
      console.error('Failed to lock vault:', error);
    }
  };

  return (
    <VaultContext.Provider value={{ status, setStatus, lockVault }}>
      {children}
    </VaultContext.Provider>
  );
}

// Custom hook so any component can easily grab the vault state
// eslint-disable-next-line react-refresh/only-export-components
export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
