import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Plus, Key, ShieldAlert, Star } from 'lucide-react';
import { Account } from '../../types';
import VaultItemForm from './VaultItemForm';
import BrandIcon from './BrandIcon';
import VaultItemDetail from './VaultItemDetail';

export default function VaultDashboard() {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Account[]>('get_accounts');
      setAccounts(data);
    } catch (error) {
      const err = error as Error;
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Filter logic for the search bar
  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) // Search tags too!
  );

  // Split into Favorites and Regular accounts
  const favoriteAccounts = filteredAccounts.filter((acc) => acc.is_favorite);
  const regularAccounts = filteredAccounts.filter((acc) => !acc.is_favorite);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Top Header & Action Bar */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <h2 className="text-2xl font-bold text-text-main tracking-tight">All Vaults</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Item
        </button>
      </header>

      {/* Search Bar */}
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

      {/* Content Area */}
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
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-64 text-text-muted border-2 border-dashed border-border rounded-xl">
            <Key className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium text-text-main mb-1">No items found</p>
            <p className="text-sm text-text-muted mb-4">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Get started by adding your first password.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Favorites Section */}
            {favoriteAccounts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                  Favorites
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteAccounts.map((account) => (
                    <div
                      key={account.id}
                      onClick={() => setSelectedAccount(account)} // Add this line!
                      className="group relative p-4 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer shadow-sm"
                    >
                      {/* Golden Star Indicator */}
                      <Star className="absolute top-3 right-3 w-4 h-4 text-warning fill-warning opacity-80" />

                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-text-muted group-hover:text-primary transition-colors overflow-hidden">
                            {/* We pass useBrandColor=false by default to keep the clean, unified dark mode look,
                            but you can flip it to true if you want colorful logos! */}
                            <BrandIcon name={account.account_name} className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-text-main pr-6">
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

            {/* All Items Section */}
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
                      onClick={() => setSelectedAccount(account)} // Add this line!
                      className="group relative p-4 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-text-muted group-hover:text-primary transition-colors overflow-hidden">
                            {/* We pass useBrandColor=false by default to keep the clean, unified dark mode look,
                            but you can flip it to true if you want colorful logos! */}
                            <BrandIcon name={account.account_name} className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-text-main">
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

      {/* Slide-out Form Panel (Handles both Create and Edit) */}
      <VaultItemForm
        isOpen={isCreating || !!editingAccount}
        initialData={editingAccount}
        onClose={() => {
          setIsCreating(false);
          setEditingAccount(null);
        }}
        onSaved={loadAccounts}
      />

      {/* Slide-out Detail Panel for Viewing */}
      <VaultItemDetail
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onDeleted={() => {
          setSelectedAccount(null);
          loadAccounts();
        }}
        onUpdated={() => {
          // Refresh the grid behind the panel, and update the panel's data
          loadAccounts();
          // Re-fetch the selected account from the updated list to refresh the panel
          invoke<Account[]>('get_accounts').then((data) => {
            const updated = data.find((a) => a.id === selectedAccount?.id);
            if (updated) setSelectedAccount(updated);
          });
        }}
        onEditRequest={(acc) => {
          setSelectedAccount(null); // Close detail view
          setEditingAccount(acc); // Open edit form
        }}
      />
    </div>
  );
}
