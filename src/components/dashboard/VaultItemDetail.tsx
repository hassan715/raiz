import { useState, useEffect } from 'react';
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
  AlertTriangle,
  Lock,
  FileText,
  CreditCard,
  User,
  Wallet,
} from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { Account, InnerVault, LoginAccount } from '../../types';
import BrandIcon from './BrandIcon';
import {
  MenuTrigger,
  Button,
  Popover,
  Menu,
  MenuItem,
  Separator,
  ModalOverlay,
  Modal,
  Dialog,
  Heading,
} from 'react-aria-components';

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- ZERO KNOWLEDGE STATE ---
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});

  const [vaultName, setVaultName] = useState<string>('Personal');
  const [allVaults, setAllVaults] = useState<InnerVault[]>([]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- KEYBOARD NAVIGATION ---
  const [kbNav, setKbNav] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) setKbNav(true);
    };
    const onPointer = () => setKbNav(false);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);
  const kbRing = kbNav ? 'focus:ring-2 focus:ring-primary/60 outline-none' : 'outline-none';

  const accountId = account?.id;
  const targetVaultId = account?.vault_id;

  // Reset states and PURGE SECRETS when the selected account changes
  useEffect(() => {
    setRevealedSecrets({});
    setShowMetadata(false);
    setIsMoveModalOpen(false);
    setIsDeleteModalOpen(false);
  }, [accountId]);

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

  const dynAccount = account as unknown as Record<string, unknown>;

  const decodeBytes = (bytes: number[] | null | undefined): string => {
    if (!bytes || bytes.length === 0) return '';
    return new TextDecoder().decode(new Uint8Array(bytes));
  };

  // --- PARSE PUBLIC NOTES & METADATA ---
  const rawNotes = decodeBytes(dynAccount.notes as number[] | undefined);
  let finalNotesString = rawNotes;
  let extCardExp = '';
  let extCardName = '';
  let extWalletAddress = '';
  let extIdentityName = '';
  let extIdentityDob = '';
  let extIdentityPhone = '';
  let extIdentityAddress = '';

  if (rawNotes.startsWith('---EXT---')) {
    const parts = rawNotes.split('\n\n---NOTES---\n');
    const extData = parts[0].replace('---EXT---\n', '');
    finalNotesString = parts[1] || '';

    const lines = extData.split('\n');
    lines.forEach((line) => {
      if (line.startsWith('Card Exp: ')) extCardExp = line.replace('Card Exp: ', '');
      if (line.startsWith('Card Name: ')) extCardName = line.replace('Card Name: ', '');
      if (line.startsWith('Wallet: ')) extWalletAddress = line.replace('Wallet: ', '');
      if (line.startsWith('Full Name: ')) extIdentityName = line.replace('Full Name: ', '');
      if (line.startsWith('DOB: ')) extIdentityDob = line.replace('DOB: ', '');
      if (line.startsWith('Phone: ')) extIdentityPhone = line.replace('Phone: ', '');
      if (line.startsWith('Address: ')) extIdentityAddress = line.replace('Address: ', '');
    });
  }

  // --- ZERO KNOWLEDGE BACKEND ACTIONS ---

  const toggleSecretReveal = async (field: string) => {
    // FIX: Check for undefined explicitly so empty strings don't cause silent failures
    if (revealedSecrets[field] !== undefined) {
      const newSecrets = { ...revealedSecrets };
      delete newSecrets[field];
      setRevealedSecrets(newSecrets);
    } else {
      try {
        const secret = await invoke<string>('reveal_secret', { accountId: account.id, field });
        setRevealedSecrets({ ...revealedSecrets, [field]: secret });
      } catch (err) {
        console.error('Failed to decrypt secret', err);
      }
    }
  };

  const copySecureBackend = async (field: string, displayLabel: string = field) => {
    try {
      await invoke('copy_secret_to_clipboard', { accountId: account.id, field });
      window.dispatchEvent(new Event('app-clipboard-copied'));
      setCopiedField(displayLabel);
      setTimeout(() => setCopiedField(null), 2000);
      onUpdated();
    } catch (err) {
      console.error('Failed to copy secret via backend.', err);
      // FIX: Show a visual error (red X) if the secret is empty or missing in the DB
      setCopiedField(displayLabel + '-error');
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const copyPlaintext = async (text: string, fieldName: string) => {
    if (!text) return;
    try {
      await writeText(text);
      window.dispatchEvent(new Event('app-clipboard-copied'));
    } catch {
      await navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- SAFE MUTATION ACTIONS ---

  const toggleFavorite = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const fullAcc = await invoke<Account>('get_full_account', { accountId: account.id });
      const updatedAccount = { ...fullAcc, is_favorite: !fullAcc.is_favorite };
      await invoke('save_account', { account: updatedAccount });
      onUpdated();
    } catch (err) {
      console.error('Failed to update favorite status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const fullAcc = await invoke<Account>('get_full_account', { accountId: account.id });
      const isCurrentlyArchived = !!fullAcc.metadata.archived_at;
      const updatedAccount = {
        ...fullAcc,
        metadata: {
          ...fullAcc.metadata,
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

  const handleMoveToVault = async (newVaultId: string) => {
    if (isUpdating || account.vault_id === newVaultId) return;
    setIsUpdating(true);
    try {
      await invoke('move_account_to_vault', {
        accountId: account.id,
        newVaultId: newVaultId,
      });
      onUpdated();
      setIsMoveModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Failed to securely move account:', err);
      alert('Failed to move item.');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleRecoveryCode = async (index: number) => {
    if (isUpdating || account.account_type !== 'Login') return;
    setIsUpdating(true);
    try {
      const fullAcc = await invoke<Account>('get_full_account', { accountId: account.id });
      const loginAcc = fullAcc as LoginAccount;

      const newCodes = [...loginAcc.recovery_codes];
      newCodes[index].is_used = !newCodes[index].is_used;
      const updatedAccount = { ...loginAcc, recovery_codes: newCodes };

      await invoke('save_account', { account: updatedAccount });
      onUpdated();
    } catch (err) {
      console.error('Failed to update recovery code', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmAndDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await invoke('delete_account', { accountId: account.id });
      setIsDeleteModalOpen(false);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Failed to securely delete account:', err);
      alert('Failed to permanently delete item.');
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
  const has2FA = !!dynAccount.has_2fa;
  const recoveryCodes = dynAccount.recovery_codes as
    | { code: number[]; is_used: boolean }[]
    | undefined;

  const renderItemIcon = () => {
    switch (account.account_type) {
      case 'Password':
        return <Lock className="w-7 h-7 text-sky-500" />;
      case 'Secure Note':
        return <FileText className="w-7 h-7 text-emerald-500" />;
      case 'Credit Card':
        return <CreditCard className="w-7 h-7 text-indigo-500" />;
      case 'Identity':
        return <User className="w-7 h-7 text-amber-500" />;
      case 'Crypto Wallet':
        return <Wallet className="w-7 h-7 text-orange-500" />;
      case 'Login':
      default:
        return <BrandIcon name={account.account_name} className="w-7 h-7" useBrandColor={true} />;
    }
  };

  // --- UI COMPONENTS ---

  const DetailRow = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors flex items-center justify-between min-w-0 w-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 pr-8">
        <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
          {label}
        </label>
        <p className="text-sm font-medium text-text-main truncate select-text">{value}</p>
      </div>
      <Button
        onPress={() => copyPlaintext(value, field)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 rounded-md transition-all ${kbRing}`}
        aria-label={`Copy ${label}`}
      >
        {copiedField === field ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  // Component for True Secrets (Backend Fetch required)
  const SecretRow = ({ label, backendField }: { label: string; backendField: string }) => {
    // FIX: Safely handles empty string states
    const isRevealed = revealedSecrets[backendField] !== undefined;
    const rawValue = revealedSecrets[backendField];
    const displayValue = rawValue === '' ? '(Empty)' : rawValue;

    return (
      <div className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors flex items-center justify-between min-w-0 w-full overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 pr-24">
          <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
            {label}
          </label>
          <p
            className={`text-sm font-mono truncate select-text whitespace-pre-wrap break-all ${rawValue === '' ? 'text-text-muted italic' : 'text-text-main'}`}
          >
            {isRevealed ? displayValue : '••••••••••••••••'}
          </p>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-background pl-2">
          <Button
            onPress={() => toggleSecretReveal(backendField)}
            className={`p-2 text-text-muted hover:text-text-main hover:bg-surface rounded-md transition-colors mr-1 ${kbRing}`}
            aria-label={isRevealed ? 'Hide value' : 'Show value'}
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            onPress={() => copySecureBackend(backendField)}
            className={`p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-md transition-colors ${kbRing}`}
            aria-label={`Copy ${label}`}
          >
            {copiedField === backendField ? (
              <Check className="w-4 h-4 text-success" />
            ) : copiedField === backendField + '-error' ? (
              <X className="w-4 h-4 text-danger" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  const UrlRow = ({ label, value }: { label: string; value: string }) => (
    <div
      className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors flex items-center cursor-pointer"
      onClick={() => openUrl(value)}
    >
      <div className="flex flex-col flex-1 min-w-0 pr-8">
        <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider pointer-events-none">
          {label}
        </label>
        <div className="text-sm font-medium text-primary flex items-center min-w-0 pointer-events-none">
          <span className="truncate min-w-0">{value}</span>
          <ExternalLink className="w-3.5 h-3.5 ml-2 shrink-0" />
        </div>
      </div>
    </div>
  );

  const NotesRow = () => {
    if (!finalNotesString.trim()) return null;
    return (
      <div className="group p-4 bg-background border border-border rounded-xl relative hover:border-primary/50 transition-colors flex items-start justify-between min-w-0 w-full overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 pr-8">
          {account.account_type !== 'Secure Note' && (
            <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
              Note
            </label>
          )}
          <p className="text-sm text-text-main whitespace-pre-wrap font-mono leading-relaxed break-all w-full overflow-hidden select-text">
            {finalNotesString}
          </p>
        </div>
        <Button
          onPress={() => copyPlaintext(finalNotesString, 'notes')}
          className={`absolute right-3 top-3 p-2 text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 rounded-md transition-all ${kbRing}`}
          aria-label="Copy Note"
        >
          {copiedField === 'notes' ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  };

  const renderCredentials = () => {
    switch (account.account_type) {
      case 'Login':
        return (
          <>
            {dynAccount.username && (
              <DetailRow label="Username" value={dynAccount.username as string} field="username" />
            )}
            {dynAccount.email && (
              <DetailRow label="Email" value={dynAccount.email as string} field="email" />
            )}
            <SecretRow label="Password" backendField="password" />
            {dynAccount.url && <UrlRow label="Website" value={dynAccount.url as string} />}
          </>
        );
      case 'Password':
        return (
          <>
            {dynAccount.identifier && (
              <DetailRow
                label="Identifier"
                value={dynAccount.identifier as string}
                field="identifier"
              />
            )}
            <SecretRow label="Password / Secret Key" backendField="password" />
            {dynAccount.url && <UrlRow label="Endpoint URL" value={dynAccount.url as string} />}
          </>
        );
      case 'Secure Note':
        return null;
      case 'Credit Card':
        return (
          <>
            {extCardName && (
              <DetailRow label="Cardholder Name" value={extCardName} field="cardholder_name" />
            )}
            <SecretRow label="Card Number" backendField="card_number" />
            {extCardExp && <DetailRow label="Expiration" value={extCardExp} field="expiration" />}
            <SecretRow label="CVV / Security Code" backendField="cvv" />
          </>
        );
      case 'Identity':
        return (
          <>
            {extIdentityName && (
              <DetailRow label="Full Legal Name" value={extIdentityName} field="full_name" />
            )}
            {dynAccount.id_number && (
              <DetailRow
                label="ID / Passport Number"
                value={dynAccount.id_number as string}
                field="id_number"
              />
            )}
            {extIdentityDob && (
              <DetailRow label="Date of Birth" value={extIdentityDob} field="dob" />
            )}
            {extIdentityPhone && (
              <DetailRow label="Phone Number" value={extIdentityPhone} field="phone" />
            )}
            {extIdentityAddress && (
              <DetailRow label="Address" value={extIdentityAddress} field="address" />
            )}
          </>
        );
      case 'Crypto Wallet':
        return (
          <>
            {extWalletAddress && (
              <DetailRow label="Wallet Address" value={extWalletAddress} field="wallet_address" />
            )}
            <SecretRow label="Seed Phrase / Private Key" backendField="seed_phrase" />
          </>
        );
      default:
        return null;
    }
  };

  const isRecoveryRevealed = revealedSecrets['recovery_codes'] !== undefined;
  const rawRecoveryCodes = revealedSecrets['recovery_codes']?.split('\n') || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-surface animate-in fade-in duration-200 min-w-0 overflow-x-hidden select-none">
      <div
        className={`flex items-center justify-between px-6 py-3 bg-background shrink-0 z-20 transition-all duration-200 min-w-0 ${isScrolled ? 'shadow-md border-b border-border' : 'border-b border-transparent'}`}
      >
        <div className="flex items-center text-xs font-semibold text-text-muted min-w-0 pr-4">
          <Folder className="w-3.5 h-3.5 mr-2 opacity-70 shrink-0" />
          <span className="uppercase tracking-wider truncate">In: {vaultName}</span>
        </div>

        <div className="flex items-center space-x-1 relative shrink-0">
          <Button
            onPress={async () => {
              try {
                const fullAccount = await invoke<Account>('get_full_account', {
                  accountId: account.id,
                });
                onEditRequest(fullAccount);
              } catch (e) {
                console.error('Failed to load account for editing', e);
              }
            }}
            className={`flex items-center px-3 py-1.5 text-sm font-semibold text-text-muted hover:text-primary rounded-md hover:bg-primary/10 transition-colors ${kbRing}`}
          >
            <Edit className="w-4 h-4 mr-1.5" /> Edit
          </Button>

          <div className="w-px h-5 bg-border mx-1"></div>

          <MenuTrigger>
            <Button
              className={`p-1.5 rounded-md text-text-muted hover:bg-text-main/10 hover:text-text-main transition-colors ${kbRing}`}
              aria-label="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
            <Popover
              placement="bottom end"
              className="w-48 bg-surface border border-border rounded-lg shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 select-none"
            >
              <Menu className="outline-none flex flex-col">
                <MenuItem
                  onAction={toggleFavorite}
                  className="w-full flex items-center rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-gray-200 transition-colors"
                >
                  <Star
                    className={`w-4 h-4 mr-3 ${account.is_favorite ? 'text-warning' : 'text-text-muted'}`}
                    fill={account.is_favorite ? 'currentColor' : 'none'}
                  />
                  {account.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                </MenuItem>
                <MenuItem
                  onAction={() => setIsMoveModalOpen(true)}
                  className="w-full flex items-center rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-gray-200 transition-colors"
                >
                  <FolderInput className="w-4 h-4 mr-3 text-text-muted" /> Move...
                </MenuItem>
                <Separator className="h-px bg-border my-1.5 mx-2" />
                <MenuItem
                  onAction={handleArchiveToggle}
                  className="w-full flex items-center rounded-md px-3 py-2 text-sm text-text-main cursor-pointer outline-none data-focused:bg-gray-200 transition-colors"
                >
                  {isArchived ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-3 text-text-muted" /> Restore Item
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-3 text-text-muted" /> Archive Item
                    </>
                  )}
                </MenuItem>
                <MenuItem
                  onAction={() => setIsDeleteModalOpen(true)}
                  className="w-full flex items-center rounded-md px-3 py-2 text-sm text-danger cursor-pointer outline-none data-focused:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-3" /> Delete
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden z-0 min-w-0 flex flex-col"
        onScroll={handleScroll}
      >
        <div className="flex flex-col px-8 pt-4 pb-6 min-w-0">
          <div className="flex items-center space-x-4 mb-1 min-w-0">
            <div className="w-14 h-14 bg-background border border-border rounded-2xl flex items-center justify-center text-text-muted overflow-hidden shrink-0">
              {renderItemIcon()}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-xl font-bold text-text-main">{account.account_name}</h2>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-8 min-w-0 flex-1">
          {account.account_type !== 'Secure Note' && (
            <div className="space-y-5 min-w-0 w-full">{renderCredentials()}</div>
          )}

          {account.account_type === 'Login' &&
            (has2FA || (recoveryCodes && recoveryCodes.length > 0)) && (
              <>
                <hr className="border-border" />
                <div className="space-y-5 min-w-0 w-full">
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center text-sm font-medium text-text-main min-w-0 mr-3">
                      <ShieldCheck
                        className={`w-5 h-5 mr-2.5 shrink-0 ${has2FA ? 'text-success' : 'text-text-muted'}`}
                      />
                      <span className="truncate">Two-Factor Authentication</span>
                    </div>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ml-3 ${has2FA ? 'bg-success/10 text-success' : 'bg-surface border border-border text-text-muted'}`}
                    >
                      {has2FA ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {recoveryCodes && recoveryCodes.length > 0 && (
                    <div className="p-5 bg-background border border-border rounded-xl min-w-0 w-full group relative">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                          Recovery Codes
                        </label>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onPress={() => toggleSecretReveal('recovery_codes')}
                            className={`p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-md transition-colors mr-1 ${kbRing}`}
                            aria-label={isRecoveryRevealed ? 'Hide Codes' : 'Show Codes'}
                          >
                            {isRecoveryRevealed ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            onPress={() => copySecureBackend('recovery_codes')}
                            className={`p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-md transition-colors ${kbRing}`}
                            aria-label="Copy All Codes"
                          >
                            {copiedField === 'recovery_codes' ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : copiedField === 'recovery_codes-error' ? (
                              <X className="w-4 h-4 text-danger" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-w-0">
                        {recoveryCodes.map((rc, idx) => {
                          const codeString = isRecoveryRevealed
                            ? rawRecoveryCodes[idx] || 'ERROR'
                            : '••••••••••••';
                          return (
                            <div key={idx} className="flex items-center space-x-2 min-w-0">
                              <Button
                                onPress={() =>
                                  !rc.is_used && copyPlaintext(codeString, `code-${idx}`)
                                }
                                isDisabled={rc.is_used || !isRecoveryRevealed}
                                className={`flex-1 min-w-0 text-sm font-mono p-2.5 rounded-lg text-left transition-colors border flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                  rc.is_used
                                    ? 'bg-surface border-transparent text-text-muted line-through opacity-40 cursor-not-allowed'
                                    : 'bg-background border-border text-text-main hover:border-primary hover:text-primary cursor-pointer'
                                }`}
                              >
                                <span className="truncate select-text">{codeString}</span>
                                {copiedField === `code-${idx}` && (
                                  <Check className="w-4 h-4 text-success shrink-0 ml-2" />
                                )}
                              </Button>
                              <Button
                                onPress={() => toggleRecoveryCode(idx)}
                                className={`p-2.5 border rounded-lg transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                  rc.is_used
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-background border-border text-text-muted hover:border-primary hover:text-primary'
                                }`}
                                aria-label={rc.is_used ? 'Mark as Unused' : 'Mark as Used'}
                              >
                                <CheckSquare className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          {finalNotesString && (
            <div className="min-w-0 w-full">
              <NotesRow />
            </div>
          )}

          {account.tags && account.tags.length > 0 && (
            <>
              <hr className="border-border" />
              <div className="min-w-0 w-full">
                <label className="block text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 min-w-0">
                  {account.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-background border border-border text-text-muted hover:text-text-main transition-colors cursor-default text-xs font-semibold rounded-lg truncate max-w-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="pt-6 min-w-0 w-full">
            <Button
              onPress={() => setShowMetadata(!showMetadata)}
              className={`flex items-start text-left text-sm font-medium text-text-muted hover:text-text-main hover:bg-text-main/5 px-3 py-2 rounded-md transition-colors w-full min-w-0 ${kbRing}`}
            >
              {showMetadata ? (
                <ChevronDown className="w-4 h-4 mr-2 mt-0.5 opacity-70 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2 mt-0.5 opacity-70 shrink-0" />
              )}
              <span className="whitespace-normal leading-tight">
                {isArchived
                  ? `Archived at: ${formatDate(account.metadata.archived_at)}`
                  : `Last accessed: ${formatDate(account.metadata.accessed_at)}`}
              </span>
            </Button>
            {showMetadata && (
              <div className="p-5 bg-background border border-border rounded-xl mt-3 animate-in fade-in slide-in-from-top-2 duration-200 mx-3 min-w-0">
                <div className="relative pl-6 border-l-2 border-border/50 ml-2 space-y-6 py-1">
                  <div className="relative">
                    <div className="absolute -left-7.25 top-0.5 w-2.5 h-2.5 bg-text-muted rounded-full ring-4 ring-background" />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        <Calendar className="w-3 h-3 mr-1.5 opacity-70" /> Created
                      </div>
                      <p className="text-xs font-medium text-text-main truncate">
                        {formatDate(account.metadata.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-7.25 top-0.5 w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-background" />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        <Edit className="w-3 h-3 mr-1.5 opacity-70" /> Last Updated
                      </div>
                      <p className="text-xs font-medium text-text-main truncate">
                        {formatDate(account.metadata.updated_at)}
                      </p>
                    </div>
                  </div>
                  {isArchived && (
                    <div className="relative animate-in fade-in duration-200">
                      <div className="absolute -left-7.25 top-0.5 w-2.5 h-2.5 bg-text-muted rounded-full ring-4 ring-background" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                          <Clock className="w-3 h-3 mr-1.5 opacity-70" /> Last Accessed
                        </div>
                        <p className="text-xs font-medium text-text-main truncate">
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

      {/* MODALS */}
      <ModalOverlay
        isOpen={isMoveModalOpen}
        onOpenChange={setIsMoveModalOpen}
        className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in"
      >
        <Modal className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95 outline-none select-none">
          <Dialog className="outline-none">
            {({ close }) => (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Heading className="text-lg font-semibold text-text-main">Move Item</Heading>
                  <Button
                    onPress={close}
                    className={`p-1 text-text-muted hover:text-text-main rounded-md hover:bg-background transition-colors ${kbRing}`}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-text-muted mb-4">
                  Select a destination vault for <strong>{account.account_name}</strong>:
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  <Button
                    onPress={() => handleMoveToVault('00000000-0000-0000-0000-000000000000')}
                    isDisabled={
                      isUpdating || account.vault_id === '00000000-0000-0000-0000-000000000000'
                    }
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${account.vault_id === '00000000-0000-0000-0000-000000000000' ? 'bg-primary/5 border-primary text-primary cursor-default' : 'bg-background border-border text-text-main hover:border-primary/50 hover:text-primary cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60'}`}
                  >
                    <span className="flex items-center">
                      <Folder className="w-4 h-4 mr-3 shrink-0" /> Personal (Default)
                    </span>
                    {account.vault_id === '00000000-0000-0000-0000-000000000000' && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 rounded">
                        Current
                      </span>
                    )}
                  </Button>
                  {allVaults
                    .filter((v) => v.id !== '00000000-0000-0000-0000-000000000000')
                    .map((vault) => {
                      const isCurrent = account.vault_id === vault.id;
                      return (
                        <Button
                          key={vault.id}
                          onPress={() => handleMoveToVault(vault.id)}
                          isDisabled={isUpdating || isCurrent}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${isCurrent ? 'bg-primary/5 border-primary text-primary cursor-default' : 'bg-background border-border text-text-main hover:border-primary/50 hover:text-primary cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60'}`}
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
                        </Button>
                      );
                    })}
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    onPress={close}
                    className={`px-4 py-2 text-sm font-medium text-text-main hover:bg-background rounded-md transition-colors ${kbRing}`}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>

      <ModalOverlay
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in"
      >
        <Modal className="relative bg-surface border border-danger/30 shadow-2xl rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95 outline-none select-none">
          <Dialog className="outline-none">
            {({ close }) => (
              <>
                <div className="flex items-center mb-4 text-danger">
                  <AlertTriangle className="w-6 h-6 mr-3 shrink-0" />
                  <Heading className="text-lg font-bold">Delete Item?</Heading>
                </div>
                <p className="text-sm text-text-main mb-6 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong>{account.account_name}</strong>? This action cannot be undone and
                  credentials will be purged from disk immediately.
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    onPress={close}
                    isDisabled={isDeleting}
                    className={`px-4 py-2 text-sm font-medium text-text-main hover:bg-background rounded-md transition-colors ${kbRing}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={confirmAndDelete}
                    isDisabled={isDeleting}
                    className={`px-4 py-2 bg-danger text-white text-sm font-bold rounded-md hover:bg-danger/90 disabled:opacity-50 transition-colors shadow-sm ${kbRing}`}
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
