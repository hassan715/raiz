import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  X,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Globe,
  Star,
  Tag,
  ChevronLeft,
  Key,
  FileText,
  CreditCard,
  User,
  Wallet,
  Landmark,
} from 'lucide-react';
import { Account, InnerVault } from '../../types';
import { popularServices, ServiceTemplate } from '../../data/serviceDictionary';

interface VaultItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Account | null;
  defaultVaultId?: string | null;
}

// --- ITEM TYPES CONFIGURATION ---
const ITEM_TYPES = [
  { id: 'Login', name: 'Login', icon: Key, description: 'Passwords and web accounts' },
  {
    id: 'Secure Note',
    name: 'Secure Note',
    icon: FileText,
    description: 'Private text and documents',
  },
  {
    id: 'Credit Card',
    name: 'Credit Card',
    icon: CreditCard,
    description: 'Card numbers and PINs',
  },
  { id: 'Identity', name: 'Identity', icon: User, description: 'Personal information' },
  {
    id: 'Crypto Wallet',
    name: 'Crypto Wallet',
    icon: Wallet,
    description: 'Seed phrases and keys',
  },
  {
    id: 'Bank Account',
    name: 'Bank Account',
    icon: Landmark,
    description: 'Routing and account numbers',
  },
];

export default function VaultItemForm({
  isOpen,
  onClose,
  onSaved,
  initialData,
  defaultVaultId,
}: VaultItemFormProps) {
  // --- 0. Multi-Step State ---
  const [step, setStep] = useState<1 | 2>(1);

  // --- 1. Core Identification State ---
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('Login');
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [vaultId, setVaultId] = useState('00000000-0000-0000-0000-000000000000');
  const [availableVaults, setAvailableVaults] = useState<InnerVault[]>([]);

  // --- 2. Credentials State ---
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');

  // --- 3. Advanced Security State ---
  const [notes, setNotes] = useState('');
  const [has2FA, setHas2FA] = useState(false);
  const [recoveryCodesInput, setRecoveryCodesInput] = useState('');

  // --- 4. UI Status State ---
  const [showPassword, setShowPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // --- 5. Autocomplete & Global Tags State ---
  const [suggestions, setSuggestions] = useState<ServiceTemplate[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      invoke<string[]>('get_global_tags').then(setGlobalTags).catch(console.error);
      invoke<InnerVault[]>('get_vaults').then(setAvailableVaults).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData && isOpen) {
      setStep(2);
      setName(initialData.account_name);
      setAccountType(initialData.account_type);
      setIsFavorite(initialData.is_favorite);
      setVaultId(initialData.vault_id || '00000000-0000-0000-0000-000000000000');
      setUsername(initialData.username || '');
      setEmail(initialData.email || '');
      setUrl(initialData.url || '');
      setPassword(
        initialData.password ? new TextDecoder().decode(new Uint8Array(initialData.password)) : ''
      );
      setNotes(
        initialData.notes ? new TextDecoder().decode(new Uint8Array(initialData.notes)) : ''
      );
      setTagsInput(initialData.tags.join(', '));
      setHas2FA(initialData.has_2fa);

      if (initialData.recovery_codes) {
        const mappedCodes = initialData.recovery_codes
          .map((rc) => new TextDecoder().decode(new Uint8Array(rc.code)))
          .join(', ');
        setRecoveryCodesInput(mappedCodes);
      }
    } else if (isOpen) {
      setStep(1);
      setName('');
      setAccountType('Login');
      setIsFavorite(false);
      setTagsInput('');
      setVaultId(defaultVaultId || '00000000-0000-0000-0000-000000000000');
      setUsername('');
      setEmail('');
      setUrl('');
      setPassword('');
      setNotes('');
      setHas2FA(false);
      setRecoveryCodesInput('');
      setError('');
    }
  }, [initialData, isOpen, defaultVaultId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (val.length > 0) {
      const filtered = popularServices.filter((service) =>
        service.name.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectService = (service: ServiceTemplate) => {
    setName(service.name);
    setUrl(service.url);
    setShowSuggestions(false);
  };

  const generatePassword = async () => {
    setIsGenerating(true);
    try {
      const newPassword = await invoke<string>('generate_secure_password', {
        length: 16,
        includeSymbols: true,
      });
      setPassword(newPassword);
      setShowPassword(true);
    } catch {
      setError('Failed to generate password');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTag = (tagToToggle: string) => {
    const currentTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (currentTags.includes(tagToToggle)) {
      setTagsInput(currentTags.filter((t) => t !== tagToToggle).join(', '));
    } else {
      setTagsInput([...currentTags, tagToToggle].join(', '));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) {
      setError('Name and Password are required.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const passwordBytes = Array.from(new TextEncoder().encode(password));
      const now = Date.now();

      const parsedCodes = recoveryCodesInput
        .split(/[\n,]+/)
        .map((code) => code.trim())
        .filter((code) => code.length > 0)
        .map((code) => ({
          code: Array.from(new TextEncoder().encode(code)),
          is_used: false,
        }));

      const notesBytes =
        notes.trim().length > 0 ? Array.from(new TextEncoder().encode(notes)) : null;
      const tagsArray = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const newAccount: Account = {
        id: initialData ? initialData.id : crypto.randomUUID(),
        vault_id: vaultId,
        account_name: name,
        account_type: accountType,
        url: url || null,
        username: username || null,
        email: email || null,
        password: passwordBytes,
        password_history: [],
        has_2fa: has2FA,
        recovery_codes: parsedCodes,
        notes: notesBytes,
        tags: tagsArray,
        is_favorite: isFavorite,
        metadata: { created_at: now, updated_at: now, accessed_at: now },
      };

      await invoke('save_account', { account: newAccount });
      onSaved();
      onClose();
    } catch (error) {
      const err = error as Error;
      setError(err.toString() || 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Centered Modal - Locked height to prevent jiggle between steps */}
      <div className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-2xl h-[700px] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Dynamic Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background z-10 shrink-0">
          <div className="flex items-center">
            {step === 2 && !initialData && (
              <button
                onClick={() => setStep(1)}
                className="mr-3 p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-md transition-colors"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-text-main">
              {step === 1 ? 'Choose Item Type' : initialData ? 'Edit Item' : `New ${accountType}`}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {step === 2 && (
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-md transition-colors ${isFavorite ? 'text-warning bg-warning/10' : 'text-text-muted hover:bg-background hover:text-text-main'}`}
              >
                <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main rounded-md hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: ITEM TYPE SELECTOR */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
            <p className="text-sm text-text-muted mb-6">
              What kind of item would you like to create?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {ITEM_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setAccountType(type.id);
                    setStep(2);
                  }}
                  className="flex flex-col items-start p-5 bg-surface border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left shadow-sm group w-full h-full"
                >
                  <div className="p-2.5 bg-background border border-border rounded-lg mb-4 group-hover:border-primary/30 transition-colors">
                    <type.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-text-main text-sm mb-1">{type.name}</h3>
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: THE FORM */}
        {step === 2 && (
          <>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-surface">
              <form
                id="vault-form"
                onSubmit={handleSave}
                className="space-y-6 max-w-xl mx-auto w-full"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                      Vault Folder
                    </label>
                    <select
                      value={vaultId}
                      onChange={(e) => setVaultId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors"
                    >
                      {availableVaults.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      onFocus={() =>
                        name.length > 0 && suggestions.length > 0 && setShowSuggestions(true)
                      }
                      placeholder="e.g. GitHub, Amazon, Gmail"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors"
                      autoComplete="off"
                      autoFocus
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
                        <ul className="py-1">
                          {suggestions.map((service, index) => (
                            <li
                              key={index}
                              onClick={() => selectService(service)}
                              className="px-3 py-2 cursor-pointer hover:bg-primary-muted transition-colors flex items-center"
                            >
                              <Globe className="w-4 h-4 mr-3 text-text-muted" />
                              <div>
                                <p className="text-sm font-medium text-text-main">{service.name}</p>
                                <p className="text-xs text-text-muted">{service.url}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-border" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-text-muted">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        disabled={isGenerating}
                        className="text-xs font-medium text-primary hover:text-primary-hover flex items-center"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}{' '}
                        Generate Secure
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md text-text-main font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-text-muted hover:text-text-main"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <hr className="border-border" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                    <div>
                      <h4 className="text-sm font-medium text-text-main">
                        Two-Factor Authentication
                      </h4>
                      <p className="text-xs text-text-muted">Is 2FA enabled on this service?</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={has2FA}
                        onChange={(e) => setHas2FA(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-main after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {has2FA && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Backup Recovery Codes
                      </label>
                      <p className="text-xs text-text-muted mb-2">
                        Paste codes separated by commas or newlines.
                      </p>
                      <textarea
                        value={recoveryCodesInput}
                        onChange={(e) => setRecoveryCodesInput(e.target.value)}
                        rows={3}
                        placeholder="e.g. 8f92-a1b2, 7c83-d4e5..."
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main font-mono text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                      />
                    </div>
                  )}
                </div>

                <hr className="border-border" />

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center text-sm font-medium text-text-muted mb-2">
                      <Tag className="w-4 h-4 mr-1.5" /> Classification Tags
                    </label>
                    {globalTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {globalTags.map((tag) => {
                          const isSelected = tagsInput
                            .split(',')
                            .map((t) => t.trim())
                            .includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-background text-text-main border-border hover:border-primary hover:text-primary'}`}
                            >
                              {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Or type custom tags (comma separated)..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                      Secure Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Add private keys, security questions, or extra details here..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-md animate-in fade-in">
                    <p className="text-sm text-danger font-medium">{error}</p>
                  </div>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-border bg-background z-10 shrink-0">
              <button
                type="submit"
                form="vault-form"
                disabled={isSaving || !name || !password}
                className="w-full max-w-xl mx-auto flex items-center justify-center px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Item
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
