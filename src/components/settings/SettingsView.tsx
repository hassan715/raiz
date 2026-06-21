import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';
import {
  enable as enableAutostart,
  disable as disableAutostart,
  isEnabled as isAutostartEnabled,
} from '@tauri-apps/plugin-autostart';
import { useTheme } from '../../context/ThemeContext';
import { InnerVault } from '../../types';
import {
  Shield,
  Loader2,
  Palette,
  Plus,
  X,
  Sliders,
  Lock,
  Info,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Check,
  Minus,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Button,
  TextField,
  Label,
  Input,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  Checkbox,
  ModalOverlay,
  Modal,
  Dialog,
  Heading,
} from 'react-aria-components';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getVersion, getName } from '@tauri-apps/api/app';

// Helper component for clean, reusable checkboxes
const SettingsCheckbox = ({
  isSelected,
  onChange,
  title,
  description,
}: {
  isSelected: boolean;
  onChange: (val: boolean) => void;
  title: string;
  description?: string;
}) => (
  <Checkbox
    isSelected={isSelected}
    onChange={onChange}
    className="flex items-start space-x-3 group outline-none cursor-pointer"
  >
    {({ isSelected: selected }) => (
      <>
        <div
          className={`mt-0.5 flex w-4 h-4 shrink-0 items-center justify-center rounded border transition-colors ${
            selected
              ? 'bg-primary border-primary'
              : 'bg-background border-border group-hover:border-primary/50'
          }`}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-main">{title}</span>
          {description && (
            <span className="text-xs text-text-muted mt-0.5 leading-relaxed max-w-xl">
              {description}
            </span>
          )}
        </div>
      </>
    )}
  </Checkbox>
);

// Helper component for keyboard shortcut inputs
const ShortcutField = ({
  label,
  value,
  onChange,
  placeholder = 'Enter shortcut',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-text-main w-1/3">{label}</span>
    <TextField
      value={value}
      onChange={onChange}
      className="relative flex-1 max-w-[240px] flex flex-col"
      aria-label={label}
    >
      <Input
        placeholder={placeholder}
        className="w-full pl-3 pr-8 py-1.5 bg-background border border-border rounded-md text-text-main text-sm outline-none focus-visible:border-primary transition-colors"
      />
      {value && (
        <Button
          onPress={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main outline-none flex items-center justify-center bg-text-muted/20 hover:bg-text-muted/40 rounded-full p-0.5 transition-colors"
          aria-label="Clear shortcut"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </TextField>
  </div>
);

// Format timeout minutes to human readable strings
const formatTimeout = (mins: number) => {
  if (mins === 0) return 'Never';
  if (mins === 60) return '1 hour';
  return `${mins} minutes`;
};

// Preset Definitions
const PRESETS = {
  Convenient: {
    lockTimeout: 60,
    lockOnSleep: false,
    clearClipboard: false,
    desc: 'Raiz stays unlocked longer. Perfect for private home computers.',
  },
  Balanced: {
    lockTimeout: 10,
    lockOnSleep: true,
    clearClipboard: true,
    desc: 'A mix of security and convenience. Locks after 10 minutes.',
  },
  Strict: {
    lockTimeout: 1,
    lockOnSleep: true,
    clearClipboard: true,
    desc: 'Maximum security. Locks almost immediately when inactive.',
  },
};

type PresetKey = keyof typeof PRESETS;

export default function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');

  // --- GENERAL TAB STATE ---
  const [keepInTray, setKeepInTray] = useState(
    () => localStorage.getItem('raiz_keep_tray') !== 'false'
  );
  const [trayAction, setTrayAction] = useState(
    () => localStorage.getItem('raiz_tray_action') || 'show_main'
  );
  const [prefillUsername, setPrefillUsername] = useState(
    () => localStorage.getItem('raiz_prefill') !== 'false'
  );
  const [defaultVault, setDefaultVault] = useState(
    () => localStorage.getItem('raiz_default_vault') || 'suggest'
  );

  const [scLock, setScLock] = useState(
    () => localStorage.getItem('raiz_sc_lock') || 'Ctrl+Shift+L'
  );
  const [openOnStartup, setOpenOnStartup] = useState(false);

  useEffect(() => {
    isAutostartEnabled().then(setOpenOnStartup).catch(console.error);
  }, []);

  const updateShortcut = (
    key: string,
    val: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(val);
    localStorage.setItem(key, val);
  };

  // --- APPEARANCE TAB STATE ---
  const [zoomLevel, setZoomLevel] = useState(() =>
    parseInt(localStorage.getItem('raiz_zoom') || '100', 10)
  );
  const [showTags, setShowTags] = useState(
    () => localStorage.getItem('raiz_show_tags') !== 'false'
  );

  useEffect(() => {
    // Cast properly to avoid "any" warning
    (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom =
      `${zoomLevel}%`;
  }, [zoomLevel]);

  const updateZoom = (newZoom: number) => {
    const clamped = Math.max(50, Math.min(newZoom, 200));
    setZoomLevel(clamped);
    localStorage.setItem('raiz_zoom', clamped.toString());
    (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = `${clamped}%`;
  };

  // --- SECURITY TAB STATE ---
  const [lockTimeout, setLockTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('raiz_auto_lock');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [lockOnSleep, setLockOnSleep] = useState(
    () => localStorage.getItem('raiz_lock_sleep') !== 'false'
  );
  const [clearClipboard, setClearClipboard] = useState(
    () => localStorage.getItem('raiz_clear_clipboard') !== 'false'
  );

  const [concealedAlwaysShow, setConcealedAlwaysShow] = useState(
    () => localStorage.getItem('raiz_concealed_always') === 'true'
  );
  const [concealedHoldCtrlAlt, setConcealedHoldCtrlAlt] = useState(
    () => localStorage.getItem('raiz_concealed_ctrlalt') === 'true'
  );

  const updateLockTimeout = (val: number) => {
    setLockTimeout(val);
    localStorage.setItem('raiz_auto_lock', val.toString());
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // --- SECURITY PRESET MODAL STATE ---
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [previewPreset, setPreviewPreset] = useState<PresetKey>('Balanced');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  // Evaluate Current Preset Dynamically
  let activePreset = 'Custom';
  if (lockTimeout === 1 && lockOnSleep && clearClipboard) {
    activePreset = 'Strict';
  } else if (lockTimeout === 10 && lockOnSleep && clearClipboard) {
    activePreset = 'Balanced';
  } else if (lockTimeout === 60 && !lockOnSleep && !clearClipboard) {
    activePreset = 'Convenient';
  }

  const handleOpenPresetModal = () => {
    setPreviewPreset(activePreset !== 'Custom' ? (activePreset as PresetKey) : 'Balanced');
    setIsPreviewExpanded(false);
    setIsPresetModalOpen(true);
  };

  const applySelectedPreset = () => {
    const p = PRESETS[previewPreset];
    updateLockTimeout(p.lockTimeout);
    setLockOnSleep(p.lockOnSleep);
    localStorage.setItem('raiz_lock_sleep', p.lockOnSleep.toString());
    setClearClipboard(p.clearClipboard);
    localStorage.setItem('raiz_clear_clipboard', p.clearClipboard.toString());
    setIsPresetModalOpen(false);
  };

  // --- PRIVACY TAB STATE ---
  const [blurOnUnfocus, setBlurOnUnfocus] = useState(
    () => localStorage.getItem('raiz_blur_unfocus') === 'true'
  );
  const [preventScreenCapture, setPreventScreenCapture] = useState(
    () => localStorage.getItem('raiz_prevent_capture') === 'true'
  );

  // --- ADVANCED TAB STATE ---
  const [releaseChannel, setReleaseChannel] = useState(
    () => localStorage.getItem('raiz_release_channel') || 'Production'
  );
  const [appLanguage, setAppLanguage] = useState(
    () => localStorage.getItem('raiz_app_language') || 'Use system defaults'
  );

  const [vaults, setVaults] = useState<InnerVault[]>([]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lastChecked, setLastChecked] = useState(() =>
    localStorage.getItem('raiz_last_update_check')
  );

  const [appVersion, setAppVersion] = useState('0.1.0');
  const [osName, setOsName] = useState('Windows');
  const [appName, setAppName] = useState('Raiz');

  useEffect(() => {
    // Dynamically fetch the app name from tauri.conf.json
    getName().then(setAppName).catch(console.error);

    // Fetch exact app version from tauri.conf.json
    getVersion().then(setAppVersion).catch(console.error);

    // Dynamically detect the user's Operating System
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Mac') !== -1) setOsName('macOS');
    else if (userAgent.indexOf('Linux') !== -1) setOsName('Linux');
    else setOsName('Windows');
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedVaults = await invoke<InnerVault[]>('get_vaults');
        setVaults(fetchedVaults);
      } catch (err) {
        console.error('Failed to load settings data:', err);
      }
    };
    fetchData();
  }, []);

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
      setPwdMessage({ type: 'success', text: 'Vault password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      const err = error as Error;
      setPwdMessage({ type: 'error', text: err.toString() || 'Failed to change password.' });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleDeleteVault = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await invoke('delete_entire_vault');
      await emit('vault-deleted-global');
      getCurrentWindow().close();
    } catch (error) {
      const err = error as Error;
      alert(`Failed to delete vault: ${err.toString()}`);
      setIsDeleting(false);
    }
  };

  // HELPER TO OPEN GITHUB UPDATES
  const handleCheckForUpdates = () => {
    // 1. Format and save the current date and time
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const formattedTime = `${datePart} at ${timePart}`;

    setLastChecked(formattedTime);
    localStorage.setItem('raiz_last_update_check', formattedTime);

    // 2. Open GitHub URL
    const isPreRelease = releaseChannel === 'Beta' || releaseChannel === 'Nightly';
    const url = isPreRelease
      ? 'https://github.com/hassan715/raiz/releases'
      : 'https://github.com/hassan715/raiz/releases/latest';
    openUrl(url).catch(console.error);
  };

  return (
    <>
      <Tabs
        orientation="vertical"
        selectedKey={activeTab}
        onSelectionChange={(k) => setActiveTab(k as string)}
        className="flex h-screen w-full bg-background text-text-main overflow-hidden select-none"
      >
        {/* SETTINGS SIDEBAR */}
        <div className="w-[276px] bg-sidebar border-r border-border flex flex-col shrink-0 py-6">
          <TabList
            aria-label="Settings Navigation"
            className="flex flex-col items-center w-full space-y-1.5 overflow-y-auto overflow-x-hidden px-[18.5px] outline-none"
          >
            <Tab
              id="general"
              className={({ isSelected }) =>
                `w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`
              }
            >
              <Sliders className="w-4 h-4 mr-3 shrink-0" /> General
            </Tab>
            <Tab
              id="appearance"
              className={({ isSelected }) =>
                `w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`
              }
            >
              <Palette className="w-4 h-4 mr-3 shrink-0" /> Appearance
            </Tab>
            <Tab
              id="security"
              className={({ isSelected }) =>
                `w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`
              }
            >
              <Shield className="w-4 h-4 mr-3 shrink-0" /> Security
            </Tab>
            <Tab
              id="privacy"
              className={({ isSelected }) =>
                `w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`
              }
            >
              <Lock className="w-4 h-4 mr-3 shrink-0" /> Privacy
            </Tab>

            <Tab
              id="advanced"
              className={({ isSelected }) =>
                `relative mt-3.5 before:content-[''] before:absolute before:-top-[7px] before:left-1 before:right-1 before:h-px before:bg-border before:opacity-50 w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`
              }
            >
              <SettingsIcon className="w-4 h-4 mr-3 shrink-0" /> Advanced
            </Tab>
            <Tab
              id="about"
              className={({ isSelected }) =>
                `w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`
              }
            >
              <Info className="w-4 h-4 mr-3 shrink-0" /> About
            </Tab>
          </TabList>
        </div>

        {/* SETTINGS CONTENT PANE */}
        <div className="flex-1 overflow-y-auto bg-background p-8 relative">
          {/* GENERAL TAB */}
          <TabPanel
            id="general"
            className="max-w-2xl outline-none animate-in slide-in-from-bottom-2 fade-in duration-300 pb-12"
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <SettingsCheckbox
                  isSelected={keepInTray}
                  onChange={(v) => {
                    setKeepInTray(v);
                    localStorage.setItem('raiz_keep_tray', v.toString());
                  }}
                  title="Keep Raiz in the notification area"
                  description="Raiz will be available in the notification area even when the main window is closed."
                />
                <div className="pl-7 flex items-center space-x-3">
                  <span className="text-sm text-text-main">Click the icon to:</span>
                  <Select
                    selectedKey={trayAction}
                    onSelectionChange={(k) => {
                      setTrayAction(k as string);
                      localStorage.setItem('raiz_tray_action', k as string);
                    }}
                    aria-label="Tray action"
                  >
                    <Button className="flex items-center justify-between min-w-[200px] px-3 py-1.5 bg-background border border-border rounded-md text-text-main text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                      <SelectValue />
                      <ChevronDown className="w-4 h-4 text-text-muted opacity-70 shrink-0 ml-2" />
                    </Button>
                    <Popover
                      placement="bottom start"
                      className="w-[200px] bg-surface border border-border rounded-md shadow-xl z-50"
                    >
                      <ListBox className="outline-none p-1">
                        <ListBoxItem
                          id="show_main"
                          className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                        >
                          Show the main window
                        </ListBoxItem>
                        <ListBoxItem
                          id="lock_vault"
                          className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                        >
                          Lock Raiz
                        </ListBoxItem>
                      </ListBox>
                    </Popover>
                  </Select>
                </div>
              </div>

              <SettingsCheckbox
                isSelected={openOnStartup}
                onChange={async (v) => {
                  setOpenOnStartup(v);
                  if (v) await enableAutostart();
                  else await disableAutostart();
                }}
                title="Open Raiz on startup"
                description="Launch the application automatically when you log into your computer."
              />

              <SettingsCheckbox
                isSelected={prefillUsername}
                onChange={(v) => {
                  setPrefillUsername(v);
                  localStorage.setItem('raiz_prefill', v.toString());
                }}
                title="Prefill username when creating a new login"
                description="This will prefill the username field with the most commonly used username unless a default email is set in Profile."
              />

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Default Vault</h4>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-text-main">Save new items in:</span>
                  <Select
                    selectedKey={defaultVault}
                    onSelectionChange={(k) => {
                      setDefaultVault(k as string);
                      localStorage.setItem('raiz_default_vault', k as string);
                    }}
                    aria-label="Default Vault"
                  >
                    <Button className="flex items-center justify-between min-w-[200px] px-3 py-1.5 bg-background border border-border rounded-md text-text-main text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                      <SelectValue />
                      <ChevronDown className="w-4 h-4 text-text-muted opacity-70 shrink-0 ml-2" />
                    </Button>
                    <Popover
                      placement="bottom start"
                      className="w-[200px] bg-surface border border-border rounded-md shadow-xl z-50"
                    >
                      <ListBox className="outline-none p-1 max-h-48 overflow-y-auto">
                        <ListBoxItem
                          id="suggest"
                          className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                        >
                          Suggest a vault
                        </ListBoxItem>
                        {vaults.map((v) => (
                          <ListBoxItem
                            key={v.id}
                            id={v.id}
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            {v.name}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Popover>
                  </Select>
                </div>
              </div>

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Keyboard Shortcut</h4>
                <div className="space-y-2">
                  <ShortcutField
                    label="Lock Raiz:"
                    value={scLock}
                    onChange={(v) => updateShortcut('raiz_sc_lock', v, setScLock)}
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          {/* APPEARANCE TAB */}
          <TabPanel
            id="appearance"
            className="max-w-2xl outline-none animate-in slide-in-from-bottom-2 fade-in duration-300 pb-12"
          >
            <div className="space-y-8">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-text-main font-medium">Theme:</span>
                <Select
                  selectedKey={theme}
                  onSelectionChange={(k) => setTheme(k as 'light' | 'dark' | 'system')}
                  aria-label="Theme Selection"
                >
                  <Button className="flex items-center justify-between min-w-[160px] px-3 py-1.5 bg-background border border-border rounded-md text-text-main text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                    <SelectValue />
                    <ChevronDown className="w-4 h-4 text-text-muted opacity-70 shrink-0 ml-2" />
                  </Button>
                  <Popover
                    placement="bottom start"
                    className="w-[160px] bg-surface border border-border rounded-md shadow-xl z-50"
                  >
                    <ListBox className="outline-none p-1">
                      <ListBoxItem
                        id="system"
                        className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                      >
                        Match system
                      </ListBoxItem>
                      <ListBoxItem
                        id="light"
                        className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                      >
                        Light
                      </ListBoxItem>
                      <ListBoxItem
                        id="dark"
                        className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                      >
                        Dark
                      </ListBoxItem>
                    </ListBox>
                  </Popover>
                </Select>
              </div>

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Interface Zoom</h4>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center bg-background border border-border rounded-md overflow-hidden">
                    <Button
                      onPress={() => updateZoom(zoomLevel - 10)}
                      className="p-1.5 text-text-muted hover:bg-surface hover:text-text-main transition-colors outline-none cursor-pointer"
                      aria-label="Zoom Out"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-text-main px-4 min-w-[4rem] text-center">
                      {zoomLevel}%
                    </span>
                    <Button
                      onPress={() => updateZoom(zoomLevel + 10)}
                      className="p-1.5 text-text-muted hover:bg-surface hover:text-text-main transition-colors outline-none cursor-pointer"
                      aria-label="Zoom In"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onPress={() => updateZoom(100)}
                    isDisabled={zoomLevel === 100}
                    className="px-3 py-1.5 text-sm font-medium text-text-main bg-background border border-border rounded-md hover:bg-surface disabled:opacity-50 transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Always Show in Sidebar</h4>
                <div className="space-y-3">
                  <SettingsCheckbox
                    isSelected={showTags}
                    onChange={(v) => {
                      setShowTags(v);
                      localStorage.setItem('raiz_show_tags', v.toString());
                    }}
                    title="Tags"
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          {/* SECURITY TAB */}
          <TabPanel
            id="security"
            className="max-w-2xl outline-none space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300 pb-12"
          >
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-text-main">App unlock preset:</span>
                <span className="text-sm text-text-muted font-medium">({activePreset})</span>
                <Button
                  onPress={handleOpenPresetModal}
                  className="ml-auto px-4 py-1.5 bg-background border border-border text-primary text-sm font-medium rounded-md hover:bg-primary/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  Choose preset
                </Button>
              </div>
              <p className="text-xs text-text-muted -mt-4">
                These settings apply only to this device.
              </p>

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Auto-lock</h4>
                <div className="space-y-4">
                  <SettingsCheckbox
                    isSelected={lockOnSleep}
                    onChange={(v) => {
                      setLockOnSleep(v);
                      localStorage.setItem('raiz_lock_sleep', v.toString());
                    }}
                    title="Lock when device locks or sleeps"
                  />
                  <div className="flex items-center space-x-3 pl-7">
                    <span className="text-sm text-text-main">
                      Lock after the device is idle for:
                    </span>
                    <Select
                      selectedKey={lockTimeout.toString()}
                      onSelectionChange={(k) => updateLockTimeout(Number(k))}
                      aria-label="Auto-lock timeout"
                    >
                      <Button className="flex items-center justify-between min-w-[120px] px-3 py-1 bg-background border border-border rounded-md text-text-main text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                        <SelectValue />
                        <ChevronDown className="w-4 h-4 text-text-muted opacity-70 shrink-0 ml-2" />
                      </Button>
                      <Popover
                        placement="bottom start"
                        className="w-[120px] bg-surface border border-border rounded-md shadow-xl z-50"
                      >
                        <ListBox className="outline-none p-1">
                          <ListBoxItem
                            id="1"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            1 minute
                          </ListBoxItem>
                          <ListBoxItem
                            id="3"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            3 minutes
                          </ListBoxItem>
                          <ListBoxItem
                            id="5"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            5 minutes
                          </ListBoxItem>
                          <ListBoxItem
                            id="10"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            10 minutes
                          </ListBoxItem>
                          <ListBoxItem
                            id="15"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            15 minutes
                          </ListBoxItem>
                          <ListBoxItem
                            id="30"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            30 minutes
                          </ListBoxItem>
                          <ListBoxItem
                            id="60"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            1 hour
                          </ListBoxItem>
                          <ListBoxItem
                            id="0"
                            className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                          >
                            Never
                          </ListBoxItem>
                        </ListBox>
                      </Popover>
                    </Select>
                  </div>
                </div>
              </div>

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Clipboard</h4>
                <SettingsCheckbox
                  isSelected={clearClipboard}
                  onChange={(v) => {
                    setClearClipboard(v);
                    localStorage.setItem('raiz_clear_clipboard', v.toString());
                  }}
                  title="Remove copied information and one-time passwords after 90 seconds"
                />
              </div>

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Concealed Fields</h4>
                <div className="space-y-3">
                  <SettingsCheckbox
                    isSelected={concealedAlwaysShow}
                    onChange={(v) => {
                      setConcealedAlwaysShow(v);
                      localStorage.setItem('raiz_concealed_always', v.toString());
                    }}
                    title="Always show passwords and full credit card numbers"
                  />
                  <SettingsCheckbox
                    isSelected={concealedHoldCtrlAlt}
                    onChange={(v) => {
                      setConcealedHoldCtrlAlt(v);
                      localStorage.setItem('raiz_concealed_ctrlalt', v.toString());
                    }}
                    title="Hold Ctrl+Alt to toggle revealed fields"
                  />
                </div>
              </div>

              <hr className="border-border my-6" />

              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">Vault Password</h4>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-3">
                    <TextField
                      isRequired
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      className="flex flex-col gap-1 max-w-sm"
                    >
                      <Label className="text-xs font-medium text-text-muted">
                        Current Password
                      </Label>
                      <Input
                        type="password"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary text-sm transition-colors"
                      />
                    </TextField>
                    <TextField
                      isRequired
                      value={newPassword}
                      onChange={setNewPassword}
                      className="flex flex-col gap-1 max-w-sm"
                    >
                      <Label className="text-xs font-medium text-text-muted">New Password</Label>
                      <Input
                        type="password"
                        placeholder="At least 12 characters"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main focus:outline-none focus:border-primary text-sm transition-colors"
                      />
                    </TextField>
                  </div>
                  {pwdMessage && (
                    <div
                      className={`p-3 rounded-md text-sm font-medium max-w-sm ${pwdMessage.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}
                    >
                      {pwdMessage.text}
                    </div>
                  )}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      isDisabled={isChangingPwd || !currentPassword || !newPassword}
                      className="flex justify-center items-center px-4 py-2 bg-surface border border-border text-text-main text-sm font-medium rounded-md hover:bg-surface-hover transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer w-fit"
                    >
                      {isChangingPwd && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
                      Change Password
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </TabPanel>

          {/* PRIVACY TAB */}
          <TabPanel
            id="privacy"
            className="max-w-2xl outline-none animate-in slide-in-from-bottom-2 fade-in duration-300 pb-12"
          >
            <div className="space-y-6">
              {/* Core Philosophy Banner */}
              <div className="p-5 border border-primary/20 rounded-xl bg-primary/5 flex items-start space-x-4">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-text-main mb-1">Offline First Guarantee</h4>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Raiz operates entirely offline locally on your machine. Your data never leaves
                    your device unless you explicitly export it. There is absolutely no telemetry,
                    cloud analytics, or remote tracking running in the background.
                  </p>
                </div>
              </div>

              <hr className="border-border my-6" />

              {/* Shoulder Surfing Protection */}
              <div>
                <h4 className="text-sm font-bold text-text-main mb-3">
                  Shoulder Surfing Protection
                </h4>
                <div className="space-y-4">
                  <SettingsCheckbox
                    isSelected={blurOnUnfocus}
                    onChange={(v) => {
                      setBlurOnUnfocus(v);
                      localStorage.setItem('raiz_blur_unfocus', v.toString());
                    }}
                    title="Blur application when it loses focus"
                    description="Automatically conceals your vault contents when you switch to another app."
                  />
                  <SettingsCheckbox
                    isSelected={preventScreenCapture}
                    onChange={(v) => {
                      setPreventScreenCapture(v);
                      localStorage.setItem('raiz_prevent_capture', v.toString());
                    }}
                    title="Prevent screen capture"
                    description="Attempts to block screenshots and screen recordings of the application window."
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          {/* ADVANCED TAB */}
          <TabPanel
            id="advanced"
            className="max-w-2xl outline-none space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300 pb-12"
          >
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-text-main">Release channel:</span>
                  <Select
                    selectedKey={releaseChannel}
                    onSelectionChange={(k) => {
                      setReleaseChannel(k as string);
                      localStorage.setItem('raiz_release_channel', k as string);
                    }}
                    aria-label="Release channel"
                  >
                    <Button className="flex items-center justify-between min-w-[140px] px-3 py-1 bg-background border border-border rounded-md text-text-main text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                      <SelectValue />
                      <ChevronDown className="w-4 h-4 text-text-muted opacity-70 shrink-0 ml-2" />
                    </Button>
                    <Popover className="w-[140px] bg-surface border border-border rounded-md shadow-xl z-50">
                      <ListBox className="outline-none p-1">
                        <ListBoxItem
                          id="Production"
                          className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                        >
                          Production
                        </ListBoxItem>
                        <ListBoxItem
                          id="Beta"
                          className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                        >
                          Beta
                        </ListBoxItem>
                        <ListBoxItem
                          id="Nightly"
                          className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                        >
                          Nightly
                        </ListBoxItem>
                      </ListBox>
                    </Popover>
                  </Select>
                </div>
                <p className="text-sm text-text-muted mt-2 max-w-xl">
                  Betas and Nightlies are published more often. They include less-tested features
                  and improvements.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <span className="text-sm text-text-main">Language:</span>
                <Select
                  selectedKey={appLanguage}
                  onSelectionChange={(k) => {
                    setAppLanguage(k as string);
                    localStorage.setItem('raiz_app_language', k as string);
                  }}
                  aria-label="Language"
                >
                  <Button className="flex items-center justify-between min-w-[180px] px-3 py-1 bg-background border border-border rounded-md text-text-main text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                    <SelectValue />
                    <ChevronDown className="w-4 h-4 text-text-muted opacity-70 shrink-0 ml-2" />
                  </Button>
                  <Popover className="w-[180px] bg-surface border border-border rounded-md shadow-xl z-50">
                    <ListBox className="outline-none p-1">
                      <ListBoxItem
                        id="Use system defaults"
                        className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                      >
                        Use system defaults
                      </ListBoxItem>
                      <ListBoxItem
                        id="English"
                        className="px-2 py-1.5 rounded-md text-sm text-text-main hover:bg-primary/10 cursor-pointer outline-none data-[focused]:bg-primary/10"
                      >
                        English
                      </ListBoxItem>
                    </ListBox>
                  </Popover>
                </Select>
              </div>

              <hr className="border-border my-6" />

              {/* PRE-EXISTING DELETION / RESET LOGIC */}
              <div className="pt-4">
                {!showDeleteConfirm && (
                  <Button
                    onPress={() => setShowDeleteConfirm(true)}
                    className="px-4 py-1.5 bg-background border border-danger text-danger text-sm font-medium rounded-md hover:bg-danger/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-danger/60 cursor-pointer"
                  >
                    Reset Raiz
                  </Button>
                )}
                <p className="text-xs text-text-muted mt-3">
                  Delete all vaults, items, and account information from this app.
                </p>

                {showDeleteConfirm && (
                  <div className="pt-4 mt-4 border-t border-danger/20 animate-in fade-in slide-in-from-top-2">
                    <TextField
                      value={deleteConfirmText}
                      onChange={setDeleteConfirmText}
                      className="flex flex-col gap-2"
                    >
                      <Label className="block text-xs font-medium text-danger/80">
                        Type <strong>DELETE</strong> to confirm
                      </Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          placeholder="DELETE"
                          className="flex-1 px-3 py-2 bg-background border border-danger/30 rounded-md text-text-main focus:outline-none focus:border-danger text-sm transition-colors"
                        />
                        <div className="flex gap-2">
                          <Button
                            onPress={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="px-4 py-2 bg-surface border border-border text-text-main text-sm font-medium rounded-md hover:bg-surface-hover transition-colors outline-none cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            onPress={handleDeleteVault}
                            isDisabled={deleteConfirmText !== 'DELETE' || isDeleting}
                            className="px-4 py-2 bg-danger text-white text-sm font-medium rounded-md hover:bg-danger/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[100px] outline-none cursor-pointer"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            ) : (
                              'Confirm'
                            )}
                          </Button>
                        </div>
                      </div>
                    </TextField>
                  </div>
                )}
              </div>
            </div>
          </TabPanel>

          {/* ABOUT TAB */}
          <TabPanel
            id="about"
            className="max-w-2xl outline-none animate-in slide-in-from-bottom-2 fade-in duration-300 pb-12"
          >
            {/* Custom Illustration Header */}
            <div className="-mx-8 -mt-8 h-36 bg-gradient-to-r from-teal-400 to-sky-400 overflow-hidden relative flex items-center justify-center border-b border-border/30">
              {/* <div className="relative z-10 flex items-center space-x-8 pt-4 drop-shadow-md">
                <div className="w-14 h-24 bg-blue-700 rounded border border-white/20 transform -rotate-12 shadow-xl" />
                <Key className="w-14 h-14 text-yellow-300 transform rotate-12" />
                <div className="w-16 h-16 bg-pink-400 rounded-2xl shadow-xl flex items-center justify-center border-2 border-white/20 z-20">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <div className="w-14 h-24 bg-white/95 rounded border border-gray-200 transform rotate-6 shadow-xl" />
              </div> */}
            </div>

            <div className="flex flex-col items-center mt-8">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-text-main rounded-full flex items-center justify-center shadow-sm">
                  <Shield className="w-6 h-6 text-background shrink-0" />
                </div>
                <h2 className="text-3xl font-extrabold text-text-main tracking-tight">Raiz</h2>
              </div>
              <p className="text-sm text-text-main font-medium mt-1">
                Raiz for {osName} {appVersion}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {__APP_COMMIT_HASH__}, on {releaseChannel.toUpperCase()} channel
              </p>
            </div>

            <div className="mt-8 border border-border rounded-xl p-5 mx-2 bg-background grid grid-cols-[1fr_auto] grid-rows-[auto_auto_auto] items-center shadow-sm">
              <div className="col-start-1 row-start-1 text-sm text-text-muted leading-relaxed">
                {lastChecked ? (
                  <>
                    Last checked for updates on {lastChecked.split(' at ')[0]} at{' '}
                    {lastChecked.split(' at ')[1]}.
                  </>
                ) : (
                  'Never checked for updates.'
                )}
              </div>

              <Button
                onPress={() =>
                  openUrl('https://github.com/hassan715/raiz/releases').catch(console.error)
                }
                className="col-start-1 row-start-3 justify-self-start text-sm text-primary hover:underline outline-none cursor-pointer p-0 border-none bg-transparent"
              >
                Release Notes
              </Button>

              <Button
                onPress={handleCheckForUpdates}
                className="col-start-2 row-start-2 justify-self-end self-center px-4 py-1.5 bg-background border border-primary text-primary text-sm font-medium rounded-md hover:bg-primary/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer whitespace-nowrap"
              >
                Check for Updates
              </Button>
            </div>

            <div className="pt-6 text-center space-y-4">
              <p className="text-xs text-text-muted">
                © {new Date().getFullYear()} {appName}. All rights reserved.
              </p>
              {/* <div className="flex items-center justify-center space-x-4 text-xs text-primary font-medium">
                <Button className="hover:underline outline-none cursor-pointer">Terms of Service</Button>
                <Button className="hover:underline outline-none cursor-pointer">Privacy Policy</Button>
                <Button className="hover:underline outline-none cursor-pointer">Credits & Acknowledgements</Button>
              </div> */}
            </div>
          </TabPanel>
        </div>
      </Tabs>

      {/* --- PRESET SELECTION MODAL OVERLAY --- */}
      <ModalOverlay
        isOpen={isPresetModalOpen}
        onOpenChange={setIsPresetModalOpen}
        isDismissable
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in data-[exiting]:animate-out data-[exiting]:fade-out p-4"
      >
        <Modal className="relative bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-[640px] flex flex-col overflow-hidden max-h-[85vh] outline-none">
          <Dialog
            aria-label="Select Unlock Preset"
            className="outline-none flex flex-col w-full h-full overflow-hidden"
          >
            {({ close }) => (
              <>
                {/* Header Illustration Area */}
                <div className="relative h-24 bg-primary/5 flex items-center justify-center border-b border-border/50 shrink-0">
                  <Button
                    onPress={close}
                    className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text-main rounded-md hover:bg-background transition-colors outline-none cursor-pointer z-50"
                    aria-label="Close preset dialog"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <div className="relative z-10 flex items-center space-x-4">
                    <Shield className="w-8 h-8 text-amber-500 opacity-80" />
                    <div className="w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center z-20">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <Lock className="w-8 h-8 text-sky-500 opacity-80" />
                  </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0">
                  <Heading
                    slot="title"
                    className="text-lg font-bold text-text-main mb-5 text-center shrink-0"
                  >
                    Pick your preferred way to unlock Raiz
                  </Heading>

                  {/* Preset Cards Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6 shrink-0">
                    {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
                      const isSelected = previewPreset === key;
                      const preset = PRESETS[key];
                      return (
                        <Button
                          key={key}
                          onPress={() => setPreviewPreset(key)}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                            isSelected
                              ? 'bg-primary/5 border-primary shadow-sm'
                              : 'bg-background border-border hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5 w-full">
                            <span className="font-bold text-text-main text-sm">{key}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[11px] text-text-muted leading-relaxed">
                            {preset.desc}
                          </p>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Preview Changes Disclosure */}
                  <div className="border border-border rounded-xl bg-background flex flex-col min-h-0">
                    <Button
                      onPress={() => setIsPreviewExpanded(!isPreviewExpanded)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-text-main hover:bg-surface transition-colors outline-none cursor-pointer shrink-0"
                    >
                      Preview changes
                      {isPreviewExpanded ? (
                        <ChevronUp className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      )}
                    </Button>

                    {isPreviewExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border bg-surface/30 animate-in fade-in duration-200 overflow-y-auto min-h-0">
                        {/* Auto-Lock Block */}
                        <div className="pt-3">
                          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                            Auto-lock
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[13px]">
                              <span className="text-text-main pr-2">
                                Lock when device locks or sleeps:
                              </span>
                              <div className="text-text-main font-medium flex items-center shrink-0">
                                {lockOnSleep !== PRESETS[previewPreset].lockOnSleep ? (
                                  <>
                                    <span className="line-through opacity-50 mr-2">
                                      {lockOnSleep ? 'Yes' : 'No'}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 mr-2 text-text-muted" />
                                    <span className="text-primary">
                                      {PRESETS[previewPreset].lockOnSleep ? 'Yes' : 'No'}
                                    </span>
                                  </>
                                ) : (
                                  <span>{lockOnSleep ? 'Yes' : 'No'}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[13px]">
                              <span className="text-text-main pr-2">
                                Lock after the device is idle for:
                              </span>
                              <div className="text-text-main font-medium flex items-center shrink-0">
                                {lockTimeout !== PRESETS[previewPreset].lockTimeout ? (
                                  <>
                                    <span className="line-through opacity-50 mr-2">
                                      {formatTimeout(lockTimeout)}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 mr-2 text-text-muted" />
                                    <span className="text-primary">
                                      {formatTimeout(PRESETS[previewPreset].lockTimeout)}
                                    </span>
                                  </>
                                ) : (
                                  <span>{formatTimeout(lockTimeout)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Clipboard Block */}
                        <div className="pt-1">
                          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                            Clipboard
                          </p>
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-text-main pr-2">
                              Clear copied passwords after 90 seconds:
                            </span>
                            <div className="text-text-main font-medium flex items-center shrink-0">
                              {clearClipboard !== PRESETS[previewPreset].clearClipboard ? (
                                <>
                                  <span className="line-through opacity-50 mr-2">
                                    {clearClipboard ? 'Yes' : 'No'}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 mr-2 text-text-muted" />
                                  <span className="text-primary">
                                    {PRESETS[previewPreset].clearClipboard ? 'Yes' : 'No'}
                                  </span>
                                </>
                              ) : (
                                <span>{clearClipboard ? 'Yes' : 'No'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 border-t border-border bg-surface flex flex-col space-y-2.5 shrink-0">
                  <Button
                    onPress={applySelectedPreset}
                    className="w-full flex justify-center py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 shadow-sm"
                  >
                    Update settings
                  </Button>
                  <Button
                    onPress={close}
                    className="w-full flex justify-center py-2 bg-background border border-border text-text-main text-sm font-bold rounded-lg hover:bg-surface-hover transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    Keep existing settings
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
