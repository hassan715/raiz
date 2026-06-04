import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../../context/VaultContext';
import { ArrowRight, Loader2, User, Check } from 'lucide-react';
import RecoveryForm from './RecoveryForm';

export default function LoginForm() {
  const { setStatus } = useVault();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [disableNetwork, setDisableNetwork] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError('');
    setIsProcessing(true);

    try {
      await invoke('unlock_vault', { password });
      setStatus('UNLOCKED');
    } catch (error) {
      const err = error as Error;
      setError(err.toString() || 'Invalid Password');
      setPassword('');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isRecovering) {
    return <RecoveryForm onBack={() => setIsRecovering(false)} />;
  }

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in duration-300 select-none">
      {/* Visual Anchor & Error Feedback Header Group */}
      <div className="flex flex-col items-center mb-2 relative">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center ring-4 ring-background mb-1">
          <User className="w-8 h-8 text-primary" />
        </div>

        {/* Dedicated Feedback Slot*/}
        <div className="h-6 flex items-center justify-start w-full">
          {error && (
            <p className="text-xs text-danger font-semibold tracking-wide animate-in fade-in duration-200 text-left">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Input Core Form */}
      <form onSubmit={handleUnlock} className="space-y-3">
        {/* Primary Input Container */}
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isProcessing}
            className="w-full pl-4 pr-12 py-3 bg-surface border border-border rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            placeholder="Enter your password"
            autoFocus
          />
          <button
            type="submit"
            disabled={isProcessing || !password}
            className="absolute right-2 top-2 p-1.5 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Secondary Options Group: Air-Gap and Recovery Link dock seamlessly */}
        <div className="space-y-2 pt-0.5">
          {/* Air-Gap Checkbox */}
          <div className="flex items-center">
            <label
              className="relative flex items-center cursor-pointer select-none group"
              htmlFor="air-gap-checkbox"
            >
              <input
                type="checkbox"
                id="air-gap-checkbox"
                checked={disableNetwork}
                onChange={(e) => setDisableNetwork(e.target.checked)}
                disabled={isProcessing}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center mr-2.5 transition-colors
                ${disableNetwork ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
              >
                {disableNetwork && (
                  <div className="w-3 h-3 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} className="text-white" />
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-text-muted group-hover:text-text-main transition-colors">
                Disable network access during session
              </span>
            </label>
          </div>

          {/* Modular Recovery Link */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setIsRecovering(true)}
              className="underline text-xs text-text-muted hover:text-primary transition-colors font-medium cursor-pointer"
            >
              Forgot your password?
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
