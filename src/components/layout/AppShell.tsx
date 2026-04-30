import React, { useState, useEffect } from 'react';
import { Shield, Key, Settings, Lock, Folder, Plus, X, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { InnerVault } from '../../types';

interface AppShellProps {
  children: React.ReactNode;
  activeView: 'vaults' | 'settings';
  setActiveView: (view: 'vaults' | 'settings') => void;
  selectedVaultId: string | null;
  setSelectedVaultId: (id: string | null) => void;
}

export default function AppShell({
  children,
  activeView,
  setActiveView,
  selectedVaultId,
  setSelectedVaultId,
}: AppShellProps) {
  const [vaults, setVaults] = useState<InnerVault[]>([]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultDescription, setNewVaultDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    invoke<InnerVault[]>('get_vaults').then(setVaults).catch(console.error);
  }, [activeView]);

  const handleCreateVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultName.trim()) return;

    setIsCreating(true);
    try {
      // Send the name and the optional description to Rust
      await invoke('create_inner_vault', {
        name: newVaultName,
        description: newVaultDescription,
      });

      const updated = await invoke<InnerVault[]>('get_vaults');
      setVaults(updated);

      // Reset and close modal
      setIsCreateModalOpen(false);
      setNewVaultName('');
      setNewVaultDescription('');
    } catch (error) {
      console.error('Failed to create vault', error);
      alert('Failed to create vault.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-text-main overflow-hidden">
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col z-10">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Shield className="w-6 h-6 text-primary mr-3" />
          <h1 className="text-lg font-semibold tracking-wide">Raiz</h1>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {/* Main Views */}
          <button
            onClick={() => {
              setActiveView('vaults');
              setSelectedVaultId(null);
            }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'vaults' && selectedVaultId === null
                ? 'bg-primary-muted text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-main'
            }`}
          >
            <Key className="w-4 h-4 mr-3" />
            All Vaults
          </button>

          {/* Dynamic Vault List Header with + Button */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              My Vaults
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-1 text-text-muted hover:text-primary hover:bg-surface rounded-md transition-colors"
              title="Create New Vault"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {vaults.map((vault) => (
            <button
              key={vault.id}
              onClick={() => {
                setActiveView('vaults');
                setSelectedVaultId(vault.id);
              }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'vaults' && selectedVaultId === vault.id
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-muted hover:bg-surface hover:text-text-main'
              }`}
            >
              <Folder className="w-4 h-4 mr-3" />
              {vault.name}
            </button>
          ))}

          {/* Settings Spacer */}
          <div className="pt-4 mt-4 border-t border-border">
            <button
              onClick={() => setActiveView('settings')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'settings'
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-muted hover:bg-surface hover:text-text-main'
              }`}
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </button>
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-text-muted hover:bg-surface hover:text-text-main transition-colors">
            <Lock className="w-4 h-4 mr-2" />
            Lock Raiz
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">{children}</main>

      {/* CREATE VAULT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCreateModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-main">Create New Vault</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-main rounded-md hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVaultSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Vault Name *
                </label>
                <input
                  type="text"
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g., Work, Finance, Travel"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newVaultDescription}
                  onChange={(e) => setNewVaultDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder="What is this vault for?"
                  rows={3}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-main hover:bg-background border border-transparent rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newVaultName.trim()}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
