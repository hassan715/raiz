import React, { useState, useId } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../../context/VaultContext';
import { ArrowRight, Loader2, Copy, Check, Eye, EyeOff } from 'lucide-react';

export default function SetupForm() {
  const { setStatus } = useVault();

  // Form State
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Dedicated Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Recovery State
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Stable IDs for label↔input association and aria-describedby
  const profileId = useId();
  const passwordId = useId();
  const confirmPassId = useId();
  const errorId = useId();
  const phraseId = useId();

  // Dynamic context utility mapping user-centric descriptions per workflow phase
  const getStepDescription = () => {
    if (recoveryPhrase) {
      return 'Your vault has been generated. Please back up your 24-word recovery phrase below.';
    }
    return 'Initialize your profile and secure it with a strong password.';
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profileName.trim()) {
      setError('Please provide a profile name.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      const phrase = await invoke<string>('create_vault', {
        password,
        profileName,
      });
      setRecoveryPhrase(phrase);
    } catch (error) {
      const err = error as Error;
      setError(err.toString());
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (recoveryPhrase) {
      await navigator.clipboard.writeText(recoveryPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinishSetup = () => {
    setStatus('LOCKED');
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in duration-300 select-none">
      {/* Header Context Group: Dynamically maps the subtext based on the view state */}
      <div className="flex flex-col items-start mb-5">
        <h2 className="text-xl font-bold text-text-main tracking-tight mb-1 text-left">
          {recoveryPhrase ? 'Backup Your Vault' : 'Create Identity'}
        </h2>
        <p
          className="text-sm text-text-muted text-left max-w-xs leading-relaxed transition-opacity"
          aria-live="polite"
          aria-atomic="true"
        >
          {getStepDescription()}
        </p>
      </div>

      {/* --- VIEW 2: The Recovery Phrase Screen --- */}
      {recoveryPhrase ? (
        <div
          role="region"
          aria-label="Step 2 of 2: Back up recovery phrase"
          className="space-y-4 animate-in slide-in-from-right-2"
        >
          <p role="alert" className="text-xs text-danger font-semibold text-left tracking-wide">
            Warning: This is the ONLY way to recover your vault if you lose your password.
          </p>

          <div className="p-4 bg-surface border border-border rounded-lg relative group">
            <p
              id={phraseId}
              className="font-mono text-xs leading-relaxed text-text-main wrap-break-word select-all text-left pr-8"
            >
              coast inmate hold begin cactus search horn tomato pole life dove pyramid swing section
              slim seek warrior tennis heavy village obtain limb night ecology
            </p>

            <span role="status" aria-live="polite" className="sr-only">
              {copied ? 'Copied to clipboard' : ''}
            </span>

            <button
              type="button"
              onClick={copyToClipboard}
              aria-describedby={phraseId}
              aria-label={copied ? 'Copied to clipboard' : 'Copy recovery phrase to clipboard'}
              className="absolute top-3 right-3 p-1.5 bg-background border border-border rounded-md text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success stroke-3" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* FIX: Removed the extra pt-1 wrapper to ensure perfectly identical space-y-4 stacking */}
          <button
            onClick={handleFinishSetup}
            className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
          >
            I have saved my phrase
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </button>
        </div>
      ) : (
        /* --- VIEW 1: The Password Creation Screen --- */
        <form
          onSubmit={handleCreateVault}
          aria-label="Step 1 of 2: Create profile and password"
          className="space-y-3"
          noValidate
        >
          <div>
            {/* Standard Flow Error Mounting */}
            {error && (
              <p
                id={errorId}
                role="alert"
                className="text-xs text-danger font-semibold tracking-wide animate-in fade-in duration-200 text-left mb-1.5"
              >
                {error}
              </p>
            )}

            {/* Input Stack */}
            <div className="space-y-2.5">
              {/* Profile Name Entry */}
              <div>
                <label htmlFor={profileId} className="sr-only">
                  Profile Name
                </label>
                <div className="relative">
                  <input
                    id={profileId}
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    disabled={isProcessing}
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={!!error && !profileName.trim()}
                    aria-required="true"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-colors disabled:opacity-50 text-left"
                    placeholder="Profile Name (e.g., Personal)"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Primary Password Entry */}
              <div>
                <label htmlFor={passwordId} className="sr-only">
                  Password (at least 12 characters)
                </label>
                <div className="relative">
                  <input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (!e.target.value) setShowPassword(false);
                    }}
                    disabled={isProcessing}
                    autoComplete="new-password"
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={!!error && (password.length < 12 || password !== confirmPassword)}
                    aria-required="true"
                    className="w-full pl-4 pr-12 py-3 bg-surface border border-border rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-colors disabled:opacity-50 text-left"
                    placeholder="Password (min. 12 characters)"
                    required
                  />
                  {password && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isProcessing}
                      tabIndex={-1}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-main transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Confirmation Entry */}
              <div>
                <label htmlFor={confirmPassId} className="sr-only">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id={confirmPassId}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (!e.target.value) setShowConfirmPassword(false);
                    }}
                    disabled={isProcessing}
                    autoComplete="new-password"
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={!!error && password !== confirmPassword}
                    aria-required="true"
                    className="w-full pl-4 pr-12 py-3 bg-surface border border-border rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-colors disabled:opacity-50 text-left"
                    placeholder="Confirm password"
                    required
                  />
                  {confirmPassword && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      disabled={isProcessing}
                      tabIndex={-1}
                      aria-pressed={showConfirmPassword}
                      aria-label={
                        showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-main transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Decoupled Action CTA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isProcessing || !password || !confirmPassword || !profileName.trim()}
              aria-disabled={isProcessing || !password || !confirmPassword || !profileName.trim()}
              aria-busy={isProcessing}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Initializing Vault…</span>
                </>
              ) : (
                'Initialize Vault'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
