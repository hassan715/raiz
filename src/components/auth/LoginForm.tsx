import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../../context/VaultContext';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const { setStatus } = useVault();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError('');
    setIsProcessing(true);

    try {
      // 1. Ask Rust to decrypt the file and load the DEK into RAM
      await invoke('unlock_vault', { password });
      
      // 2. If it succeeds without throwing an error, we let the user in
      setStatus('UNLOCKED');
    } catch (err: any) {
      // 3. If Rust fails (wrong password or corrupted file), we show the error
      setError(err.toString() || 'Invalid Master Password');
      setPassword(''); // Clear the field for safety
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-8 bg-surface border border-border rounded-xl shadow-2xl">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 bg-primary-muted rounded-full flex items-center justify-center mb-4 ring-4 ring-background">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text-main">Raiz Vault</h2>
        <p className="text-sm text-text-muted mt-1">
          Enter your Master Password to unlock
        </p>
      </div>

      <form onSubmit={handleUnlock} className="space-y-4">
        <div>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isProcessing}
              className="w-full pl-4 pr-12 py-3 bg-background border border-border rounded-lg text-text-main focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              placeholder="Master Password"
              autoFocus
            />
            <button
              type="submit"
              disabled={isProcessing || !password}
              className="absolute right-2 top-2 p-1.5 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg animate-in fade-in slide-in-from-top-1">
            <p className="text-sm text-danger text-center font-medium">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}