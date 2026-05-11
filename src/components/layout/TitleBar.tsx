import { useState, useEffect, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Copy, Square, X, Search, Plus } from 'lucide-react';

interface TitleBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewItemClick: () => void;
  disableActions?: boolean;
}

export default function TitleBar({
  searchQuery,
  setSearchQuery,
  onNewItemClick,
  disableActions = false,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Stable window reference derived strictly once
  const appWindow = useMemo(() => getCurrentWindow(), []);

  // Absolute truth pattern: execute OS instruction first, then verify true system outcome
  const handleToggleMaximize = async () => {
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  };

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let isMounted = true;

    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      if (isMounted) {
        setIsMaximized(maximized);
      }
    };

    checkMaximized();

    appWindow.onResized(checkMaximized).then((fn) => {
      unlistenFn = fn;
      if (!isMounted) {
        fn();
      }
    });

    return () => {
      isMounted = false;
      unlistenFn?.();
    };
  }, [appWindow]);

  return (
    /* ROOT WRAPPER: Flat flexbox layout */
    <div className="h-12 w-full select-none z-50 shrink-0 bg-background flex items-center overflow-hidden">
      {/* BRAND ANCHOR (Merged with Sidebar) */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="w-52 h-full bg-sidebar flex items-center space-x-2 pl-4 text-md font-bold tracking-wider text-text-muted shrink-0 border-r border-border"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block pointer-events-none" />
        <span className="pointer-events-none">Raiz</span>
      </div>

      {/* UNIVERSAL WORKSPACE HEADER */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="flex-1 h-full flex items-center justify-between border-b border-border bg-background pl-6"
      >
        {/* Primary Interactive Inputs Container (Search & Instantiation) */}
        <div className="flex items-center space-x-3 w-full sm:w-sm lg:w-lg">
          {/* Universal Search Input Wrapper */}
          <div
            className="relative w-full"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search credentials, notes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disableActions}
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-md text-sm text-text-main focus:outline-none focus:border-primary transition-all disabled:opacity-50"
            />
          </div>

          {/* Instantiation Trigger Button */}
          <button
            onClick={onNewItemClick}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={disableActions}
            className="flex items-center px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors shadow-sm shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5 shrink-0 pointer-events-none" />
            New Item
          </button>
        </div>

        {/* Flexible structural filler to absorb dead space and push window controls to the edge */}
        <div
          data-tauri-drag-region
          onDoubleClick={handleToggleMaximize}
          className="flex-1 h-full"
        />

        {/* Native OS Frame Operations Wrapper */}
        <div
          className="flex items-center space-x-1 shrink-0 h-full pr-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => appWindow.minimize()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="p-2 hover:bg-surface rounded text-text-muted hover:text-text-main transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4 pointer-events-none" />
          </button>

          <button
            onClick={handleToggleMaximize}
            onDoubleClick={(e) => e.stopPropagation()}
            className="p-2 hover:bg-surface rounded text-text-muted hover:text-text-main transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Copy className="w-3.5 h-3.5 rotate-90 scale-x-90 pointer-events-none" />
            ) : (
              <Square className="w-3.5 h-3.5 pointer-events-none" />
            )}
          </button>

          <button
            onClick={() => appWindow.close()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="p-2 hover:bg-danger/10 rounded text-text-muted hover:text-danger transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>
    </div>
  );
}
