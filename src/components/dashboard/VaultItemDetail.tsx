import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Edit,
  Star,
  CheckSquare,
  Folder,
  Calendar,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  FolderInput,
  Archive,
  RefreshCw,
  Clock,
  X,
} from 'lucide-react';
import { Account, InnerVault } from '../../types';
import BrandIcon from './BrandIcon';

interface VaultItemDetailProps {
  account: Account | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
  onEditRequest: (acc: Account) => void;
}

export default function VaultItemDetail({
  account,
  onClose,
  onDeleted,
  onUpdated,
  onEditRequest,
}: VaultItemDetailProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Vault data states
  const [vaultName, setVaultName] = useState<string>('Personal');
  const [allVaults, setAllVaults] = useState<InnerVault[]>([]);

  // States: Scroll tracking, Menus, Modals
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Safely extract primitive IDs to use as clean dependencies
  const accountId = account?.id;
  const targetVaultId = account?.vault_id;

  // Handle clicking outside the context menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset local view state when switching to a different account
  useEffect(() => {
    setShowPassword(false);
    setShowMetadata(false);
    setIsMenuOpen(false);
    setIsMoveModalOpen(false);
  }, [accountId]);

  // Safely fetch the vault name and available vaults list
  useEffect(() => {
    if (!targetVaultId) return;

    async function fetchVaultData() {
      try {
        const fetchedVaults = await invoke<InnerVault[]>('get_vaults');
        setAllVaults(fetchedVaults);

        if (targetVaultId !== '00000000-0000-0000-0000-000000000000') {
          const v = fetchedVaults.find((v) => v.id === targetVaultId);
          if (v) setVaultName(v.name);
        } else {
          setVaultName('Personal');
        }
      } catch (e) {
        console.error('Failed to load vault data', e);
      }
    }
    fetchVaultData();
  }, [targetVaultId, isMoveModalOpen]);

  if (!account) return null;

  const decodeBytes = (bytes: number[] | null | undefined): string => {
    if (!bytes || bytes.length === 0) return '';
    return new TextDecoder().decode(new Uint8Array(bytes));
  };

  const passwordString = decodeBytes(account.password);
  const notesString = decodeBytes(account.notes);

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleFavorite = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updatedAccount = { ...account, is_favorite: !account.is_favorite };
      await invoke('save_account', { account: updatedAccount });
      onUpdated();
    } catch (err) {
      console.error('Failed to update favorite status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Smart Archive/Restore Handler ---
  const handleArchiveToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const isCurrentlyArchived = !!account.metadata.archived_at;
      const updatedAccount = {
        ...account,
        metadata: {
          ...account.metadata,
          archived_at: isCurrentlyArchived ? null : Date.now(),
        },
      };
      await invoke('save_account', { account: updatedAccount });
      onUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to toggle archive status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Move Vault Handler (Backend Orchestrated)
  const handleMoveToVault = async (newVaultId: string) => {
    if (isUpdating || account.vault_id === newVaultId) return;
    setIsUpdating(true);
    try {
      // Direct OS-level invocation. Only safe UUIDs cross the IPC boundary.
      await invoke('move_account_to_vault', {
        accountId: account.id,
        newVaultId: newVaultId,
      });

      onUpdated(); // Trigger silent refresh of the dashboard list
      setIsMoveModalOpen(false);
      onClose(); // Close details pane since the item moved out of current context
    } catch (err) {
      console.error('Failed to securely move account to new vault:', err);
      alert('Failed to move item.');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleRecoveryCode = async (index: number) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const newCodes = [...account.recovery_codes];
      newCodes[index].is_used = !newCodes[index].is_used;

      const updatedAccount = { ...account, recovery_codes: newCodes };
      await invoke('save_account', { account: updatedAccount });
      onUpdated();
    } catch (err) {
      console.error('Failed to update recovery code', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${account.account_name}? This cannot be undone.`
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await invoke('delete_account', { id: account.id });
      onDeleted();
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (ts: number | null | undefined) => {
    if (!ts) return 'Never';
    const date = new Date(ts > 1e11 ? ts : ts * 1000);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 10);
  };

  const isArchived = !!account.metadata.archived_at;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface animate-in fade-in duration-200 min-w-0">
      {/* ============================================================== */}
      {/* TOP NAVBAR (Dynamic Shadow)                                    */}
      {/* ============================================================== */}
      <div
        className={`flex items-center justify-between px-6 py-3 bg-background shrink-0 z-20 transition-all duration-200 ${
          isScrolled ? 'shadow-md border-b border-border' : 'border-b border-transparent'
        }`}
      >
        <div className="flex items-center text-xs font-semibold text-text-muted">
          <Folder className="w-3.5 h-3.5 mr-2 opacity-70" />
          <span className="uppercase tracking-wider">In: {vaultName}</span>
        </div>

        <div className="flex items-center space-x-1 relative">
          <button
            onClick={() => onEditRequest(account)}
            className="flex items-center px-3 py-1.5 text-sm font-semibold text-text-muted hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Edit
          </button>

          <div className="w-px h-5 bg-border mx-1"></div>

          {/* Context Menu Wrapper */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-1.5 rounded-md transition-colors ${
                isMenuOpen
                  ? 'bg-text-main/10 text-text-main'
                  : 'text-text-muted hover:bg-text-main/10 hover:text-text-main'
              }`}
              title="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Context Menu Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl px-2 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    toggleFavorite();
                    setIsMenuOpen(false);
                  }}
                  disabled={isUpdating}
                  className="w-full flex items-center rounded-md px-3 py-2 text-sm text-text-main hover:bg-text-main/10 transition-colors"
                >
                  <Star
                    className={`w-4 h-4 mr-3 ${account.is_favorite ? 'text-warning' : 'text-text-muted'}`}
                    fill={account.is_favorite ? 'currentColor' : 'none'}
                  />
                  {account.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                </button>

                {/* UPDATED: Triggers the Move modal */}
                <button
                  onClick={() => {
                    setIsMoveModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex rounded-md items-center px-3 py-2 text-sm text-text-main hover:bg-text-main/10 transition-colors"
                >
                  <FolderInput className="w-4 h-4 mr-3 text-text-muted" />
                  Move...
                </button>

                <div className="h-px bg-border my-1.5 mx-2" />

                <button
                  onClick={() => {
                    handleArchiveToggle();
                    setIsMenuOpen(false);
                  }}
                  disabled={isUpdating}
                  className="w-full rounded-md flex items-center px-3 py-2 text-sm text-text-main hover:bg-text-main/10 transition-colors"
                >
                  {isArchived ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-3 text-text-muted" />
                      Restore Item
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-3 text-text-muted" />
                      Archive Item
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  className="w-full rounded-md flex items-center px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SCROLLABLE BODY                                                */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-y-auto z-0" onScroll={handleScroll}>
        {/* Header & Branding */}
        <div className="flex flex-col px-8 pt-4 pb-6">
          <div className="flex items-center space-x-4 mb-1">
            <div className="w-14 h-14 bg-background border border-border rounded-2xl flex items-center justify-center text-text-muted overflow-hidden shadow-sm shrink-0">
              <BrandIcon name={account.account_name} className="w-7 h-7" useBrandColor={true} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h2 className="text-xl font-bold text-text-main">{account.account_name}</h2>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-8">
          {/* Main Credentials */}
          <div className="space-y-5">
            {account.username && (
              <div className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors shadow-sm">
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <p className="text-sm font-medium text-text-main pr-10 truncate">
                  {account.username}
                </p>
                <button
                  onClick={() => copyToClipboard(account.username!, 'username')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                  title="Copy Username"
                >
                  {copiedField === 'username' ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {account.email && (
              <div className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors shadow-sm">
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <p className="text-sm font-medium text-text-main pr-10 truncate">{account.email}</p>
                <button
                  onClick={() => copyToClipboard(account.email!, 'email')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                >
                  {copiedField === 'email' ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            <div className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors shadow-sm">
              <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="flex items-center">
                <p className="text-sm font-mono text-text-main pr-24 tracking-wider truncate">
                  {showPassword ? passwordString : '••••••••••••••••'}
                </p>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-background pl-2">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-text-muted hover:text-text-main hover:bg-surface rounded-md transition-colors mr-1"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(passwordString, 'password')}
                  className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="Copy Password"
                >
                  {copiedField === 'password' ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {account.url && (
              <div className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors shadow-sm">
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                  Website
                </label>
                <a
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center truncate pr-8"
                >
                  {account.url}
                  <ExternalLink className="w-3.5 h-3.5 ml-2 shrink-0" />
                </a>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Security & 2FA */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm font-medium text-text-main">
                <ShieldCheck
                  className={`w-5 h-5 mr-2.5 ${account.has_2fa ? 'text-success' : 'text-text-muted'}`}
                />
                Two-Factor Authentication
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${account.has_2fa ? 'bg-success/10 text-success' : 'bg-surface border border-border text-text-muted'}`}
              >
                {account.has_2fa ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {account.has_2fa && account.recovery_codes && account.recovery_codes.length > 0 && (
              <div className="p-5 bg-background border border-border rounded-xl shadow-sm">
                <label className="block text-xs font-bold text-text-muted mb-4 uppercase tracking-wider">
                  Recovery Codes
                </label>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {account.recovery_codes.map((rc, idx) => {
                    const codeString = decodeBytes(rc.code);
                    return (
                      <div key={idx} className="flex items-center space-x-2">
                        <button
                          onClick={() => !rc.is_used && copyToClipboard(codeString, `code-${idx}`)}
                          disabled={rc.is_used}
                          className={`flex-1 text-sm font-mono p-2.5 rounded-lg text-left transition-colors border flex items-center justify-between ${
                            rc.is_used
                              ? 'bg-surface border-transparent text-text-muted line-through opacity-40 cursor-not-allowed'
                              : 'bg-background border-border text-text-main hover:border-primary hover:text-primary cursor-pointer'
                          }`}
                        >
                          {codeString}
                          {copiedField === `code-${idx}` && (
                            <Check className="w-4 h-4 text-success" />
                          )}
                        </button>

                        <button
                          onClick={() => toggleRecoveryCode(idx)}
                          className={`p-2.5 border rounded-lg transition-colors shrink-0 ${rc.is_used ? 'bg-primary border-primary text-white' : 'bg-background border-border text-text-muted hover:border-primary hover:text-primary'}`}
                          title={rc.is_used ? 'Mark as Unused' : 'Mark as Used'}
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Secure Notes */}
          {notesString && (
            <>
              <hr className="border-border" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                    Secure Notes
                  </label>
                  <button
                    onClick={() => copyToClipboard(notesString, 'notes')}
                    className="text-text-muted hover:text-primary transition-colors flex items-center text-xs font-medium"
                    title="Copy Notes"
                  >
                    {copiedField === 'notes' ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-success" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="p-5 bg-background border border-border rounded-xl shadow-sm">
                  <p className="text-sm text-text-main whitespace-pre-wrap font-mono leading-relaxed">
                    {notesString}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {account.tags && account.tags.length > 0 && (
            <>
              <hr className="border-border" />
              <div>
                <label className="block text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {account.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-background border border-border text-text-muted hover:text-text-main transition-colors cursor-default text-xs font-semibold rounded-lg"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* COLLAPSIBLE TIMELINE FOOTER */}
          <div className="pt-6">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center text-left text-sm font-medium text-text-muted hover:text-text-main hover:bg-text-main/5 px-3 py-2 rounded-md transition-colors w-full"
            >
              {showMetadata ? (
                <ChevronDown className="w-4 h-4 mr-2 opacity-70 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2 opacity-70 shrink-0" />
              )}

              {isArchived ? (
                <span>Archived at: {formatDate(account.metadata.archived_at)}</span>
              ) : (
                <span>Last accessed: {formatDate(account.metadata.accessed_at)}</span>
              )}
            </button>

            {showMetadata && (
              <div className="p-5 bg-background border border-border rounded-xl shadow-sm mt-3 animate-in fade-in slide-in-from-top-2 duration-200 mx-3">
                <div className="relative pl-6 border-l-2 border-border/50 ml-2 space-y-6 py-1">
                  <div className="relative">
                    <div className="absolute -left-[29px] top-0.5 w-2.5 h-2.5 bg-text-muted rounded-full ring-4 ring-background" />
                    <div className="flex flex-col">
                      <div className="flex items-center text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        <Calendar className="w-3 h-3 mr-1.5 opacity-70" /> Created
                      </div>
                      <p className="text-xs font-medium text-text-main">
                        {formatDate(account.metadata.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[29px] top-0.5 w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-background" />
                    <div className="flex flex-col">
                      <div className="flex items-center text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        <Edit className="w-3 h-3 mr-1.5 opacity-70" /> Last Updated
                      </div>
                      <p className="text-xs font-medium text-text-main">
                        {formatDate(account.metadata.updated_at)}
                      </p>
                    </div>
                  </div>

                  {isArchived && (
                    <div className="relative animate-in fade-in duration-200">
                      <div className="absolute -left-[29px] top-0.5 w-2.5 h-2.5 bg-text-muted rounded-full ring-4 ring-background" />
                      <div className="flex flex-col">
                        <div className="flex items-center text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                          <Clock className="w-3 h-3 mr-1.5 opacity-70" /> Last Accessed
                        </div>
                        <p className="text-xs font-medium text-text-main">
                          {formatDate(account.metadata.accessed_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOVE ITEM OVERLAY MODAL                                        */}
      {/* ============================================================== */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoveModalOpen(false)}
          />
          <div className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-text-main">Move Item</h3>
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-main rounded-md hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted mb-4">
              Select a destination vault for <strong>{account.account_name}</strong>:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {/* Default Personal Vault Option */}
              <button
                onClick={() => handleMoveToVault('00000000-0000-0000-0000-000000000000')}
                disabled={isUpdating || account.vault_id === '00000000-0000-0000-0000-000000000000'}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  account.vault_id === '00000000-0000-0000-0000-000000000000'
                    ? 'bg-primary/5 border-primary text-primary cursor-default'
                    : 'bg-background border-border text-text-main hover:border-primary/50 hover:text-primary cursor-pointer'
                }`}
              >
                <span className="flex items-center">
                  <Folder className="w-4 h-4 mr-3 shrink-0" />
                  Personal (Default)
                </span>
                {account.vault_id === '00000000-0000-0000-0000-000000000000' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 rounded">
                    Current
                  </span>
                )}
              </button>

              {/* Dynamic Inner Vaults (FIX: Filtered out the default nil UUID to prevent duplication) */}
              {allVaults
                .filter((vault) => vault.id !== '00000000-0000-0000-0000-000000000000')
                .map((vault) => {
                  const isCurrent = account.vault_id === vault.id;
                  return (
                    <button
                      key={vault.id}
                      onClick={() => handleMoveToVault(vault.id)}
                      disabled={isUpdating || isCurrent}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                        isCurrent
                          ? 'bg-primary/5 border-primary text-primary cursor-default'
                          : 'bg-background border-border text-text-main hover:border-primary/50 hover:text-primary cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center truncate pr-2">
                        <Folder className="w-4 h-4 mr-3 shrink-0" />
                        <span className="truncate">{vault.name}</span>
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 rounded shrink-0">
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-text-main hover:bg-background rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
