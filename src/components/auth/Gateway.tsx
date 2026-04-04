import React from 'react';
import { useVault } from '../../context/VaultContext';
import { Shield } from 'lucide-react';
import SetupForm from './SetupForm';
import LoginForm from './LoginForm'; // 1. Import the new component

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

  if (status === 'SETUP') {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-4">
        <SetupForm />
      </div>
    );
  }

  // 2. Replace the placeholder with the real Login Form
  if (status === 'LOCKED') {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-4">
        <LoginForm />
      </div>
    );
  }

  return <>{children}</>;
}