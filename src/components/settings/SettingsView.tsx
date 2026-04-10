import { useState } from 'react';
import { Shield, Database, AlertTriangle } from 'lucide-react';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<'security' | 'data' | 'danger'>('security');

  return (
    <div className="flex h-full w-full animate-in fade-in">
      {/* Inner Settings Sidebar */}
      <div className="w-64 border-r border-border bg-surface p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-6 px-2 tracking-tight">Settings</h2>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
              activeTab === 'security'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
            }`}
          >
            <Shield className="w-4 h-4 mr-3" />
            Security
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
              activeTab === 'data'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
            }`}
          >
            <Database className="w-4 h-4 mr-3" />
            Data Management
          </button>

          <div className="pt-4 mt-4 border-t border-border">
            <button
              onClick={() => setActiveTab('danger')}
              className={`w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                activeTab === 'danger'
                  ? 'bg-danger/10 text-danger'
                  : 'text-text-muted hover:bg-danger/5 hover:text-danger'
              }`}
            >
              <AlertTriangle className="w-4 h-4 mr-3" />
              Danger Zone
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-2xl">
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div>
                <h3 className="text-lg font-medium mb-1">Security Settings</h3>
                <p className="text-sm text-text-muted mb-6">
                  Manage your master password and auto-lock preferences.
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-surface">
                <p className="text-sm text-text-muted">Auto-lock timer coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div>
                <h3 className="text-lg font-medium mb-1">Data Management</h3>
                <p className="text-sm text-text-muted mb-6">
                  Export an encrypted backup of your vault.
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-surface">
                <p className="text-sm text-text-muted">Export functionality coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div>
                <h3 className="text-lg font-medium text-danger mb-1">Danger Zone</h3>
                <p className="text-sm text-text-muted mb-6">Irreversible actions for your vault.</p>
              </div>
              <div className="p-4 border border-danger/20 rounded-lg bg-danger/5 cursor-pointer hover:bg-danger/10 transition-colors">
                <p className="text-sm text-danger font-medium">Delete Vault</p>
                <p className="text-xs text-danger/70 mt-1">
                  Permanently erase all data and reset the application.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
