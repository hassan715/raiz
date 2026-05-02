import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../../context/VaultContext';
import {
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Copy,
  CheckCircle2,
  User,
} from 'lucide-react';

export default function SetupForm() {
  const { setStatus } = useVault();

  // Form State
  const [profileName, setProfileName] = useState(''); // NEW STATE
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Recovery State
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profileName.trim()) {
      setError('Please provide a name for your profile.');
      return;
    }
    if (password.length < 12) {
      setError('Master Password must be at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Tell Rust to mathematically generate the vault and KEK/DEK
      // NEW: Pass the profileName to the backend command
      const phrase = await invoke<string>('create_vault', {
        password,
        profileName,
      });

      // 2. Display the phrase to the user
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
    // 3. Force the user to the Login screen to prove they remember their password
    setStatus('LOCKED');
  };

  // --- VIEW 2: The Recovery Phrase Screen ---
  if (recoveryPhrase) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-surface border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-text-main">Emergency Recovery Phrase</h2>
          <p className="text-sm text-text-muted mt-2">
            If you forget your Master Password, this 24-word phrase is the <b>only</b> way to
            recover your vault. We cannot reset it for you.
          </p>
        </div>

        <div className="bg-background border border-border rounded-lg p-4 mb-6 relative group">
          <p className="font-mono text-sm leading-relaxed text-text-main break-words">
            {recoveryPhrase}
          </p>
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 p-2 bg-surface border border-border rounded-md text-text-muted hover:text-text-main transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        <button
          onClick={handleFinishSetup}
          className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors flex items-center justify-center"
        >
          <ShieldCheck className="w-5 h-5 mr-2" />I have safely stored this phrase
        </button>
      </div>
    );
  }

  // --- VIEW 1: The Password Creation Screen ---
  return (
    <div className="w-full max-w-md mx-auto p-8 bg-surface border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 bg-primary-muted rounded-full flex items-center justify-center mb-4">
          <Key className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text-main">Create Master Password</h2>
        <p className="text-sm text-text-muted mt-2">
          This password encrypts your entire device. Make it long, memorable, and do not lose it.
        </p>
      </div>

      <form onSubmit={handleCreateVault} className="space-y-4">
        {/* Profile Name Input */}
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1 flex items-center">
            <User className="w-4 h-4 mr-1.5" /> Profile Name
          </label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-main focus:outline-none focus:border-primary transition-colors"
            placeholder="e.g., John Doe"
            autoFocus
          />
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1 mt-2">
            Master Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-main focus:outline-none focus:border-primary transition-colors"
              placeholder="At least 12 characters..."
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-text-muted hover:text-text-main"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Input */}
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-main focus:outline-none focus:border-primary transition-colors"
            placeholder="Type it again..."
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
            <p className="text-sm text-danger text-center font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || !password || !confirmPassword || !profileName.trim()}
          className="w-full mt-6 py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Generating Cryptography...' : 'Create Vault'}
        </button>
      </form>
    </div>
  );
}
