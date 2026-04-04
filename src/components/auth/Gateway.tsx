import React from 'react';
import { useVault } from '../../context/VaultContext';
import { Shield } from 'lucide-react';
import SetupForm from './SetupForm'; // 1. Import it

interface GatewayProps {
  children: React.ReactNode;
}

export default function Gateway({ children }: GatewayProps) {
  const { status } = useVault();

  if (status === 'LOADING') {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center text-text-muted">
        <Shield className="w-12 h-12 text-primary animate-pulse mb-4" />
        <p className="text-sm font-medium tracking-wide">Initializing Cryptography Engine...</p>
      </div>
    );
  }

  // 2. Replace the placeholder with the real form
  if (status === 'SETUP') {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-4">
        <SetupForm />
      </div>
    );
  }

  if (status === 'LOCKED') {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center text-text-main">
        {/* We will build LoginForm next! */}
        <div className="p-8 bg-surface border border-border rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">Vault is Locked</h2>
          <p className="text-text-muted">Enter your Master Password.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}