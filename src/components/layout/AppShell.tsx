import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Settings, Folder, Plus, X, ChevronDown, LogOut, Archive, Star } from 'lucide-react';
import { InnerVault, Account } from '../../types';
import { useVault } from '../../context/VaultContext';

interface AppShellProps {
  children: React.ReactNode;
  activeView: 'vaults' | 'settings' | 'archived' | 'favorites';
  setActiveView: (view: 'vaults' | 'settings' | 'archived' | 'favorites') => void;
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
  const { lockVault } = useVault();
  const [vaults, setVaults] = useState<InnerVault[]>([]);
  const [profileName, setProfileName] = useState('My Vault');

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultDescription, setNewVaultDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    vault: InnerVault;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vaultToEdit, setVaultToEdit] = useState<InnerVault | null>(null);
  const [editVaultName, setEditVaultName] = useState('');
  const [editVaultDescription, setEditVaultDescription] = useState('');
  const [editError, setEditError] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [vaultToDelete, setVaultToDelete] = useState<InnerVault | null>(null);
  const [vaultToDeleteItemCount, setVaultToDeleteItemCount] = useState(0);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchVaults();
    invoke<string>('get_profile_name').then(setProfileName).catch(console.error);
  }, [activeView]);

  const fetchVaults = () => {
    invoke<InnerVault[]>('get_vaults').then(setVaults).catch(console.error);
  };

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleCreateVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const trimmedName = newVaultName.trim();
    if (!trimmedName) return;

    if (vaults.some((v) => v.name.toLowerCase() === trimmedName.toLowerCase())) {
      setCreateError(`A vault named '${trimmedName}' already exists.`);
      return;
    }

    setIsCreating(true);
    try {
      await invoke('create_inner_vault', { name: trimmedName, description: newVaultDescription });
      fetchVaults();
      setIsCreateModalOpen(false);
      setNewVaultName('');
      setNewVaultDescription('');
    } catch (error) {
      setCreateError(error as string);
    } finally {
      setIsCreating(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, vault: InnerVault) => {
    e.preventDefault();
    if (vault.id === '00000000-0000-0000-0000-000000000000') return;
    setContextMenu({ x: e.clientX, y: e.clientY, vault });
  };

  const openEditModal = () => {
    if (!contextMenu) return;
    setVaultToEdit(contextMenu.vault);
    setEditVaultName(contextMenu.vault.name);
    setEditVaultDescription(contextMenu.vault.description || '');
    setEditError('');
    setIsEditModalOpen(true);
    setContextMenu(null);
  };

  const openDeleteModal = async () => {
    if (!contextMenu) return;
    const vault = contextMenu.vault;
    setVaultToDelete(vault);
    setConfirmDeleteName('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
    setContextMenu(null);

    try {
      const allAccounts = await invoke<Account[]>('get_accounts');
      const count = allAccounts.filter((acc) => acc.vault_id === vault.id).length;
      setVaultToDeleteItemCount(count);
    } catch (e) {
      console.error(e);
      setVaultToDeleteItemCount(0);
    }
  };

  const handleEditVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultToEdit) return;
    setEditError('');
    const trimmedName = editVaultName.trim();

    if (
      vaults.some(
        (v) => v.id !== vaultToEdit.id && v.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setEditError(`A vault named '${trimmedName}' already exists.`);
      return;
    }

    setIsCreating(true);
    try {
      await invoke('edit_inner_vault', {
        id: vaultToEdit.id,
        name: trimmedName,
        description: editVaultDescription,
      });
      fetchVaults();
      setIsEditModalOpen(false);
    } catch (error) {
      setEditError(error as string);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteVault = async () => {
    if (!vaultToDelete) return;
    setDeleteError('');
    setIsCreating(true);
    try {
      await invoke('delete_inner_vault', { id: vaultToDelete.id });

      if (selectedVaultId === vaultToDelete.id) {
        setSelectedVaultId(null);
      }

      fetchVaults();
      setIsDeleteModalOpen(false);

      // Dispatch custom event to trigger dashboard refresh without locking the app
      window.dispatchEvent(new Event('vault-deleted'));
    } catch (error) {
      setDeleteError(error as string);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-text-main overflow-hidden">
      <aside className="w-52 bg-sidebar border-r border-border flex flex-col z-10 relative">
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full h-16 flex items-center justify-between px-4 border-b border-border hover:bg-surface transition-colors cursor-pointer"
          >
            <div className="flex items-center overflow-hidden">
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold mr-3 shrink-0">
                {profileName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold truncate tracking-wide text-text-main">
                {profileName}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-text-muted transition-transform shrink-0 ml-2 ${isProfileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute top-14 left-2 right-2 bg-surface border border-border rounded-lg shadow-xl px-2 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => {
                  setActiveView('settings');
                  setIsProfileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm text-text-main hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-4 h-4 mr-3 text-text-muted " /> Settings
              </button>
              <div className="h-px bg-border my-1.5" />
              <button
                onClick={lockVault}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm text-text-main hover:bg-gray-200 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3 text-text-muted" /> Lock Raiz
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
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
            <Key className="w-4 h-4 mr-3" /> All Vaults
          </button>

          <button
            onClick={() => {
              setActiveView('favorites');
              setSelectedVaultId(null);
            }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'favorites'
                ? 'bg-primary-muted text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-main'
            }`}
          >
            <Star className="w-4 h-4 mr-3" /> Favorites
          </button>

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
              onContextMenu={(e) => handleContextMenu(e, vault)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'vaults' && selectedVaultId === vault.id
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-muted hover:bg-surface hover:text-text-main'
              }`}
            >
              <Folder className="w-4 h-4 mr-3" /> {vault.name}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => {
              setActiveView('archived');
              setSelectedVaultId(null);
            }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'archived'
                ? 'bg-primary-muted text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-main'
            }`}
          >
            <Archive className="w-4 h-4 mr-3" /> Archived
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-y-auto">{children}</main>

      {/* --- CUSTOM RIGHT CLICK CONTEXT MENU --- */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-60 w-40 bg-surface border border-border rounded-lg shadow-xl p-1 animate-in fade-in slide-in-from-top-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 mb-1 border-b border-border">
            <p className="text-xs font-medium text-text-muted truncate">
              Vault: {contextMenu.vault.name}
            </p>
          </div>
          <button
            onClick={openEditModal}
            className="w-full text-left px-2 py-1.5 text-sm text-text-main hover:bg-gray-200 rounded-md transition-colors"
          >
            Edit Details
          </button>
          <button
            onClick={openDeleteModal}
            className="w-full text-left px-2 py-1.5 text-sm text-text-main hover:bg-gray-200 rounded-md transition-colors"
          >
            Delete Vault
          </button>
        </div>
      )}

      {/* --- EDIT VAULT MODAL --- */}
      {isEditModalOpen && vaultToEdit && (
        <div className="fixed inset-0 z-70 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-main">Edit Vault</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-main rounded-md hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditVaultSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Vault Name *
                </label>
                <input
                  type="text"
                  value={editVaultName}
                  onChange={(e) => {
                    setEditVaultName(e.target.value);
                    setEditError('');
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={editVaultDescription}
                  onChange={(e) => setEditVaultDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors resize-none"
                  rows={3}
                />
              </div>
              {editError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md">
                  <p className="text-sm text-danger font-medium text-center">{editError}</p>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-main hover:bg-background border border-transparent rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !editVaultName.trim()}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE VAULT WARNING MODAL --- */}
      {isDeleteModalOpen && vaultToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="relative bg-surface border border-danger/30 shadow-2xl rounded-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-danger mb-4">Delete Vault?</h3>
            <p className="text-sm text-text-main mb-6 leading-relaxed">
              This vault and its {vaultToDeleteItemCount} items will be permanently deleted.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-muted mb-2">
                Please type <strong>{vaultToDelete.name}</strong> to confirm.
              </label>
              <input
                type="text"
                value={confirmDeleteName}
                onChange={(e) => setConfirmDeleteName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-danger transition-colors"
                placeholder={vaultToDelete.name}
                autoFocus
              />
            </div>

            {deleteError && <p className="text-sm text-danger mb-4 text-center">{deleteError}</p>}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-text-main hover:bg-background rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVault}
                disabled={isCreating || confirmDeleteName !== vaultToDelete.name}
                className="px-4 py-2 bg-danger text-white text-sm font-bold rounded-md hover:bg-danger/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isCreating ? 'Deleting...' : 'Permanently delete vault'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE VAULT MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setIsCreateModalOpen(false);
              setCreateError('');
            }}
          />
          <div className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-main">Create New Vault</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreateError('');
                }}
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
                  onChange={(e) => {
                    setNewVaultName(e.target.value);
                    setCreateError('');
                  }}
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
              {createError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md">
                  <p className="text-sm text-danger font-medium text-center">{createError}</p>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCreateError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-text-main hover:bg-background border border-transparent rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newVaultName.trim()}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
