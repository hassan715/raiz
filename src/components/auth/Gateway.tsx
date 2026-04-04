import React from 'react';
import { useVault } from '../../context/VaultContext';
import { Shield } from 'lucide-react';

interface GatewayProps {
  children: React.ReactNode; // This will be the AppShell
}

export default function Gateway({ children }: GatewayProps) {
  const { status } = useVault();

  // State 1: Booting up
  if (status === 'LOADING') {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center text-text-muted">
        <Shield className="w-12 h-12 text-primary animate-pulse mb-4" />
        <p className="text-sm font-medium tracking-wide">Initializing Cryptography Engine...</p>
      </div>
    );
  }

  // State 2: First Time Setup
  if (status === 'SETUP') {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center text-text-main">
        {/* Placeholder for the Create Password Form */}
        <div className="p-8 bg-surface border border-border rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">Welcome to Raiz</h2>
          <p className="text-text-muted">Create a Master Password to begin.</p>
        </div>
      </div>
    );
  }

  // State 3: Locked Out
  if (status === 'LOCKED') {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center text-text-main">
        {/* Placeholder for the Login Form */}
        <div className="p-8 bg-surface border border-border rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">Vault is Locked</h2>
          <p className="text-text-muted">Enter your Master Password.</p>
        </div>
      </div>
    );
  }

  // State 4: Unlocked (Render the actual application)
  return <>{children}</>;
}