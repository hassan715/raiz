import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Search,
  Plus,
  Key,
  ShieldAlert,
  Star,
  Archive,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Account, InnerVault } from '../../types';
import VaultItemForm from './VaultItemForm';
import BrandIcon from './BrandIcon';
import VaultItemDetail from './VaultItemDetail';

interface VaultDashboardProps {
  selectedVaultId: string | null;
  activeView: 'vaults' | 'settings' | 'archived'; // NEW: Added activeView to know what to display
}

export default function VaultDashboard({ selectedVaultId, activeView }: VaultDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Archive state
  const [accountToArchive, setAccountToArchive] = useState<Account | null>(null);
  const [vaultName, setVaultName] = useState('All Vaults');

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Account[]>('get_accounts');
      setAccounts(data);

      if (activeView === 'archived') {
        setVaultName('Archived Items');
      } else if (selectedVaultId) {
        const vaults = await invoke<InnerVault[]>('get_vaults');
        const active = vaults.find((v) => v.id === selectedVaultId);
        setVaultName(active ? active.name : 'All Vaults');
      } else {
        setVaultName('All Vaults');
      }
    } catch (error) {
      const err = error as Error;
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  }, [selectedVaultId, activeView]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Archive & Restore Handlers
  const confirmArchive = async () => {
    if (!accountToArchive) return;
    try {
      const updatedAccount = {
        ...accountToArchive,
        metadata: { ...accountToArchive.metadata, archived_at: Date.now() },
      };
      await invoke('save_account', { account: updatedAccount });
      setAccountToArchive(null);
      loadAccounts();
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const handleRestore = async (account: Account) => {
    try {
      const updatedAccount = {
        ...account,
        metadata: { ...account.metadata, archived_at: null },
      };
      await invoke('save_account', { account: updatedAccount });
      loadAccounts();
    } catch (err) {
      console.error('Failed to restore:', err);
    }
  };

  // Filter logic (Archived Status + Vault ID + Search Query)
  const filteredAccounts = accounts.filter((acc) => {
    const isArchived = !!acc.metadata.archived_at;

    // 1. Check View Status
    if (activeView === 'archived') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
      // 2. Check Vault (Only if we are in the active vaults view)
      if (selectedVaultId && acc.vault_id !== selectedVaultId) return false;
    }

    // 3. Check Search string
    const matchesSearch =
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const favoriteAccounts = filteredAccounts.filter((acc) => acc.is_favorite);
  const regularAccounts = filteredAccounts.filter((acc) => !acc.is_favorite);

  return (
    <div className="flex flex-col h-full bg-background relative">
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <h2 className="text-2xl font-bold text-text-main tracking-tight">{vaultName}</h2>
        {activeView !== 'archived' && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </button>
        )}
      </header>

      <div className="px-8 py-4 border-b border-border bg-surface/30">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search accounts, usernames, tags, or emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-md text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <ShieldAlert className="w-12 h-12 text-danger mb-4" />
            <p className="text-danger font-medium">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted border-2 border-dashed border-border rounded-xl">
            {activeView === 'archived' ? (
              <Archive className="w-12 h-12 mb-4 opacity-50" />
            ) : (
              <Key className="w-12 h-12 mb-4 opacity-50" />
            )}
            <p className="text-lg font-medium text-text-main mb-1">
              {activeView === 'archived' ? 'No archived items' : 'No items found'}
            </p>
            <p className="text-sm text-text-muted mb-4">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : activeView === 'archived'
                  ? 'Items you archive will appear here safely out of the way.'
                  : 'Get started by adding your first password.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {favoriteAccounts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                  Favorites
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteAccounts.map((account) => (
                    <div
                      key={account.id}
                      onClick={() => setSelectedAccount(account)}
                      className="group relative p-4 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer shadow-sm"
                    >
                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                        {activeView === 'archived' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(account);
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-background rounded-md transition-all text-text-muted hover:text-success"
                            title="Restore"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAccountToArchive(account);
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-background rounded-md transition-all text-text-muted hover:text-warning"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <Star className="w-4 h-4 text-warning fill-warning opacity-80 m-1.5" />
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-text-muted group-hover:text-primary transition-colors overflow-hidden shrink-0">
                            <BrandIcon name={account.account_name} className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-text-main pr-16 truncate">
                              {account.account_name}
                            </h3>
                            <p className="text-xs text-text-muted truncate max-w-[150px]">
                              {account.username || account.email || account.account_type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {regularAccounts.length > 0 && (
              <div>
                {favoriteAccounts.length > 0 && (
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                    All Items
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularAccounts.map((account) => (
                    <div
                      key={account.id}
                      onClick={() => setSelectedAccount(account)}
                      className="group relative p-4 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer shadow-sm"
                    >
                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                        {activeView === 'archived' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(account);
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-background rounded-md transition-all text-text-muted hover:text-success"
                            title="Restore"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAccountToArchive(account);
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-background rounded-md transition-all text-text-muted hover:text-warning"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-text-muted group-hover:text-primary transition-colors overflow-hidden shrink-0">
                            <BrandIcon name={account.account_name} className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-text-main pr-10 truncate">
                              {account.account_name}
                            </h3>
                            <p className="text-xs text-text-muted truncate max-w-[150px]">
                              {account.username || account.email || account.account_type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <VaultItemForm
        isOpen={isCreating || !!editingAccount}
        initialData={editingAccount}
        defaultVaultId={selectedVaultId}
        onClose={() => {
          setIsCreating(false);
          setEditingAccount(null);
        }}
        onSaved={loadAccounts}
      />

      <VaultItemDetail
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onDeleted={() => {
          setSelectedAccount(null);
          loadAccounts();
        }}
        onUpdated={() => {
          loadAccounts();
          invoke<Account[]>('get_accounts').then((data) => {
            const updated = data.find((a) => a.id === selectedAccount?.id);
            if (updated) setSelectedAccount(updated);
          });
        }}
        onEditRequest={(acc) => {
          setSelectedAccount(null);
          setEditingAccount(acc);
        }}
      />

      {/* ARCHIVE CONFIRMATION MODAL */}
      {accountToArchive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setAccountToArchive(null)}
          />
          <div className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center mb-4 text-warning">
              <AlertTriangle className="w-6 h-6 mr-3" />
              <h3 className="text-lg font-semibold text-text-main">Archive Item?</h3>
            </div>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Are you sure you want to archive <strong>{accountToArchive.account_name}</strong>? It
              will be moved to the Archived folder and hidden from your main vaults.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setAccountToArchive(null)}
                className="px-4 py-2 text-sm font-medium text-text-main hover:bg-background rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                className="px-4 py-2 bg-warning text-white text-sm font-medium rounded-md hover:bg-warning/90 transition-colors shadow-sm"
              >
                Archive Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
