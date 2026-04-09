import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  X,
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
} from 'lucide-react';
import { Account } from '../../types';
import BrandIcon from './BrandIcon';

interface VaultItemDetailProps {
  account: Account | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void; // Trigger dashboard refresh on inline updates
  onEditRequest: (acc: Account) => void; // Pass account to the edit form
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

  // --- Inline Update Handlers ---
  const toggleFavorite = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updatedAccount = { ...account, is_favorite: !account.is_favorite };
      await invoke('save_account', { account: updatedAccount });
      onUpdated(); // Refresh the UI
    } catch (err) {
      console.error('Failed to update favorite status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleRecoveryCode = async (index: number) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      // Deep copy the codes array to toggle the specific code's used state
      const newCodes = [...account.recovery_codes];
      newCodes[index].is_used = !newCodes[index].is_used;

      const updatedAccount = { ...account, recovery_codes: newCodes };
      await invoke('save_account', { account: updatedAccount });
      onUpdated(); // Refresh the UI
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

  return (
    <>
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header & Branding */}
        <div className="flex flex-col px-6 pt-6 pb-4 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted overflow-hidden shadow-sm">
              <BrandIcon name={account.account_name} className="w-6 h-6" useBrandColor={true} />
            </div>

            {/* Action Bar */}
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleFavorite}
                disabled={isUpdating}
                className={`p-2 rounded-md transition-colors ${account.is_favorite ? 'text-warning hover:bg-warning/10' : 'text-text-muted hover:bg-surface hover:text-text-main'}`}
                title={account.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Star className="w-5 h-5" fill={account.is_favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => onEditRequest(account)}
                className="p-2 text-text-muted hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
                title="Edit Item"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-text-muted hover:text-danger rounded-md hover:bg-danger/10 transition-colors"
                title="Delete Item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-border mx-1"></div>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-main rounded-md hover:bg-surface transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-text-main">{account.account_name}</h2>
          <p className="text-sm text-text-muted mt-1 flex items-center">
            {account.account_type}{' '}
            {account.is_favorite && (
              <span className="ml-2 px-2 py-0.5 bg-warning/10 text-warning text-xs rounded-full font-medium tracking-wide uppercase">
                Favorite
              </span>
            )}
          </p>
        </div>

        {/* Scrollable Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Credentials */}
          <div className="space-y-4">
            {account.username && (
              <div className="group p-3 bg-background border border-border rounded-lg relative hover:border-primary/50 transition-colors">
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
                  Username
                </label>
                <p className="text-sm font-medium text-text-main">{account.username}</p>
                <button
                  onClick={() => copyToClipboard(account.username!, 'username')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
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
              <div className="group p-3 bg-background border border-border rounded-lg relative hover:border-primary/50 transition-colors">
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
                  Email
                </label>
                <p className="text-sm font-medium text-text-main">{account.email}</p>
                <button
                  onClick={() => copyToClipboard(account.email!, 'email')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
                >
                  {copiedField === 'email' ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            <div className="group p-3 bg-background border border-border rounded-lg relative hover:border-primary/50 transition-colors">
              <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="flex items-center">
                <p className="text-sm font-mono text-text-main mr-20 tracking-wider">
                  {showPassword ? passwordString : '••••••••••••••••'}
                </p>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-text-muted hover:text-text-main transition-colors"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(passwordString, 'password')}
                  className="p-2 text-text-muted hover:text-primary transition-colors"
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
              <div className="group p-3 bg-background border border-border rounded-lg relative hover:border-primary/50 transition-colors">
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
                  Website
                </label>
                <a
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center"
                >
                  {account.url}
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Security & 2FA WITH RECOVERY CODE SCRATCH-OFF */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm font-medium text-text-main">
                <ShieldCheck
                  className={`w-5 h-5 mr-2 ${account.has_2fa ? 'text-success' : 'text-text-muted'}`}
                />
                Two-Factor Authentication
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${account.has_2fa ? 'bg-success/10 text-success' : 'bg-surface text-text-muted'}`}
              >
                {account.has_2fa ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {account.has_2fa && account.recovery_codes && account.recovery_codes.length > 0 && (
              <div className="p-4 bg-background border border-border rounded-lg">
                <label className="block text-xs font-medium text-text-muted mb-3 uppercase tracking-wider">
                  Recovery Codes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {account.recovery_codes.map((rc, idx) => {
                    const codeString = decodeBytes(rc.code);
                    return (
                      <div key={idx} className="flex items-center space-x-1">
                        {/* The Code Copy Button (Disabled if scratched off) */}
                        <button
                          onClick={() => !rc.is_used && copyToClipboard(codeString, `code-${idx}`)}
                          disabled={rc.is_used}
                          className={`flex-1 text-xs font-mono p-2 rounded text-left transition-colors border flex items-center justify-between ${
                            rc.is_used
                              ? 'bg-surface border-transparent text-text-muted line-through opacity-40 cursor-not-allowed'
                              : 'bg-background border-border text-text-main hover:border-primary hover:text-primary cursor-pointer'
                          }`}
                        >
                          {codeString}
                          {copiedField === `code-${idx}` && (
                            <Check className="w-3 h-3 text-success" />
                          )}
                        </button>

                        {/* The Mark as Used Toggle Button */}
                        <button
                          onClick={() => toggleRecoveryCode(idx)}
                          className={`p-2 border rounded transition-colors ${rc.is_used ? 'bg-primary border-primary text-white' : 'bg-background border-border text-text-muted hover:border-primary hover:text-primary'}`}
                          title={rc.is_used ? 'Mark as Unused' : 'Mark as Used'}
                        >
                          <CheckSquare className="w-3 h-3" />
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
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider flex justify-between items-center">
                  Secure Notes
                  <button
                    onClick={() => copyToClipboard(notesString, 'notes')}
                    className="text-text-muted hover:text-primary transition-colors"
                    title="Copy Notes"
                  >
                    {copiedField === 'notes' ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </label>
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-sm text-text-main whitespace-pre-wrap font-mono leading-relaxed">
                    {notesString}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {account.tags && account.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {account.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-surface border border-border text-text-muted text-xs font-medium rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
