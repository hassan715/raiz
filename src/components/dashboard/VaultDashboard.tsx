import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Key,
  ShieldAlert,
  Star,
  Archive,
  Fingerprint,
  Lock,
  FileText,
  CreditCard,
  User,
  Wallet,
  Filter,
  ArrowUpDown,
  Check,
  ChevronDown,
  Tag,
} from 'lucide-react';
import { MenuTrigger, Button, Popover, Menu, MenuItem, Separator } from 'react-aria-components';
import { Account } from '../../types';
import VaultItemForm from './VaultItemForm';
import BrandIcon from './BrandIcon';
import VaultItemDetail from './VaultItemDetail';

interface VaultDashboardProps {
  selectedVaultId: string | null;
  activeView: 'vaults' | 'settings' | 'archived' | 'favorites';
  searchQuery: string;
  isCreatingTrigger: boolean;
  resetCreatingTrigger: () => void;
  selectedTag: string | null;
}

export default function VaultDashboard({
  selectedVaultId,
  activeView,
  searchQuery,
  isCreatingTrigger,
  resetCreatingTrigger,
  selectedTag,
}: VaultDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Sort State
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'title' | 'created_at' | 'updated_at' | 'accessed_at'>(
    'updated_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Reset the type filter exclusively when the vault, tag, or main view changes
  useEffect(() => {
    setTypeFilter('All');
  }, [selectedVaultId, activeView, selectedTag]);

  const loadAccounts = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const data = await invoke<Account[]>('get_accounts');
      setAccounts(data);

      // Notify the Sidebar to recalculate active tags based on new data
      window.dispatchEvent(new Event('refresh-tags'));

      setSelectedAccount((current) => {
        if (!current) return null;
        return data.find((a) => a.id === current.id) || null;
      });
    } catch (error) {
      const err = error as Error;
      setError(err.toString());
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts(true);

    const handleVaultDeleted = () => loadAccounts(false);
    window.addEventListener('vault-deleted', handleVaultDeleted);

    const handleClearSelection = () => setSelectedAccount(null);
    window.addEventListener('clear-selected-account', handleClearSelection);

    return () => {
      window.removeEventListener('vault-deleted', handleVaultDeleted);
      window.removeEventListener('clear-selected-account', handleClearSelection);
    };
  }, [loadAccounts]);

  useEffect(() => {
    if (isCreatingTrigger) {
      setIsCreating(true);
      resetCreatingTrigger();
    }
  }, [isCreatingTrigger, resetCreatingTrigger]);

  const getSortValue = (acc: Account, field: string) => {
    if (field === 'title') return acc.account_name.toLowerCase();
    if (field === 'created_at') return acc.metadata.created_at;
    if (field === 'updated_at') return acc.metadata.updated_at;
    if (field === 'accessed_at') return acc.metadata.accessed_at;
    return 0;
  };

  const baseFilteredAccounts = accounts.filter((acc) => {
    const isArchived = !!acc.metadata.archived_at;

    if (activeView === 'archived') {
      if (!isArchived) return false;
    } else if (activeView === 'favorites') {
      if (isArchived || !acc.is_favorite) return false;
    } else {
      if (isArchived) return false;
      if (selectedVaultId && acc.vault_id !== selectedVaultId) return false;

      // Tag filter
      if (selectedTag && !acc.tags.includes(selectedTag)) return false;
    }

    const searchLower = searchQuery.toLowerCase();

    if (acc.account_name.toLowerCase().includes(searchLower)) return true;
    if (acc.tags.some((tag) => tag.toLowerCase().includes(searchLower))) return true;

    if (acc.account_type === 'Login') {
      if (acc.username?.toLowerCase().includes(searchLower)) return true;
      if (acc.email?.toLowerCase().includes(searchLower)) return true;
    } else if (acc.account_type === 'Password') {
      if (acc.identifier?.toLowerCase().includes(searchLower)) return true;
    } else if (acc.account_type === 'Identity') {
      if (acc.id_number?.toLowerCase().includes(searchLower)) return true;
    }

    return false;
  });

  const availableTypes = [
    'All',
    ...Array.from(new Set(baseFilteredAccounts.map((a) => a.account_type))),
  ];

  const filteredAccounts = baseFilteredAccounts
    .filter((acc) => typeFilter === 'All' || acc.account_type === typeFilter)
    .sort((a, b) => {
      const valA = getSortValue(a, sortField);
      const valB = getSortValue(b, sortField);

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const getAccountSubtitle = (account: Account): string => {
    switch (account.account_type) {
      case 'Login':
        return account.username || account.email || 'Login';
      case 'Password':
        return account.identifier || 'Password';
      case 'Credit Card':
        return 'Credit Card';
      case 'Identity':
        return account.id_number || 'Identity';
      case 'Crypto Wallet':
        return account.wallet_address
          ? `${account.wallet_address.substring(0, 8)}...`
          : 'Crypto Wallet';
      case 'Secure Note':
        return 'Secure Note';
      default:
        return 'Unknown';
    }
  };

  const renderItemIcon = (account: Account) => {
    switch (account.account_type) {
      case 'Password':
        return <Lock className="w-4 h-4 text-sky-500" />;
      case 'Secure Note':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'Credit Card':
        return <CreditCard className="w-4 h-4 text-indigo-500" />;
      case 'Identity':
        return <User className="w-4 h-4 text-amber-500" />;
      case 'Crypto Wallet':
        return <Wallet className="w-4 h-4 text-orange-500" />;
      case 'Login':
      default:
        return <BrandIcon name={account.account_name} className="w-4 h-4" useBrandColor={false} />;
    }
  };

  return (
    <div className="flex flex-row h-full w-full bg-background overflow-hidden select-none">
      {/* ============================================================== */}
      {/* MIDDLE PANE: CATEGORY ITEM LIST                                */}
      {/* ============================================================== */}
      <div className="w-64 flex flex-col h-full border-r border-border bg-background z-10 shrink-0 overflow-hidden">
        <header className="flex items-center justify-between px-2 h-12.5 shrink-0 bg-surface/30">
          <div className="flex items-center">
            {/* Dynamic Filter Menu (Left) */}
            <MenuTrigger>
              <Button
                aria-label="Filter items by type"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-semibold text-text-main hover:bg-text-main/5 transition-colors outline-none data-focus-visible:ring-2 data-focus-visible:ring-primary/60"
              >
                <Filter className="w-3.5 h-3.5 text-text-muted" />
                <span>{typeFilter === 'All' ? 'All Types' : typeFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted opacity-70" />
              </Button>
              <Popover
                placement="bottom start"
                className="w-48 bg-surface border border-border rounded-xl shadow-xl p-1.5 z-50 data-entering:animate-in data-[entering]:fade-in data-[entering]:zoom-in-95 data-exiting:animate-out data-[exiting]:fade-out data-[exiting]:zoom-out-95 select-none"
              >
                <Menu
                  aria-label="Filter by type"
                  className="outline-none flex flex-col"
                  onAction={(key) => setTypeFilter(key as string)}
                >
                  {availableTypes.map((type) => (
                    <MenuItem
                      key={type}
                      id={type}
                      className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-primary/10 data-focused:text-primary transition-colors"
                    >
                      {type === 'All' ? 'All Types' : type}
                      {typeFilter === type && (
                        <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                      )}
                    </MenuItem>
                  ))}
                </Menu>
              </Popover>
            </MenuTrigger>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Sort Menu (Right) */}
            <MenuTrigger>
              <Button
                aria-label="Sort items"
                className="p-1.5 rounded-md text-text-muted hover:bg-text-main/10 hover:text-text-main transition-colors outline-none data-focus-visible:ring-2 data-focus-visible:ring-primary/60"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
              <Popover
                placement="bottom end"
                className="w-48 bg-surface border border-border rounded-xl shadow-xl p-1.5 z-50 data-entering:animate-in data-[entering]:fade-in data-[entering]:zoom-in-95 data-exiting:animate-out data-[exiting]:fade-out data-[exiting]:zoom-out-95 select-none"
              >
                <div
                  id="sort-menu-heading"
                  className="px-3 pt-1.5 pb-2 text-xs font-bold text-text-muted tracking-wider"
                >
                  Sort By
                </div>
                <Menu aria-labelledby="sort-menu-heading" className="outline-none flex flex-col">
                  <MenuItem
                    onAction={() => setSortField('title')}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-primary/10 data-focused:text-primary transition-colors"
                  >
                    Title
                    {sortField === 'title' && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                    )}
                  </MenuItem>
                  <MenuItem
                    onAction={() => setSortField('created_at')}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-primary/10 data-focused:text-primary transition-colors"
                  >
                    Date Created
                    {sortField === 'created_at' && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                    )}
                  </MenuItem>
                  <MenuItem
                    onAction={() => setSortField('updated_at')}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-primary/10 data-focused:text-primary transition-colors"
                  >
                    Date Modified
                    {sortField === 'updated_at' && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                    )}
                  </MenuItem>
                  <MenuItem
                    onAction={() => setSortField('accessed_at')}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-primary/10 data-focused:text-primary transition-colors"
                  >
                    Date Accessed
                    {sortField === 'accessed_at' && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                    )}
                  </MenuItem>

                  <Separator className="h-px bg-border my-1.5 mx-2" />

                  <MenuItem
                    onAction={() => setSortOrder('asc')}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-primary/10 data-focused:text-primary transition-colors"
                  >
                    {sortField === 'title' ? 'A to Z' : 'Oldest First'}
                    {sortOrder === 'asc' && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                    )}
                  </MenuItem>
                  <MenuItem
                    onAction={() => setSortOrder('desc')}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-primary/10 data-focused:text-primary transition-colors"
                  >
                    {sortField === 'title' ? 'Z to A' : 'Newest First'}
                    {sortOrder === 'desc' && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                    )}
                  </MenuItem>
                </Menu>
              </Popover>
            </MenuTrigger>
          </div>
        </header>

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
              ) : selectedTag ? (
                <Tag className="w-6 h-6 mb-2 opacity-30" />
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
                        ? 'bg-primary/5 border-primary ring-0 ring-primary shadow-sm'
                        : 'bg-surface border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'bg-background border border-border text-text-muted group-hover:text-primary'}`}
                      >
                        {renderItemIcon(account)}
                      </div>
                      <div className="overflow-hidden">
                        <h3
                          className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-text-main'}`}
                        >
                          {account.account_name}
                        </h3>
                        <p className="text-xs text-text-muted truncate max-w-120px">
                          {getAccountSubtitle(account)}
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
      {/* RIGHT PANE: ITEM DETAILS PREVIEW                               */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col h-full bg-surface min-w-0 relative overflow-hidden">
        {selectedAccount ? (
          <VaultItemDetail
            account={selectedAccount}
            onClose={() => setSelectedAccount(null)}
            onDeleted={() => {
              setSelectedAccount(null);
              loadAccounts(false);
            }}
            onUpdated={() => {
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

      {/* SECURE OVERLAYS */}
      <VaultItemForm
        isOpen={isCreating || !!editingAccount}
        initialData={editingAccount}
        defaultVaultId={selectedVaultId}
        onClose={() => {
          setIsCreating(false);
          setEditingAccount(null);
        }}
        onSaved={() => loadAccounts(false)}
      />
    </div>
  );
}
