import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Globe,
  Tag,
  ChevronLeft,
  Key,
  Lock,
  FileText,
  CreditCard,
  User,
  Wallet,
  ChevronDown,
  Folder,
} from 'lucide-react';
import { Account, InnerVault, BaseAccount } from '../../types';
import { popularServices, ServiceTemplate } from '../../data/serviceDictionary';
import {
  ModalOverlay,
  Modal,
  Dialog,
  Heading,
  Button,
  TextField,
  Label,
  Input,
  TextArea,
  Switch,
  ComboBox,
  Popover,
  ListBox,
  ListBoxItem,
  Select,
  SelectValue,
} from 'react-aria-components';

interface VaultItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Account | null;
  defaultVaultId?: string | null;
}

const ITEM_TYPES = [
  { id: 'Login', name: 'Login', icon: Key, description: 'Web accounts and portals' },
  {
    id: 'Password',
    name: 'Password',
    icon: Lock,
    description: 'App passwords, Wi-Fi, and API keys',
  },
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
];

export default function VaultItemForm({
  isOpen,
  onClose,
  onSaved,
  initialData,
  defaultVaultId,
}: VaultItemFormProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Core Identification
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('Login');
  const [tagsInput, setTagsInput] = useState('');
  const [vaultId, setVaultId] = useState('00000000-0000-0000-0000-000000000000');
  const [availableVaults, setAvailableVaults] = useState<InnerVault[]>([]);

  // Strict Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState(''); // General notes / Secure Note content

  // Extended Fields for Specialized Types
  const [extCardNumber, setExtCardNumber] = useState('');
  const [extCardExp, setExtCardExp] = useState('');
  const [extCardName, setExtCardName] = useState('');
  const [extWalletAddress, setExtWalletAddress] = useState('');

  // Expanded Identity Fields
  const [extIdentityName, setExtIdentityName] = useState('');
  const [extIdentityDob, setExtIdentityDob] = useState('');
  const [extIdentityPhone, setExtIdentityPhone] = useState('');
  const [extIdentityAddress, setExtIdentityAddress] = useState('');

  // 2FA
  const [has2FA, setHas2FA] = useState(false);
  const [recoveryCodesInput, setRecoveryCodesInput] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<ServiceTemplate[]>([]);
  const [globalTags, setGlobalTags] = useState<string[]>([]);

  // Keyboard navigation focus ring management
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

  const kbRing = kbNav ? 'focus:ring-2 focus:ring-primary/60 focus:outline-none' : 'outline-none';

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
      setVaultId(initialData.vault_id || '00000000-0000-0000-0000-000000000000');
      setTagsInput(initialData.tags.join(', '));

      const rawNotes = initialData.notes
        ? new TextDecoder().decode(new Uint8Array(initialData.notes))
        : '';

      // Parse extended data if it exists
      if (rawNotes.startsWith('---EXT---')) {
        const parts = rawNotes.split('\n\n---NOTES---\n');
        const extData = parts[0].replace('---EXT---\n', '');
        setNotes(parts[1] || '');

        const lines = extData.split('\n');
        lines.forEach((line) => {
          if (line.startsWith('Card Number: ')) setExtCardNumber(line.replace('Card Number: ', ''));
          if (line.startsWith('Card Exp: ')) setExtCardExp(line.replace('Card Exp: ', ''));
          if (line.startsWith('Card Name: ')) setExtCardName(line.replace('Card Name: ', ''));
          if (line.startsWith('Wallet: ')) setExtWalletAddress(line.replace('Wallet: ', ''));
          if (line.startsWith('Full Name: ')) setExtIdentityName(line.replace('Full Name: ', ''));
          if (line.startsWith('DOB: ')) setExtIdentityDob(line.replace('DOB: ', ''));
          if (line.startsWith('Phone: ')) setExtIdentityPhone(line.replace('Phone: ', ''));
          if (line.startsWith('Address: ')) setExtIdentityAddress(line.replace('Address: ', ''));
        });
      } else {
        setNotes(rawNotes);
      }

      switch (initialData.account_type) {
        case 'Login':
          setUsername(initialData.username || '');
          setEmail(initialData.email || '');
          setUrl(initialData.url || '');
          setPassword(
            initialData.password
              ? new TextDecoder().decode(new Uint8Array(initialData.password))
              : ''
          );
          setHas2FA(initialData.has_2fa);
          if (initialData.recovery_codes) {
            setRecoveryCodesInput(
              initialData.recovery_codes
                .map((rc) => new TextDecoder().decode(new Uint8Array(rc.code)))
                .join(', ')
            );
          }
          break;
        case 'Password':
          setUsername(initialData.identifier || '');
          setPassword(
            initialData.password
              ? new TextDecoder().decode(new Uint8Array(initialData.password))
              : ''
          );
          break;
        case 'Secure Note':
          break;
        case 'Credit Card':
          setExtCardName(initialData.cardholder_name || '');
          setExtCardNumber(
            initialData.card_number
              ? new TextDecoder().decode(new Uint8Array(initialData.card_number))
              : ''
          );
          setExtCardExp(initialData.expiration || '');
          setPassword(
            initialData.cvv ? new TextDecoder().decode(new Uint8Array(initialData.cvv)) : ''
          );
          break;
        case 'Identity':
          setUsername(initialData.id_number || '');
          break;
        case 'Crypto Wallet':
          setExtWalletAddress(initialData.wallet_address || '');
          setPassword(
            initialData.seed_phrase
              ? new TextDecoder().decode(new Uint8Array(initialData.seed_phrase))
              : ''
          );
          break;
      }
    } else if (isOpen) {
      setStep(1);
      setName('');
      setAccountType('Login');
      setTagsInput('');
      setVaultId(defaultVaultId || '00000000-0000-0000-0000-000000000000');
      setUsername('');
      setEmail('');
      setUrl('');
      setPassword('');
      setNotes('');
      setExtCardNumber('');
      setExtCardExp('');
      setExtCardName('');
      setExtWalletAddress('');
      setExtIdentityName('');
      setExtIdentityDob('');
      setExtIdentityPhone('');
      setExtIdentityAddress('');
      setHas2FA(false);
      setRecoveryCodesInput('');
      setError('');
    }
  }, [initialData, isOpen, defaultVaultId]);

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

  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (val.length > 0) {
      const filtered = popularServices.filter(
        (service) =>
          service.name.toLowerCase().includes(val.toLowerCase()) ||
          service.url.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleUrlSelect = (key: React.Key | null) => {
    if (!key) return;
    const service = popularServices.find((s) => s.name === key);
    if (service) {
      setUrl(service.url);
      if (!name) setName(service.name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return setError('Item Name is required.');
    if ((accountType === 'Login' || accountType === 'Password') && !password)
      return setError('Password is required.');

    setIsSaving(true);
    setError('');

    try {
      const now = Date.now();

      // Serialize extended fields into notes for storage
      let compiledNotes = notes.trim();
      let extendedData = '';

      if (accountType === 'Credit Card') {
        extendedData += `Card Name: ${extCardName}\nCard Number: ${extCardNumber}\nCard Exp: ${extCardExp}\n`;
      } else if (accountType === 'Crypto Wallet') {
        extendedData += `Wallet: ${extWalletAddress}\n`;
      } else if (accountType === 'Identity') {
        extendedData += `Full Name: ${extIdentityName}\nDOB: ${extIdentityDob}\nPhone: ${extIdentityPhone}\nAddress: ${extIdentityAddress}\n`;
      }

      if (extendedData) {
        compiledNotes = `---EXT---\n${extendedData}\n---NOTES---\n${compiledNotes}`;
      }

      const notesBytes =
        compiledNotes.length > 0 ? Array.from(new TextEncoder().encode(compiledNotes)) : null;

      const baseAccount: BaseAccount = {
        id: initialData ? initialData.id : crypto.randomUUID(),
        vault_id: vaultId,
        account_name: name,
        notes: notesBytes,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        // Preserve existing favorite status if editing, default false if new
        is_favorite: initialData ? initialData.is_favorite : false,
        metadata: initialData?.metadata || {
          created_at: now,
          updated_at: now,
          accessed_at: now,
          archived_at: null,
        },
      };

      let newAccount: Account;

      switch (accountType) {
        case 'Login':
          newAccount = {
            ...baseAccount,
            account_type: 'Login',
            url: url || null,
            username: username || null,
            email: email || null,
            password: password ? Array.from(new TextEncoder().encode(password)) : null,
            password_history:
              initialData && initialData.account_type === 'Login'
                ? initialData.password_history
                : [],
            has_2fa: has2FA,
            recovery_codes: recoveryCodesInput
              .split(/[\n,]+/)
              .map((c) => c.trim())
              .filter((c) => c.length > 0)
              .map((c) => ({
                code: Array.from(new TextEncoder().encode(c)),
                is_used: false,
              })),
          };
          break;
        case 'Password':
          newAccount = {
            ...baseAccount,
            account_type: 'Password',
            identifier: username || null,
            url: null,
            password: password ? Array.from(new TextEncoder().encode(password)) : null,
          };
          break;
        case 'Secure Note':
          newAccount = { ...baseAccount, account_type: 'Secure Note' };
          break;
        case 'Credit Card':
          newAccount = {
            ...baseAccount,
            account_type: 'Credit Card',
            cardholder_name: extCardName || null,
            card_number: extCardNumber ? Array.from(new TextEncoder().encode(extCardNumber)) : null,
            expiration: extCardExp || null,
            cvv: password ? Array.from(new TextEncoder().encode(password)) : null,
          };
          break;
        case 'Identity':
          newAccount = {
            ...baseAccount,
            account_type: 'Identity',
            id_number: username || null,
            dob: extIdentityDob || null,
          };
          break;
        case 'Crypto Wallet':
          newAccount = {
            ...baseAccount,
            account_type: 'Crypto Wallet',
            wallet_address: extWalletAddress || null,
            seed_phrase: password ? Array.from(new TextEncoder().encode(password)) : null,
          };
          break;
        default:
          throw new Error('Invalid Account Type');
      }

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

  const renderUrlComboBox = (labelText: string) => (
    <ComboBox
      inputValue={url}
      onInputChange={handleUrlChange}
      onChange={handleUrlSelect}
      items={suggestions}
      menuTrigger="focus"
      className="w-full flex flex-col gap-1"
    >
      <Label className="text-sm font-medium text-text-muted">{labelText}</Label>
      <div className="relative w-full group">
        <Input
          placeholder="https://"
          className={`w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md text-text-main outline-none focus-visible:border-primary transition-colors data-invalid:border-danger ${kbRing}`}
        />
        <Button className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer text-text-muted hover:text-text-main outline-none">
          <ChevronDown className="w-4 h-4 transition-transform group-data-open:rotate-180" />
        </Button>
      </div>
      <Popover className="w-(--trigger-width) bg-surface border border-border rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 z-50 placement-bottom select-none">
        <ListBox className="outline-none p-1 max-h-60 overflow-y-auto">
          {(item: ServiceTemplate) => {
            const Icon = item.icon || Globe;
            return (
              <ListBoxItem
                id={item.name}
                textValue={item.url}
                className="px-2 py-1.5 cursor-pointer outline-none data-focused:bg-primary-muted rounded-md flex items-center transition-colors"
              >
                <Icon className="w-4 h-4 mr-3 text-text-muted shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-text-main truncate">{item.name}</span>
                  <span className="text-xs text-text-muted truncate">{item.url}</span>
                </div>
              </ListBoxItem>
            );
          }}
        </ListBox>
      </Popover>
    </ComboBox>
  );

  const renderDynamicFields = () => {
    switch (accountType) {
      case 'Login':
        return (
          <>
            <TextField
              value={username}
              onChange={setUsername}
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">Username</Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors ${kbRing}`}
              />
            </TextField>
            <TextField
              value={email}
              onChange={setEmail}
              type="email"
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">Email</Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors ${kbRing}`}
              />
            </TextField>
            <div className="w-full flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-text-muted">Password *</Label>
                <Button
                  onPress={generatePassword}
                  isDisabled={isGenerating}
                  className={`text-xs font-medium text-primary hover:text-primary-hover flex items-center transition-colors rounded-sm ${kbRing}`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}{' '}
                  Generate Secure
                </Button>
              </div>
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                />
                <Button
                  onPress={() => setShowPassword(!showPassword)}
                  className={`absolute right-2 top-2 text-text-muted hover:text-text-main transition-colors rounded-sm ${kbRing}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {renderUrlComboBox('Website URL')}

            <hr className="border-border my-4" />

            <Switch
              isSelected={has2FA}
              onChange={setHas2FA}
              className="flex items-center justify-between p-3 bg-background border border-border rounded-md group"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-main">
                  Two-Factor Authentication
                </span>
                <span className="text-xs text-text-muted">Is 2FA enabled on this service?</span>
              </div>
              <div
                className={`w-11 h-6 bg-border rounded-full flex items-center transition-colors group-data-selected:bg-primary ${kbRing}`}
              >
                <div className="w-5 h-5 bg-text-main rounded-full transform transition-transform group-data-selected:translate-x-5 translate-x-0.5" />
              </div>
            </Switch>

            {has2FA && (
              <TextField
                value={recoveryCodesInput}
                onChange={setRecoveryCodesInput}
                className="w-full flex flex-col gap-1 animate-in fade-in slide-in-from-top-2"
              >
                <Label className="text-sm font-medium text-text-muted">Backup Recovery Codes</Label>
                <span className="text-xs text-text-muted">
                  Paste codes separated by commas or newlines.
                </span>
                <TextArea
                  rows={3}
                  placeholder="e.g. 8f92-a1b2, 7c83-d4e5..."
                  className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main font-mono text-sm transition-colors resize-none ${kbRing}`}
                />
              </TextField>
            )}
          </>
        );

      case 'Password':
        return (
          <>
            <TextField
              value={username}
              onChange={setUsername}
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">
                Identifier (e.g. Wi-Fi SSID, API Key ID)
              </Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors ${kbRing}`}
              />
            </TextField>
            <div className="w-full flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-text-muted">
                  Password / Secret Key *
                </Label>
                <Button
                  onPress={generatePassword}
                  isDisabled={isGenerating}
                  className={`text-xs font-medium text-primary hover:text-primary-hover flex items-center transition-colors rounded-sm ${kbRing}`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}{' '}
                  Generate Secure
                </Button>
              </div>
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                />
                <Button
                  onPress={() => setShowPassword(!showPassword)}
                  className={`absolute right-2 top-2 text-text-muted hover:text-text-main transition-colors rounded-sm ${kbRing}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        );

      case 'Secure Note':
        return (
          <TextField value={notes} onChange={setNotes} className="w-full flex flex-col gap-1">
            <Label className="text-sm font-medium text-text-muted">Private Note Content *</Label>
            <TextArea
              rows={12}
              placeholder="Write or paste your secure text here..."
              className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main font-mono text-sm transition-colors resize-none ${kbRing}`}
              required
            />
          </TextField>
        );

      case 'Credit Card':
        return (
          <>
            <TextField
              value={extCardName}
              onChange={setExtCardName}
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">Cardholder Name</Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors ${kbRing}`}
              />
            </TextField>
            <TextField
              value={extCardNumber}
              onChange={setExtCardNumber}
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">Card Number</Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                placeholder="0000 0000 0000 0000"
              />
            </TextField>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                value={extCardExp}
                onChange={setExtCardExp}
                className="w-full flex flex-col gap-1"
              >
                <Label className="text-sm font-medium text-text-muted">Expiration</Label>
                <Input
                  className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                  placeholder="MM/YY"
                />
              </TextField>
              <div className="w-full flex flex-col gap-1">
                <Label className="text-sm font-medium text-text-muted">CVV / Security Code</Label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                    placeholder="123"
                  />
                  <Button
                    onPress={() => setShowPassword(!showPassword)}
                    className={`absolute right-2 top-2 text-text-muted hover:text-text-main transition-colors rounded-sm ${kbRing}`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </>
        );

      case 'Identity':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                value={extIdentityName}
                onChange={setExtIdentityName}
                className="w-full flex flex-col gap-1"
              >
                <Label className="text-sm font-medium text-text-muted">Full Legal Name</Label>
                <Input
                  className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors ${kbRing}`}
                  placeholder="John Doe"
                />
              </TextField>
              <TextField
                value={extIdentityDob}
                onChange={setExtIdentityDob}
                className="w-full flex flex-col gap-1"
              >
                <Label className="text-sm font-medium text-text-muted">Date of Birth</Label>
                <Input
                  type="date"
                  className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors ${kbRing}`}
                />
              </TextField>
            </div>

            <TextField
              value={username}
              onChange={setUsername}
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">ID / Passport Number</Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                placeholder="A12345678"
              />
            </TextField>

            <TextField
              value={extIdentityPhone}
              onChange={setExtIdentityPhone}
              type="tel"
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">Phone Number</Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors ${kbRing}`}
                placeholder="+1 (555) 000-0000"
              />
            </TextField>

            <TextField
              value={extIdentityAddress}
              onChange={setExtIdentityAddress}
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">Full Address</Label>
              <TextArea
                rows={3}
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main transition-colors resize-none ${kbRing}`}
                placeholder="123 Main St..."
              />
            </TextField>
          </>
        );

      case 'Crypto Wallet':
        return (
          <>
            <TextField
              value={extWalletAddress}
              onChange={setExtWalletAddress}
              className="w-full flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-text-muted">Public Wallet Address</Label>
              <Input
                className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                placeholder="0x..."
              />
            </TextField>
            <div className="w-full flex flex-col gap-1">
              <Label className="text-sm font-medium text-text-muted">
                Seed Phrase / Private Key *
              </Label>
              <div className="relative">
                {showPassword ? (
                  <textarea
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    rows={3}
                    className={`w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md text-text-main font-mono resize-none transition-colors ${kbRing}`}
                    placeholder="word1 word2 word3..."
                  />
                ) : (
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className={`w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md text-text-main font-mono transition-colors ${kbRing}`}
                  />
                )}
                <Button
                  onPress={() => setShowPassword(!showPassword)}
                  className={`absolute right-2 top-2 text-text-muted hover:text-text-main transition-colors rounded-sm ${kbRing}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(op) => !op && onClose()}
      isDismissable={false}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm data-entering:animate-in data-[entering]:fade-in data-exiting:animate-out data-[exiting]:fade-out"
    >
      <Modal className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-2xl h-175 max-h-[90vh] flex flex-col data-entering:animate-in data-[entering]:zoom-in-95 data-exiting:animate-out data-[exiting]:zoom-out-95 outline-none select-none">
        <Dialog className="flex flex-col h-full outline-none">
          {({ close }) => (
            <>
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background z-10 shrink-0">
                <div className="flex items-center">
                  {step === 2 && !initialData && (
                    <Button
                      onPress={() => setStep(1)}
                      className={`mr-3 p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-md transition-colors ${kbRing}`}
                      aria-label="Go Back"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <Heading className="text-lg font-semibold text-text-main">
                    {step === 1
                      ? 'Choose Item Type'
                      : initialData
                        ? `Edit ${accountType}`
                        : `New ${accountType}`}
                  </Heading>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onPress={close}
                    className={`p-2 text-text-muted hover:text-text-main rounded-md hover:bg-surface transition-colors ${kbRing}`}
                    aria-label="Close form"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* STEP 1 */}
              {step === 1 && (
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
                  <p className="text-sm text-text-muted mb-6">
                    What kind of item would you like to create?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {ITEM_TYPES.map((type) => (
                      <Button
                        key={type.id}
                        onPress={() => {
                          setAccountType(type.id);
                          setStep(2);
                        }}
                        className={`flex flex-col items-start p-5 bg-surface border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left shadow-sm group w-full h-full ${kbRing}`}
                      >
                        <div className="p-2.5 bg-background border border-border rounded-lg mb-4 group-hover:border-primary/30 transition-colors">
                          <type.icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-text-main text-sm mb-1">{type.name}</h3>
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                          {type.description}
                        </p>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="flex flex-col h-full overflow-hidden bg-surface">
                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <form
                      id="vault-form"
                      onSubmit={handleSave}
                      className="space-y-6 max-w-xl mx-auto w-full"
                    >
                      <div className="space-y-4 pt-2">
                        <TextField
                          value={name}
                          onChange={setName}
                          className="w-full flex flex-col gap-1"
                          isRequired
                          autoFocus
                        >
                          <Label className="text-sm font-medium text-text-muted">Item Name *</Label>
                          <Input
                            placeholder="e.g. My Personal GitHub, Work Email"
                            className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main outline-none focus-visible:border-primary transition-colors data-invalid:border-danger ${kbRing}`}
                          />
                        </TextField>
                      </div>

                      <hr className="border-border" />
                      <div className="space-y-4">{renderDynamicFields()}</div>
                      <hr className="border-border" />

                      <div className="space-y-4 pb-4">
                        <div>
                          <Label className="flex items-center text-sm font-medium text-text-muted mb-2">
                            <Tag className="w-4 h-4 mr-1.5" /> Classification Tags
                          </Label>
                          {globalTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {globalTags.map((tag) => {
                                const isSelected = tagsInput
                                  .split(',')
                                  .map((t) => t.trim())
                                  .includes(tag);
                                return (
                                  <Button
                                    key={tag}
                                    onPress={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-background text-text-main border-border hover:border-primary hover:text-primary'} ${kbRing}`}
                                  >
                                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                          <TextField
                            value={tagsInput}
                            onChange={setTagsInput}
                            className="w-full flex flex-col gap-1"
                          >
                            <Input
                              placeholder="Or type custom tags (comma separated)..."
                              className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main text-sm transition-colors ${kbRing}`}
                            />
                          </TextField>
                        </div>

                        {accountType !== 'Secure Note' && (
                          <TextField
                            value={notes}
                            onChange={setNotes}
                            className="w-full flex flex-col gap-1"
                          >
                            <Label className="text-sm font-medium text-text-muted">
                              General Secure Notes
                            </Label>
                            <TextArea
                              rows={4}
                              placeholder="Add private details here..."
                              className={`w-full px-3 py-2 bg-background border border-border rounded-md text-text-main text-sm transition-colors resize-none ${kbRing}`}
                            />
                          </TextField>
                        )}
                      </div>

                      {error && (
                        <div
                          role="alert"
                          className="p-3 bg-danger/10 border border-danger/20 rounded-md animate-in fade-in mb-4"
                        >
                          <p className="text-sm text-danger font-medium">{error}</p>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* FOOTER */}
                  <div className="px-6 md:px-8 py-4 border-t border-border bg-background z-10 shrink-0">
                    <div className="max-w-xl mx-auto w-full flex items-center justify-end space-x-3">
                      <Select
                        value={vaultId}
                        onChange={(key) => setVaultId(key as string)}
                        aria-label="Select Vault"
                      >
                        <Button
                          className={`flex items-center justify-between min-w-35 h-10 px-3 bg-surface border border-border rounded-md text-text-main text-sm font-medium transition-colors outline-none ${kbRing}`}
                        >
                          <SelectValue className="flex items-center truncate" />
                          <ChevronDown className="w-4 h-4 ml-2 text-text-muted opacity-70 shrink-0" />
                        </Button>
                        <Popover
                          placement="top end"
                          offset={4}
                          className="w-(--trigger-width) bg-surface border border-border rounded-md shadow-xl z-50 data-entering:animate-in data-[entering]:fade-in data-[entering]:slide-in-from-bottom-2 data-exiting:animate-out data-[exiting]:fade-out data-[exiting]:slide-out-to-bottom-2 select-none"
                        >
                          <ListBox className="outline-none p-1 max-h-48 overflow-y-auto">
                            {availableVaults.map((v) => (
                              <ListBoxItem
                                key={v.id}
                                id={v.id}
                                textValue={v.name}
                                className="px-2 py-1.5 cursor-pointer outline-none data-focused:bg-primary-muted rounded-md text-sm text-text-main transition-colors flex items-center"
                              >
                                <Folder className="w-3.5 h-3.5 mr-2 text-text-muted shrink-0" />
                                <span className="truncate">{v.name}</span>
                              </ListBoxItem>
                            ))}
                          </ListBox>
                        </Popover>
                      </Select>

                      <Button
                        type="submit"
                        form="vault-form"
                        isDisabled={
                          isSaving ||
                          !name ||
                          ((accountType === 'Login' || accountType === 'Password') && !password) ||
                          (accountType === 'Secure Note' && !notes)
                        }
                        className={`h-10 px-6 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center min-w-20 outline-none ${kbRing}`}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
