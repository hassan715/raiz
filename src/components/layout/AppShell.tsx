import React from 'react';
import { Shield, Key, Settings, Lock } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  activeView: 'vaults' | 'settings';
  setActiveView: (view: 'vaults' | 'settings') => void;
}

export default function AppShell({ children, activeView, setActiveView }: AppShellProps) {
  return (
    <div className="flex h-screen w-full bg-background text-text-main overflow-hidden">
      {/* THE SIDEBAR
        Fixed width, distinct background color, separated by a crisp border.
      */}
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Shield className="w-6 h-6 text-primary mr-3" />
          <h1 className="text-lg font-semibold tracking-wide">Raiz</h1>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          <button
            onClick={() => setActiveView('vaults')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'vaults'
                ? 'bg-primary-muted text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-main'
            }`}
          >
            <Key className="w-4 h-4 mr-3" />
            All Vaults
          </button>

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
        </nav>

        {/* Footer Actions (Lock Vault) */}
        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-text-muted hover:bg-surface hover:text-text-main transition-colors">
            <Lock className="w-4 h-4 mr-2" />
            Lock Raiz
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA
        This is where the passwords, settings, or unlock screens will render.
      */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">{children}</main>
    </div>
  );
}
