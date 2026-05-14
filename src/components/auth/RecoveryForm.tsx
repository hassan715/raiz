import React, { useState, useId } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../../context/VaultContext';
import { ArrowRight, Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react';

interface RecoveryFormProps {
  onBack: () => void;
}

export default function RecoveryForm({ onBack }: RecoveryFormProps) {
  const { setStatus } = useVault();
  const [step, setStep] = useState<'PHRASE' | 'NEW_PASSWORD' | 'NEW_PHRASE'>('PHRASE');

  // Step 1: Phrase State
  const [phrase, setPhrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2: New Password & Dedicated Visibility States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');

  // Step 3: Copy State
  const [copied, setCopied] = useState(false);

  // Stable IDs for label↔input association and aria-describedby
  const phraseId = useId();
  const newPasswordId = useId();
  const confirmPassId = useId();
  const errorId = useId();
  const newPhraseId = useId();

  const STEP_LABELS: Record<typeof step, string> = {
    PHRASE: 'Step 1 of 3: Verify recovery phrase',
    NEW_PASSWORD: 'Step 2 of 3: Create new password',
    NEW_PHRASE: 'Step 3 of 3: Back up new recovery phrase',
  };

  const getStepDescription = () => {
    switch (step) {
      case 'PHRASE':
        return 'Restore access to your local database using your secure 24-word backup.';
      case 'NEW_PASSWORD':
        return 'Phrase verified. Create a strong, new password to re-encrypt your vault.';
      case 'NEW_PHRASE':
        return 'Please back up your newly generated recovery phrase below.';
    }
  };

  const handleVerifyPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await invoke('unlock_with_recovery', { phrase: phrase.trim() });
      setStep('NEW_PASSWORD');
    } catch {
      setError('Invalid recovery phrase. Check spelling and spacing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const generatedPhrase = await invoke<string>('reset_master_password', { newPassword });
      setNewPhrase(generatedPhrase);
      setStep('NEW_PHRASE');
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(newPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in duration-300">
      {/* Header — step context announced as a heading */}
      <div className="flex flex-col items-start mb-5">
        <h2 className="text-xl font-bold text-text-main tracking-tight mb-1 text-left">
          Account Recovery
        </h2>
        <p
          className="text-sm text-text-muted text-left max-w-xs leading-relaxed"
          aria-live="polite"
          aria-atomic="true"
        >
          {getStepDescription()}
        </p>
      </div>

      {/* STEP 1: VERIFY RECOVERY PHRASE */}
      {step === 'PHRASE' && (
        <form
          onSubmit={handleVerifyPhrase}
          aria-label={STEP_LABELS.PHRASE}
          className="space-y-3 animate-in slide-in-from-right-2"
          noValidate
        >
          {error && (
            <p
              id={errorId}
              role="alert"
              className="text-xs text-danger font-semibold tracking-wide animate-in fade-in duration-200 text-left mb-1.5"
            >
              {error}
            </p>
          )}

          <div>
            <label htmlFor={phraseId} className="sr-only">
              Recovery phrase
            </label>
            <textarea
              id={phraseId}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="Enter your 24-word recovery phrase separated by spaces…"
              aria-describedby={error ? errorId : undefined}
              aria-invalid={!!error}
              aria-required="true"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-main focus:outline-none focus:border-primary text-sm min-h-[120px] resize-none disabled:opacity-50 transition-colors text-left"
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={isLoading || !phrase.trim()}
              aria-disabled={isLoading || !phrase.trim()}
              aria-busy={isLoading}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Verifying phrase…</span>
                </>
              ) : (
                'Verify Phrase'
              )}
            </button>

            <div className="flex justify-start mt-4">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                aria-disabled={isLoading}
                className="text-xs text-text-muted hover:text-text-main underline transition-colors font-medium cursor-pointer text-left"
              >
                Return to login
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: CREATE & CONFIRM NEW PASSWORD */}
      {step === 'NEW_PASSWORD' && (
        <form
          onSubmit={handleResetPassword}
          aria-label={STEP_LABELS.NEW_PASSWORD}
          className="space-y-3 animate-in slide-in-from-right-2"
          noValidate
        >
          {error && (
            <p
              id={errorId}
              role="alert"
              className="text-xs text-danger font-semibold tracking-wide animate-in fade-in duration-200 text-left mb-1.5"
            >
              {error}
            </p>
          )}

          <div className="space-y-2.5">
            {/* New password */}
            <div>
              <label htmlFor={newPasswordId} className="sr-only">
                New password (at least 12 characters)
              </label>
              <div className="relative">
                <input
                  id={newPasswordId}
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (!e.target.value) setShowNewPassword(false);
                  }}
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={
                    !!error && (newPassword.length < 12 || newPassword !== confirmPassword)
                  }
                  aria-required="true"
                  className="w-full pl-4 pr-12 py-3 bg-surface border border-border rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-colors disabled:opacity-50 text-left"
                  placeholder="New password (at least 12 characters)"
                  required
                  autoFocus
                />
                {newPassword && (
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    disabled={isLoading}
                    tabIndex={-1}
                    aria-pressed={showNewPassword}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-main transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor={confirmPassId} className="sr-only">
                Confirm new password
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
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={!!error && newPassword !== confirmPassword}
                  aria-required="true"
                  className="w-full pl-4 pr-12 py-3 bg-surface border border-border rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-colors disabled:opacity-50 text-left"
                  placeholder="Confirm new password"
                  required
                />
                {confirmPassword && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={isLoading}
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

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={isLoading || newPassword.length < 12 || !confirmPassword}
              aria-disabled={isLoading || newPassword.length < 12 || !confirmPassword}
              aria-busy={isLoading}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Resetting password…</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="flex justify-start mt-4">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                aria-disabled={isLoading}
                className="text-xs text-text-muted hover:text-text-main underline transition-colors font-medium cursor-pointer text-left"
              >
                Cancel recovery
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 3: BACKUP NEW PHRASE */}
      {step === 'NEW_PHRASE' && (
        <div
          role="region"
          aria-label={STEP_LABELS.NEW_PHRASE}
          className="space-y-4 animate-in slide-in-from-right-2"
        >
          <p role="alert" className="text-xs text-danger font-semibold text-left tracking-wide">
            Warning: Your old phrase is invalid. Save this new backup immediately.
          </p>

          <div className="p-4 bg-surface border border-border rounded-lg relative group">
            <p
              id={newPhraseId}
              className="font-mono text-xs leading-relaxed text-text-main wrap-break-word select-all text-left pr-8"
            >
              {newPhrase}
            </p>

            {/* Visually hidden live region announces copy state to screen readers.
                aria-live must not sit on the button itself — it needs its own node. */}
            <span role="status" aria-live="polite" className="sr-only">
              {copied ? 'Copied to clipboard' : ''}
            </span>

            <button
              type="button"
              onClick={copyToClipboard}
              aria-describedby={newPhraseId}
              aria-label={copied ? 'Copied to clipboard' : 'Copy recovery phrase to clipboard'}
              className="absolute top-3 right-3 p-1.5 bg-background border border-border rounded-md text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success stroke-[3]" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStatus('UNLOCKED')}
            className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
          >
            I have saved my new phrase
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
