import { useState, useEffect, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Copy, Square, X, Search, Plus } from 'lucide-react';

interface TitleBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewItemClick: () => void;
  disableActions?: boolean;
  isSidebarVisible?: boolean;
  hasBottomBorder?: boolean;
}

export default function TitleBar({
  searchQuery,
  setSearchQuery,
  onNewItemClick,
  disableActions = false,
  isSidebarVisible = true,
  hasBottomBorder = true,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = useMemo(() => getCurrentWindow(), []);

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
    <div className="h-13 w-full select-none z-50 shrink-0 bg-background flex items-center overflow-hidden transition-colors">
      {/* BRAND ANCHOR */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className={`h-full flex items-center space-x-2 pl-4 text-md font-bold tracking-wider text-text-muted shrink-0 transition-all ${
          isSidebarVisible
            ? 'w-52 bg-sidebar border-r border-border'
            : 'bg-transparent border-transparent'
        }`}
      >
        <span className="pointer-events-none">Raiz</span>
      </div>

      {/* UNIVERSAL WORKSPACE HEADER */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className={`flex-1 h-full flex items-center justify-between bg-background pl-6 transition-colors ${
          hasBottomBorder ? 'border-b border-border' : ''
        }`}
      >
        {/* Left Side: Actions */}
        <div
          className="flex items-center gap-3 w-full max-w-2xl"
          data-tauri-drag-region
          onDoubleClick={handleToggleMaximize}
        >
          {/* Universal Search Input Wrapper */}
          {!disableActions && (
            <div
              className="relative w-full max-w-md"
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
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-md text-sm text-text-main focus:outline-none focus:border-primary transition-all"
              />
            </div>
          )}

          {/* Instantiation Trigger Button */}
          {!disableActions && (
            <button
              onClick={onNewItemClick}
              onDoubleClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5 shrink-0 pointer-events-none" />
              New Item
            </button>
          )}
        </div>

        {/* Flexible structural filler to ensure space between inputs and OS controls */}
        <div
          data-tauri-drag-region
          onDoubleClick={handleToggleMaximize}
          className="flex-1 h-full min-w-8"
        />

        {/* Native OS Frame Operations Wrapper */}
        <div className="flex h-full shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <button
            tabIndex={-1}
            onClick={() => appWindow.minimize()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="h-full w-11.5 flex items-center justify-center hover:bg-gray-200 text-text-muted transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4 pointer-events-none" />
          </button>

          <button
            tabIndex={-1}
            onClick={handleToggleMaximize}
            onDoubleClick={(e) => e.stopPropagation()}
            className="h-full w-11.5 flex items-center justify-center hover:bg-gray-200 text-text-muted transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Copy className="w-3.5 h-3.5 rotate-90 scale-x-90 pointer-events-none" />
            ) : (
              <Square className="w-3.5 h-3.5 pointer-events-none" />
            )}
          </button>

          <button
            tabIndex={-1}
            onClick={() => appWindow.close()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="h-full w-11.5 flex items-center justify-center hover:bg-danger text-text-muted hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>
    </div>
  );
}
