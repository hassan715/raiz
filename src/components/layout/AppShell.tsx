import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, getAllWindows } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  Key,
  Settings,
  Folder,
  Plus,
  X,
  ChevronDown,
  LogOut,
  Archive,
  Star,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { InnerVault, Account } from '../../types';
import { useVault } from '../../context/VaultContext';
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
  TextField,
  Label,
  Input,
  TextArea,
  FieldError,
  Disclosure,
  DisclosurePanel,
} from 'react-aria-components';

interface AppShellProps {
  children: React.ReactNode;
  activeView: 'vaults' | 'archived' | 'favorites';
  setActiveView: (view: 'vaults' | 'archived' | 'favorites') => void;
  selectedVaultId: string | null;
  setSelectedVaultId: (id: string | null) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

export default function AppShell({
  children,
  activeView,
  setActiveView,
  selectedVaultId,
  setSelectedVaultId,
  selectedTag,
  setSelectedTag,
}: AppShellProps) {
  const { lockVault } = useVault();
  const [vaults, setVaults] = useState<InnerVault[]>([]);
  const [profileName, setProfileName] = useState('My Vault');

  // --- SETTINGS SYNC STATE ---
  const [showTags, setShowTags] = useState(
    () => localStorage.getItem('raiz_show_tags') !== 'false'
  );
  const [globalTags, setGlobalTags] = useState<string[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultDescription, setNewVaultDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vaultToEdit, setVaultToEdit] = useState<InnerVault | null>(null);
  const [editVaultName, setEditVaultName] = useState('');
  const [editVaultDescription, setEditVaultDescription] = useState('');
  const [editError, setEditError] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [vaultToDelete, setVaultToDelete] = useState<InnerVault | null>(null);
  const [vaultToDeleteItemCount, setVaultToDeleteItemCount] = useState(0);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    vault: InnerVault;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVaults();
    invoke<string>('get_profile_name').then(setProfileName).catch(console.error);
  }, [activeView, selectedVaultId]);

  // --- CROSS-WINDOW TAG SYNC ---
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'raiz_show_tags') {
        setShowTags(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // --- FETCH ACTIVE TAGS IF ENABLED ---
  useEffect(() => {
    const fetchActiveTags = () => {
      if (showTags) {
        invoke<string[]>('get_active_tags').then(setGlobalTags).catch(console.error);
      }
    };

    fetchActiveTags();

    window.addEventListener('refresh-tags', fetchActiveTags);
    return () => window.removeEventListener('refresh-tags', fetchActiveTags);
  }, [showTags, activeView, selectedVaultId]);

  const fetchVaults = () => {
    invoke<InnerVault[]>('get_vaults').then(setVaults).catch(console.error);
  };

  const clearSelection = () => {
    window.dispatchEvent(new Event('clear-selected-account'));
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [contextMenu]);

  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const firstItem = contextMenuRef.current.querySelector<HTMLElement>('button');
      firstItem?.focus();
    }
  }, [contextMenu]);

  const handleCreateVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const trimmedName = newVaultName.trim();
    if (!trimmedName) return;

    if (vaults.some((v) => v.name.toLowerCase() === trimmedName.toLowerCase())) {
      setCreateError(`A vault named '${trimmedName}' already exists.`);
      return;
    }

    setIsCreating(true);
    try {
      await invoke('create_inner_vault', { name: trimmedName, description: newVaultDescription });
      fetchVaults();
      setIsCreateModalOpen(false);
      setNewVaultName('');
      setNewVaultDescription('');
    } catch (error) {
      setCreateError(error as string);
    } finally {
      setIsCreating(false);
    }
  };

  const MENU_WIDTH = 160;
  const MENU_HEIGHT = 118;

  const getAdjustedMenuPos = (x: number, y: number) => ({
    x: x + MENU_WIDTH > window.innerWidth ? x - MENU_WIDTH : x,
    y: y + MENU_HEIGHT > window.innerHeight ? y - MENU_HEIGHT : y,
  });

  const handleContextMenu = (e: React.MouseEvent, vault: InnerVault) => {
    e.preventDefault();
    if (vault.id === '00000000-0000-0000-0000-000000000000') return;
    const { x, y } = getAdjustedMenuPos(e.clientX, e.clientY);
    setContextMenu({ x, y, vault });
  };

  const handleVaultKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, vault: InnerVault) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      if (vault.id === '00000000-0000-0000-0000-000000000000') return;
      const rect = e.currentTarget.getBoundingClientRect();
      const { x, y } = getAdjustedMenuPos(rect.left, rect.bottom);
      setContextMenu({ x, y, vault });
    }
  };

  const openEditModal = () => {
    if (!contextMenu) return;
    setVaultToEdit(contextMenu.vault);
    setEditVaultName(contextMenu.vault.name);
    setEditVaultDescription(contextMenu.vault.description || '');
    setEditError('');
    setIsEditModalOpen(true);
    setContextMenu(null);
  };

  const openDeleteModal = async () => {
    if (!contextMenu) return;
    const vault = contextMenu.vault;
    setVaultToDelete(vault);
    setConfirmDeleteName('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
    setContextMenu(null);

    try {
      const allAccounts = await invoke<Account[]>('get_accounts');
      const count = allAccounts.filter((acc) => acc.vault_id === vault.id).length;
      setVaultToDeleteItemCount(count);
    } catch (e) {
      console.error(e);
      setVaultToDeleteItemCount(0);
    }
  };

  const handleEditVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultToEdit) return;
    setEditError('');
    const trimmedName = editVaultName.trim();

    if (
      vaults.some(
        (v) => v.id !== vaultToEdit.id && v.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setEditError(`A vault named '${trimmedName}' already exists.`);
      return;
    }

    setIsCreating(true);
    try {
      await invoke('edit_inner_vault', {
        id: vaultToEdit.id,
        name: trimmedName,
        description: editVaultDescription,
      });
      fetchVaults();
      setIsEditModalOpen(false);
    } catch (error) {
      setEditError(error as string);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteVault = async () => {
    if (!vaultToDelete) return;
    setDeleteError('');
    setIsCreating(true);
    try {
      await invoke('delete_inner_vault', { id: vaultToDelete.id });
      if (selectedVaultId === vaultToDelete.id) {
        setSelectedVaultId(null);
        clearSelection();
      }
      fetchVaults();
      setIsDeleteModalOpen(false);
      window.dispatchEvent(new Event('vault-deleted'));
    } catch (error) {
      setDeleteError(error as string);
    } finally {
      setIsCreating(false);
    }
  };

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

  const blurRestoredFocus = () => setKbNav(false);

  const kbRing = kbNav ? 'focus:ring-2 focus:ring-primary/60' : '';
  const kbRingInset = kbNav ? 'focus:ring-2 focus:ring-primary/60 focus:ring-inset' : '';

  // --- SMART WINDOW CREATION ---
  const handleOpenSettings = async () => {
    try {
      const windows = await getAllWindows();
      const existingWin = windows.find((w) => w.label === 'settings');

      if (existingWin) {
        await existingWin.show();
        await existingWin.setFocus();
      } else {
        const newWin = new WebviewWindow('settings', {
          url: 'index.html',
          title: 'Settings',
          width: 764,
          height: 640,
          resizable: false,
          maximizable: false,
          minimizable: false,
          decorations: true,
          center: true,
          parent: getCurrentWindow(),
        });

        newWin.once('tauri://error', (e) => {
          console.error('Failed to create settings window', e);
        });

        await newWin.show();
        await newWin.setFocus();
      }
    } catch (error) {
      console.error('Error opening settings window:', error);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative select-none">
      <aside
        aria-label="Application sidebar"
        className="w-52 bg-sidebar border-r border-border flex flex-col z-10 relative shrink-0"
      >
        <MenuTrigger
          onOpenChange={(open) => {
            if (!open) blurRestoredFocus();
          }}
        >
          <Button
            className={`w-full h-16 flex items-center justify-between px-4 border-b border-border hover:bg-surface transition-colors cursor-pointer outline-none ${kbRingInset} group`}
          >
            <div className="flex items-center overflow-hidden">
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold mr-3 shrink-0">
                {profileName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold truncate tracking-wide text-text-main">
                {profileName}
              </span>
            </div>
            <ChevronDown
              className="w-4 h-4 text-text-muted transition-transform shrink-0 ml-2 group-data-[pressed]:rotate-180"
              aria-hidden="true"
            />
          </Button>
          <Popover
            placement="bottom start"
            offset={-6}
            className="w-52 bg-surface border border-border rounded-b-lg rounded-tr-lg shadow-xl p-1.5 z-50 data-[entering]:animate-in data-[entering]:fade-in data-[entering]:slide-in-from-top-2 select-none"
          >
            <Menu className="outline-none">
              <MenuItem
                onAction={handleOpenSettings}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm text-text-main transition-colors cursor-pointer outline-none data-[focused]:bg-gray-200"
              >
                <Settings className="w-4 h-4 mr-3 text-text-muted" aria-hidden="true" /> Settings
              </MenuItem>
              <Separator className="h-px bg-border my-1.5 mx-2" />
              <MenuItem
                onAction={lockVault}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm text-text-main transition-colors cursor-pointer outline-none data-[focused]:bg-gray-200"
              >
                <LogOut className="w-4 h-4 mr-3 text-text-muted" aria-hidden="true" /> Lock Raiz
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>

        <nav
          aria-label="Main Navigation"
          className="flex flex-col flex-1 py-4 px-3 space-y-1 overflow-y-auto"
        >
          <Button
            onPress={() => {
              clearSelection();
              setActiveView('vaults');
              setSelectedVaultId(null);
              setSelectedTag(null); // Clear tag
            }}
            aria-current={
              activeView === 'vaults' && selectedVaultId === null && selectedTag === null
                ? 'page'
                : undefined
            }
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md outline-none ${kbRing} transition-colors ${
              activeView === 'vaults' && selectedVaultId === null && selectedTag === null
                ? 'bg-primary-muted text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-main data-[pressed]:bg-surface data-[hovered]:bg-surface'
            }`}
          >
            <Key className="w-4 h-4 mr-3" aria-hidden="true" /> All Vaults
          </Button>

          <Button
            onPress={() => {
              clearSelection();
              setActiveView('favorites');
              setSelectedVaultId(null);
              setSelectedTag(null); // Clear tag
            }}
            aria-current={activeView === 'favorites' ? 'page' : undefined}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md outline-none ${kbRing} transition-colors ${
              activeView === 'favorites'
                ? 'bg-primary-muted text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-main data-[pressed]:bg-surface data-[hovered]:bg-surface'
            }`}
          >
            <Star className="w-4 h-4 mr-3" aria-hidden="true" /> Favorites
          </Button>

          {/* VAULTS SECTION */}
          <Disclosure className="pt-4 group">
            <div className="flex items-center justify-between w-full hover:bg-surface group">
              <Button
                slot="trigger"
                className={`flex-1 flex items-center py-2 px-3 text-sm font-medium text-text-muted tracking-wider hover:text-text-main transition-colors outline-none rounded-md ${kbRing}`}
              >
                <ChevronRight
                  className="w-4 h-4 mr-3 transition-transform group-data-[expanded]:rotate-90"
                  aria-hidden="true"
                />
                My Vaults
              </Button>
              <Button
                onPress={() => setIsCreateModalOpen(true)}
                aria-label="Create New Vault"
                className={`p-1 mr-1 text-text-muted hover:text-primary hover:bg-surface rounded-md transition-colors outline-none ${kbRing}`}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>

            <DisclosurePanel className="space-y-1 mt-1">
              {vaults.map((vault) => (
                <button
                  key={vault.id}
                  onClick={() => {
                    clearSelection();
                    setActiveView('vaults');
                    setSelectedVaultId(vault.id);
                    setSelectedTag(null); // Clear tag
                  }}
                  onContextMenu={(e) => handleContextMenu(e, vault)}
                  onKeyDown={(e) => handleVaultKeyDown(e, vault)}
                  aria-current={
                    activeView === 'vaults' && selectedVaultId === vault.id ? 'page' : undefined
                  }
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    activeView === 'vaults' && selectedVaultId === vault.id
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-muted hover:bg-surface hover:text-text-main'
                  }`}
                >
                  <Folder className="w-4 h-4 mr-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{vault.name}</span>
                </button>
              ))}
            </DisclosurePanel>
          </Disclosure>

          {/* DYNAMIC TAGS SECTION */}
          {showTags && (
            <Disclosure className="pt-2 group">
              <div className="flex items-center justify-between w-full hover:bg-surface group">
                <Button
                  slot="trigger"
                  className={`flex-1 flex items-center py-2 px-3 text-sm font-medium text-text-muted tracking-wider hover:text-text-main transition-colors outline-none rounded-md ${kbRing}`}
                >
                  <ChevronRight
                    className="w-4 h-4 mr-3 transition-transform group-data-[expanded]:rotate-90"
                    aria-hidden="true"
                  />
                  Tags
                </Button>
              </div>

              <DisclosurePanel className="space-y-1 mt-1">
                {globalTags.length === 0 ? (
                  <div className="px-9 py-2 text-xs text-text-muted italic">No tags yet</div>
                ) : (
                  globalTags.map((tag) => {
                    const isSelected = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          clearSelection();
                          setActiveView('vaults');
                          setSelectedVaultId(null);
                          setSelectedTag(tag); // Set active tag!
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                          isSelected
                            ? 'bg-primary-muted text-primary'
                            : 'text-text-muted hover:bg-surface hover:text-text-main'
                        }`}
                      >
                        <Tag className="w-4 h-4 mr-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{tag}</span>
                      </button>
                    );
                  })
                )}
              </DisclosurePanel>
            </Disclosure>
          )}

          {/* BOTTOM ARCHIVE BUTTON */}
          <div className="pt-3 pb-2 mt-auto">
            <Button
              onPress={() => {
                clearSelection();
                setActiveView('archived');
                setSelectedVaultId(null);
                setSelectedTag(null); // Clear tag
              }}
              aria-current={activeView === 'archived' ? 'page' : undefined}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md outline-none ${kbRing} transition-colors ${
                activeView === 'archived'
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-muted hover:bg-surface hover:text-text-main data-[pressed]:bg-surface data-[hovered]:bg-surface'
              }`}
            >
              <Archive className="w-4 h-4 mr-3" aria-hidden="true" /> Archived
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">{children}</main>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label={`Actions for ${contextMenu.vault.name}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setContextMenu(null);
            if (e.key === 'ArrowDown') (e.currentTarget.lastElementChild as HTMLElement)?.focus();
            if (e.key === 'ArrowUp')
              (e.currentTarget.firstElementChild?.nextElementSibling as HTMLElement)?.focus();
          }}
          className="fixed z-[60] w-40 bg-surface border border-border rounded-lg shadow-xl p-1 animate-in fade-in slide-in-from-top-1 select-none"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-2 py-1 mb-1 border-b border-border" role="presentation">
            <p className="text-xs font-medium text-text-muted truncate">
              Vault: {contextMenu.vault.name}
            </p>
          </div>
          <button
            role="menuitem"
            onClick={openEditModal}
            className="w-full text-left px-2 py-1.5 text-sm text-text-main hover:bg-gray-200 focus-visible:bg-gray-200 outline-none rounded-md transition-colors"
          >
            Edit Details
          </button>
          <button
            role="menuitem"
            onClick={openDeleteModal}
            className="w-full text-left px-2 py-1.5 text-sm text-text-main hover:bg-gray-200 focus-visible:bg-gray-200 outline-none rounded-md transition-colors"
          >
            Delete Vault
          </button>
        </div>
      )}

      {/* CREATE VAULT MODAL */}
      <ModalOverlay
        isOpen={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) blurRestoredFocus();
        }}
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in data-[exiting]:animate-out data-[exiting]:fade-out"
      >
        <Modal className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-md p-6 data-[entering]:animate-in data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:zoom-out-95 outline-none select-none">
          <Dialog className="outline-none" aria-label="Create New Vault">
            {({ close }) => (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Heading className="text-lg font-semibold text-text-main">
                    Create New Vault
                  </Heading>
                  <Button
                    onPress={close}
                    className={`p-1 text-text-muted hover:text-text-main rounded-md hover:bg-background transition-colors outline-none ${kbRing}`}
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </div>
                <form onSubmit={handleCreateVaultSubmit} className="space-y-4">
                  <TextField
                    isRequired
                    autoFocus
                    value={newVaultName}
                    onChange={(v) => {
                      setNewVaultName(v);
                      setCreateError('');
                    }}
                    className="w-full flex flex-col gap-1"
                  >
                    <Label className="text-sm font-medium text-text-muted">Vault Name *</Label>
                    <Input
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main outline-none focus-visible:border-primary transition-colors data-[invalid]:border-danger"
                      placeholder="e.g., Work, Finance, Travel"
                    />
                  </TextField>
                  <TextField
                    value={newVaultDescription}
                    onChange={setNewVaultDescription}
                    className="w-full flex flex-col gap-1"
                  >
                    <Label className="text-sm font-medium text-text-muted">
                      Description (Optional)
                    </Label>
                    <TextArea
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main outline-none focus-visible:border-primary transition-colors resize-none"
                      placeholder="What is this vault for?"
                      rows={3}
                    />
                  </TextField>
                  {createError && (
                    <div
                      role="alert"
                      className="p-3 bg-danger/10 border border-danger/20 rounded-md"
                    >
                      <p className="text-sm text-danger font-medium text-center">{createError}</p>
                    </div>
                  )}
                  <div className="pt-2 flex justify-end gap-3">
                    <Button
                      onPress={close}
                      className={`px-4 py-2 text-sm font-medium text-text-main hover:bg-background border border-transparent rounded-md transition-colors outline-none ${kbRing}`}
                    >
                      Cancel
                    </Button>
                    <button
                      type="submit"
                      disabled={isCreating || !newVaultName.trim()}
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {isCreating ? 'Creating...' : 'Create Vault'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* EDIT VAULT MODAL */}
      <ModalOverlay
        isOpen={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) blurRestoredFocus();
        }}
        isDismissable
        className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in data-[exiting]:animate-out data-[exiting]:fade-out"
      >
        <Modal className="relative bg-surface border border-border shadow-2xl rounded-xl w-full max-w-md p-6 data-[entering]:animate-in data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:zoom-out-95 outline-none select-none">
          <Dialog className="outline-none" aria-label="Edit Vault">
            {({ close }) => (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Heading className="text-lg font-semibold text-text-main">Edit Vault</Heading>
                  <Button
                    onPress={close}
                    className={`p-1 text-text-muted hover:text-text-main rounded-md hover:bg-background transition-colors outline-none ${kbRing}`}
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </div>
                <form onSubmit={handleEditVaultSubmit} className="space-y-4">
                  <TextField
                    isRequired
                    autoFocus
                    value={editVaultName}
                    onChange={(v) => {
                      setEditVaultName(v);
                      setEditError('');
                    }}
                    className="w-full flex flex-col gap-1"
                  >
                    <Label className="text-sm font-medium text-text-muted">Vault Name *</Label>
                    <Input className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main outline-none focus-visible:border-primary transition-colors data-[invalid]:border-danger" />
                  </TextField>
                  <TextField
                    value={editVaultDescription}
                    onChange={setEditVaultDescription}
                    className="w-full flex flex-col gap-1"
                  >
                    <Label className="text-sm font-medium text-text-muted">
                      Description (Optional)
                    </Label>
                    <TextArea
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main outline-none focus-visible:border-primary transition-colors resize-none"
                      rows={3}
                    />
                  </TextField>
                  {editError && (
                    <div
                      role="alert"
                      className="p-3 bg-danger/10 border border-danger/20 rounded-md"
                    >
                      <p className="text-sm text-danger font-medium text-center">{editError}</p>
                    </div>
                  )}
                  <div className="pt-2 flex justify-end gap-3">
                    <Button
                      onPress={close}
                      className={`px-4 py-2 text-sm font-medium text-text-main hover:bg-background border border-transparent rounded-md transition-colors outline-none ${kbRing}`}
                    >
                      Cancel
                    </Button>
                    <button
                      type="submit"
                      disabled={isCreating || !editVaultName.trim()}
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {isCreating ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* DELETE VAULT MODAL */}
      <ModalOverlay
        isOpen={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) blurRestoredFocus();
        }}
        isDismissable
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in data-[exiting]:animate-out data-[exiting]:fade-out"
      >
        <Modal className="relative bg-surface border border-danger/30 shadow-2xl rounded-xl w-full max-w-sm p-6 data-[entering]:animate-in data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:zoom-out-95 outline-none select-none">
          <Dialog className="outline-none" aria-label="Delete Vault">
            {({ close }) => (
              <>
                <Heading className="text-lg font-bold text-danger mb-4">Delete Vault?</Heading>
                <p className="text-sm text-text-main mb-6 leading-relaxed">
                  This vault and its {vaultToDeleteItemCount} items will be permanently deleted.
                </p>
                <TextField
                  isRequired
                  autoFocus
                  value={confirmDeleteName}
                  onChange={setConfirmDeleteName}
                  className="mb-6 flex flex-col gap-2"
                >
                  <Label className="text-sm font-medium text-text-muted">
                    Please type <strong>{vaultToDelete?.name}</strong> to confirm.
                  </Label>
                  <Input
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-main outline-none focus-visible:border-danger transition-colors data-[invalid]:border-danger"
                    placeholder={vaultToDelete?.name}
                  />
                  {deleteError && (
                    <FieldError className="text-sm text-danger text-center">
                      {deleteError}
                    </FieldError>
                  )}
                </TextField>
                <div className="flex justify-end space-x-3">
                  <Button
                    onPress={close}
                    className={`px-4 py-2 text-sm font-medium text-text-main hover:bg-background rounded-md transition-colors outline-none ${kbRing}`}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={handleDeleteVault}
                    disabled={isCreating || confirmDeleteName !== vaultToDelete?.name}
                    className="px-4 py-2 bg-danger text-white text-sm font-bold rounded-md hover:bg-danger/90 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isCreating ? 'Deleting...' : 'Permanently delete vault'}
                  </button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
