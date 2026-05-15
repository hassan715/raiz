import React from 'react';
import { useVault } from '../../context/VaultContext';
import { Shield } from 'lucide-react';
import SetupForm from './SetupForm';
import LoginForm from './LoginForm';

interface GatewayProps {
  children: React.ReactNode;
}

export default function Gateway({ children }: GatewayProps) {
  const { status } = useVault();

  if (status === 'LOADING') {
    return (
      <div className="flex-1 w-full bg-background flex flex-col items-center justify-center text-text-muted">
        <Shield className="w-12 h-12 text-primary animate-pulse mb-4" />
        <p className="text-sm font-medium tracking-wide">Initializing Cryptography Engine...</p>
      </div>
    );
  }

  if (status === 'SETUP') {
    return (
      <div className="flex-1 w-full bg-background overflow-y-auto">
        <div className="w-full min-h-full flex justify-center pt-[15vh] pb-12 px-4">
          <SetupForm />
        </div>
      </div>
    );
  }

  if (status === 'LOCKED') {
    return (
      <div className="flex-1 w-full bg-background overflow-y-auto">
        <div className="w-full min-h-full flex justify-center pt-[15vh] pb-12 px-4">
          <LoginForm />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
