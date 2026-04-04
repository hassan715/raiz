import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Plus, Globe, Key, ShieldAlert } from 'lucide-react';
import { Account } from '../../types';

export default function VaultDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts from the active memory in Rust
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await invoke<Account[]>('get_accounts');
        setAccounts(data);
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setIsLoading(false);
      }
    }
    loadAccounts();
  }, []);

  // Filter logic for the search bar
  const filteredAccounts = accounts.filter(acc => 
    acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Header & Action Bar */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <h2 className="text-2xl font-bold text-text-main tracking-tight">All Vaults</h2>
        <button className="flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
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
            placeholder="Search accounts, usernames, or emails..."
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
              {searchQuery ? "Try adjusting your search terms." : "Get started by adding your first password."}
            </p>
          </div>
        ) : (
          /* The Account Grid/List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((account) => (
              <div 
                key={account.id} 
                className="group p-4 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-main">{account.account_name}</h3>
                      <p className="text-xs text-text-muted truncate max-w-[150px]">
                        {account.username || account.email || 'No username'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}