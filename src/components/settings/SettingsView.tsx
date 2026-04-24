import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../../context/VaultContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  Database,
  AlertTriangle,
  Save,
  Download,
  Trash2,
  Loader2,
  Palette,
  Sun,
  Moon,
  Monitor,
  Tag,
  Plus,
  X,
} from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';

interface SettingsViewProps {
  lockTimeout: number;
  setLockTimeout: (minutes: number) => void;
}

export default function SettingsView({ lockTimeout, setLockTimeout }: SettingsViewProps) {
  const { setStatus } = useVault();
  const { theme, setTheme } = useTheme();
  // Removed 'tags' from the activeTab state
  const [activeTab, setActiveTab] = useState<'appearance' | 'security' | 'data' | 'danger'>(
    'appearance'
  );

  // --- Form States ---

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Delete Vault
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Global Tags
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isTagsLoading, setIsTagsLoading] = useState(false);

  // --- Handlers ---

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await invoke<string[]>('get_global_tags');
        setGlobalTags(tags);
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };
    fetchTags();
  }, []);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    setIsTagsLoading(true);
    try {
      await invoke('add_global_tag', { tag: newTagInput });
      const updated = await invoke<string[]>('get_global_tags');
      setGlobalTags(updated);
      setNewTagInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTagsLoading(false);
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    setIsTagsLoading(true);
    try {
      await invoke('delete_global_tag', { tag: tagToDelete });
      const updated = await invoke<string[]>('get_global_tags');
      setGlobalTags(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTagsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setPwdMessage({ type: 'error', text: 'New password must be at least 12 characters.' });
      return;
    }

    setIsChangingPwd(true);
    setPwdMessage(null);
    try {
      await invoke('change_master_password', { currentPassword, newPassword });
      setPwdMessage({ type: 'success', text: 'Master password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      const err = error as Error;
      setPwdMessage({ type: 'error', text: err.toString() || 'Failed to change password.' });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleExportVault = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      const suggestedFilename = `raiz_backup_${day}_${month}_${year}.enc`;

      const filePath = await save({
        filters: [{ name: 'Encrypted Vault', extensions: ['enc'] }],
        defaultPath: suggestedFilename,
      });

      if (!filePath) {
        setIsExporting(false);
        return;
      }

      await invoke('export_vault', { destinationPath: filePath });
      setExportMessage({ type: 'success', text: 'Vault exported successfully.' });
    } catch (error) {
      const err = error as Error;
      setExportMessage({ type: 'error', text: err.toString() || 'Failed to export vault.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteVault = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await invoke('delete_entire_vault');
      setStatus('SETUP');
    } catch (error) {
      const err = error as Error;
      alert(`Failed to delete vault: ${err.toString()}`);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full w-full animate-in fade-in">
      {/* Inner Settings Sidebar */}
      <div className="w-64 border-r border-border bg-surface p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-6 px-2 tracking-tight">Settings</h2>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
              activeTab === 'appearance'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
            }`}
          >
            <Palette className="w-4 h-4 mr-3" />
            Appearance
          </button>

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
            Data & Organization
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
          {/* ================= APPEARANCE TAB ================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
              {/* ... (Keep your existing Appearance content) ... */}
              <div>
                <h3 className="text-lg font-medium mb-1">Appearance</h3>
                <p className="text-sm text-text-muted">
                  Customize the look and feel of your vault.
                </p>
              </div>
              <div className="p-5 border border-border rounded-lg bg-surface">
                <p className="text-sm font-medium text-text-main mb-4">Theme Preference</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-md transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-text-muted hover:border-text-muted hover:text-text-main'}`}
                  >
                    <Sun className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-md transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-text-muted hover:border-text-muted hover:text-text-main'}`}
                  >
                    <Moon className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-md transition-all ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-text-muted hover:border-text-muted hover:text-text-main'}`}
                  >
                    <Monitor className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECURITY TAB ================= */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
              {/* ... (Keep your existing Security content) ... */}
              <div>
                <h3 className="text-lg font-medium mb-1">Security Settings</h3>
                <p className="text-sm text-text-muted">
                  Manage your master password and auto-lock preferences.
                </p>
              </div>
              {/* AUTO-LOCK CONTROL */}
              <div className="p-5 border border-border rounded-lg bg-surface sm:flex sm:items-center sm:justify-between">
                <div className="mb-4 sm:mb-0 sm:pr-4">
                  <p className="text-sm font-medium text-text-main">Auto-Lock Timer</p>
                  <p className="text-xs text-text-muted mt-1">
                    Automatically lock Raiz after a period of inactivity.
                  </p>
                </div>
                <select
                  value={lockTimeout}
                  onChange={(e) => setLockTimeout(Number(e.target.value))}
                  className="w-full sm:w-auto bg-background border border-border text-text-main text-sm rounded-md focus:ring-primary focus:border-primary block p-2.5 outline-none cursor-pointer"
                >
                  <option value={1}>1 Minute</option>
                  <option value={5}>5 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={0}>Never (Not Recommended)</option>
                </select>
              </div>
              {/* CHANGE PASSWORD FORM */}
              <form
                onSubmit={handleChangePassword}
                className="p-5 border border-border rounded-lg bg-surface space-y-4"
              >
                <div>
                  <p className="text-sm font-medium text-text-main mb-4">Change Master Password</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary text-sm"
                        placeholder="At least 12 characters"
                        required
                      />
                    </div>
                  </div>
                </div>
                {pwdMessage && (
                  <div
                    className={`p-3 rounded-md text-sm font-medium ${pwdMessage.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}
                  >
                    {pwdMessage.text}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPwd || !currentPassword || !newPassword}
                    className="flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    {isChangingPwd ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= DATA & ORGANIZATION TAB (MERGED) ================= */}
          {activeTab === 'data' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div>
                <h3 className="text-lg font-medium mb-1">Data & Organization</h3>
                <p className="text-sm text-text-muted">
                  Manage your vault's taxonomy and encrypted backups.
                </p>
              </div>

              {/* SECTION 1: TAGS */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-text-main flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Tag Taxonomy
                </h4>
                <div className="p-5 border border-border rounded-lg bg-surface">
                  <form onSubmit={handleAddTag} className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="New tag name (e.g., Social, Banking)"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary text-sm"
                    />
                    <button
                      type="submit"
                      disabled={isTagsLoading || !newTagInput.trim()}
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    {globalTags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center px-3 py-1.5 bg-background border border-border rounded-full text-sm text-text-main"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          disabled={isTagsLoading}
                          className="ml-2 p-0.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-full transition-colors disabled:opacity-50"
                          title="Delete Tag"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {globalTags.length === 0 && (
                      <p className="text-sm text-text-muted italic">No tags defined yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: EXPORT */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-text-main flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Backup & Export
                </h4>
                <div className="p-5 border border-border rounded-lg bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-text-main">Export Vault</p>
                    <p className="text-xs text-text-muted mt-1 max-w-sm">
                      Create an encrypted backup file of your entire vault. This file can only be
                      unlocked with your Master Password.
                    </p>
                  </div>
                  <button
                    onClick={handleExportVault}
                    disabled={isExporting}
                    className="w-full sm:w-auto flex justify-center items-center px-4 py-2 bg-surface border border-border text-text-main text-sm font-medium rounded-md hover:bg-surface-hover hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export Backup
                  </button>
                </div>
                {exportMessage && (
                  <div
                    className={`p-3 rounded-md text-sm font-medium ${exportMessage.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}
                  >
                    {exportMessage.text}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= DANGER ZONE TAB ================= */}
          {activeTab === 'danger' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
              {/* ... (Keep your existing Danger Zone content) ... */}
              <div>
                <h3 className="text-lg font-medium text-danger mb-1">Danger Zone</h3>
                <p className="text-sm text-text-muted">Irreversible actions for your vault.</p>
              </div>
              <div className="p-5 border border-danger/20 rounded-lg bg-danger/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-danger">Delete Entire Vault</p>
                    <p className="text-xs text-danger/80 mt-1 max-w-sm">
                      Permanently erase all accounts, passwords, and data from this device.{' '}
                      <strong>This cannot be undone.</strong>
                    </p>
                  </div>
                  {!showDeleteConfirm && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full sm:w-auto flex justify-center items-center px-4 py-2 bg-danger text-white text-sm font-medium rounded-md hover:bg-danger/90 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Vault
                    </button>
                  )}
                </div>
                {showDeleteConfirm && (
                  <div className="pt-4 border-t border-danger/20 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-medium text-danger/80 mb-2">
                      Type <strong>DELETE</strong> to confirm
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="flex-1 px-3 py-2 bg-background border border-danger/30 rounded-md text-text-main focus:outline-none focus:border-danger text-sm"
                        placeholder="DELETE"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 bg-surface border border-border text-text-main text-sm font-medium rounded-md hover:bg-surface-hover transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteVault}
                          disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                          className="px-4 py-2 bg-danger text-white text-sm font-medium rounded-md hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[100px]"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
