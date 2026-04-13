import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../../context/VaultContext';
import { ShieldAlert, ArrowRight, Loader2, Copy, Check } from 'lucide-react';

interface RecoveryFormProps {
  onBack: () => void;
}

export default function RecoveryForm({ onBack }: RecoveryFormProps) {
  const { setStatus } = useVault();
  const [step, setStep] = useState<'PHRASE' | 'NEW_PASSWORD' | 'NEW_PHRASE'>('PHRASE');

  // Step 1: Phrase
  const [phrase, setPhrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2: New Password
  const [newPassword, setNewPassword] = useState('');
  const [newPhrase, setNewPhrase] = useState('');

  // Step 3: Copy State
  const [copied, setCopied] = useState(false);

  const handleVerifyPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await invoke('unlock_with_recovery', { phrase: phrase.trim() });
      setStep('NEW_PASSWORD');
    } catch (err) {
      setError('Invalid recovery phrase. Please check your spelling and spacing.');
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
    <div className="min-h-screen flex items-center justify-center bg-background text-text-main p-4 animate-in fade-in">
      <div className="w-full max-w-md p-8 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-danger/10 text-danger rounded-full">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-center tracking-tight mb-2">Vault Recovery</h2>

        {step === 'PHRASE' && (
          <form
            onSubmit={handleVerifyPhrase}
            className="space-y-6 animate-in slide-in-from-right-2"
          >
            <p className="text-sm text-center text-text-muted">
              Enter your 24-word recovery phrase separated by spaces.
            </p>

            <div>
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="word1 word2 word3..."
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-main focus:outline-none focus:border-primary text-sm min-h-[120px] resize-none"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-danger text-center bg-danger/10 p-2 rounded-md">{error}</p>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading || !phrase.trim()}
                className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Phrase'}
              </button>
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="w-full px-4 py-2 text-sm text-text-muted hover:text-text-main transition-colors"
              >
                Cancel and return to Login
              </button>
            </div>
          </form>
        )}

        {step === 'NEW_PASSWORD' && (
          <form
            onSubmit={handleResetPassword}
            className="space-y-6 animate-in slide-in-from-right-2"
          >
            <p className="text-sm text-center text-text-muted">
              Phrase verified. Please create a new Master Password to secure your vault.
            </p>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                New Master Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-main focus:outline-none focus:border-primary"
                placeholder="At least 12 characters"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-danger text-center bg-danger/10 p-2 rounded-md">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || newPassword.length < 12}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'NEW_PHRASE' && (
          <div className="space-y-6 animate-in slide-in-from-right-2">
            <div className="bg-danger/10 border border-danger/20 p-4 rounded-lg">
              <p className="text-sm text-danger font-medium text-center">
                Your old recovery phrase is now invalid.
              </p>
              <p className="text-xs text-danger/80 text-center mt-1">
                Write down this NEW 24-word phrase. It is the only way to recover your vault if you
                forget your new password.
              </p>
            </div>

            <div className="p-4 bg-background border border-border rounded-lg relative group">
              <p className="font-mono text-sm leading-relaxed text-text-main break-words">
                {newPhrase}
              </p>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-2 bg-surface border border-border rounded-md text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setStatus('UNLOCKED')}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
            >
              I have saved my new phrase
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
