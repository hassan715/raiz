import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Plus, Key, ShieldAlert, Star, Archive, Fingerprint } from 'lucide-react';
import { Account, InnerVault } from '../../types';
import VaultItemForm from './VaultItemForm';
import BrandIcon from './BrandIcon';
import VaultItemDetail from './VaultItemDetail';

interface VaultDashboardProps {
  selectedVaultId: string | null;
  activeView: 'vaults' | 'settings' | 'archived' | 'favorites';
}

export default function VaultDashboard({ selectedVaultId, activeView }: VaultDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vaultName, setVaultName] = useState('All Vaults');

  const loadAccounts = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setIsLoading(true);
      try {
        const data = await invoke<Account[]>('get_accounts');
        setAccounts(data);

        // FIX: Safely auto-sync the selected item with the fresh data from the backend.
        // Because we use the `(current) =>` callback, this prevents the race condition
        // where closing a pane and refreshing data happen at the exact same time.
        setSelectedAccount((current) => {
          if (!current) return null;
          return data.find((a) => a.id === current.id) || null;
        });

        if (activeView === 'archived') {
          setVaultName('Archived Items');
        } else if (activeView === 'favorites') {
          setVaultName('Favorites');
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
        if (showSpinner) setIsLoading(false);
      }
    },
    [selectedVaultId, activeView]
  );

  useEffect(() => {
    // Show spinner on initial load or view change
    loadAccounts(true);

    // Silently refresh when a vault is deleted from the sidebar
    const handleVaultDeleted = () => loadAccounts(false);
    window.addEventListener('vault-deleted', handleVaultDeleted);

    return () => {
      window.removeEventListener('vault-deleted', handleVaultDeleted);
    };
  }, [loadAccounts]);

  const filteredAccounts = accounts.filter((acc) => {
    const isArchived = !!acc.metadata.archived_at;

    if (activeView === 'archived') {
      if (!isArchived) return false;
    } else if (activeView === 'favorites') {
      if (isArchived || !acc.is_favorite) return false;
    } else {
      if (isArchived) return false;
      if (selectedVaultId && acc.vault_id !== selectedVaultId) return false;
    }

    const matchesSearch =
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="flex flex-row h-full w-full bg-background overflow-hidden">
      {/* ============================================================== */}
      {/* MIDDLE PANE: ITEM LIST (Fixed to w-64 / 256px)                 */}
      {/* ============================================================== */}
      <div className="w-64 flex flex-col h-full border-r border-border bg-background z-10 shrink-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-5 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-text-main tracking-tight truncate pr-2">
            {vaultName}
          </h2>
          {activeView !== 'archived' && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center px-2 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </button>
          )}
        </header>

        <div className="px-4 py-3 border-b border-border bg-surface/30 shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-md text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {error ? (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted">
              <ShieldAlert className="w-8 h-8 text-danger mb-3" />
              <p className="text-sm text-danger font-medium text-center">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted text-center px-2 border-2 border-dashed border-border rounded-xl mt-2">
              {activeView === 'archived' ? (
                <Archive className="w-6 h-6 mb-2 opacity-30" />
              ) : activeView === 'favorites' ? (
                <Star className="w-6 h-6 mb-2 opacity-30 text-warning" />
              ) : (
                <Key className="w-6 h-6 mb-2 opacity-30" />
              )}
              <p className="text-sm font-medium text-text-main mb-1">No items</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-1.5">
              {filteredAccounts.map((account) => {
                const isSelected = selectedAccount?.id === account.id;
                return (
                  <div
                    key={account.id}
                    onClick={() => setSelectedAccount(account)}
                    className={`group relative p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/5 border-primary ring-1 ring-primary shadow-sm'
                        : 'bg-surface border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'bg-background border border-border text-text-muted group-hover:text-primary'}`}
                      >
                        <BrandIcon name={account.account_name} className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <h3
                          className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-text-main'}`}
                        >
                          {account.account_name}
                        </h3>
                        <p className="text-xs text-text-muted truncate max-w-[120px]">
                          {account.username || account.email || account.account_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0 pl-1">
                      {account.is_favorite && (
                        <Star className="w-3.5 h-3.5 text-warning fill-warning opacity-80" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT PANE: ITEM DETAILS (Fills remaining space, min 320px)    */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col h-full bg-surface min-w-[320px] relative shrink-0">
        {selectedAccount ? (
          <VaultItemDetail
            account={selectedAccount}
            onClose={() => setSelectedAccount(null)}
            onDeleted={() => {
              setSelectedAccount(null);
              loadAccounts(false);
            }}
            onUpdated={() => {
              // FIX: Removed the redundant invoke() here.
              // loadAccounts(false) handles updating the selected item automatically now!
              loadAccounts(false);
            }}
            onEditRequest={(acc) => {
              setEditingAccount(acc);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-text-muted p-12 text-center">
            <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center mb-4">
              <Fingerprint className="w-8 h-8 text-primary opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-2">No Item Selected</h3>
            <p className="text-sm text-text-muted max-w-sm leading-relaxed">
              Select an item from the list to view its secure details, edit properties, or manage
              its settings.
            </p>
          </div>
        )}
      </div>

      {/* Modals overlay the entire screen (z-[60] and above) */}
      <VaultItemForm
        isOpen={isCreating || !!editingAccount}
        initialData={editingAccount}
        defaultVaultId={selectedVaultId}
        onClose={() => {
          setIsCreating(false);
          setEditingAccount(null);
        }}
        onSaved={() => loadAccounts(false)} // Silent refresh after saving an edit/creation
      />
    </div>
  );
}
