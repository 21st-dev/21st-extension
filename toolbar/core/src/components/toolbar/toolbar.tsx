// This component represents the box in which the toolbar is placed.
// It is only used in desktop cases, since the mobile toolbar is placed inside a modal card.

import { RefreshCwIcon, WifiOffIcon, SettingsIcon, XIcon } from 'lucide-react';
import { ToolbarChatArea } from './panels/chat-box';
import { useEffect, useState } from 'preact/hooks';
import { ToolbarButton } from './button';
import { useChatState } from '@/hooks/use-chat-state';
import { cn } from '@/utils';
import { useAppState } from '@/hooks/use-app-state';
import { Logo } from '@/components/ui/logo';
import type { VNode } from 'preact';
import { SettingsPanel } from './settings';
import { useVSCode } from '@/hooks/use-vscode';
import { DisconnectedStatePanel } from './panels/disconnected-state';
import { WindowSelectionPanel } from './panels/window-selection';

export function ToolbarBox() {
  const {
    windows,
    isDiscovering,
    discoveryError,
    discover,
    shouldPromptWindowSelection,
  } = useVSCode();
  const isConnected = windows.length > 0;

  const [pluginBox, setPluginBox] = useState<null | {
    component: VNode;
    pluginName: string;
  }>(null);
  const [openPanel, setOpenPanel] = useState<
    null | 'settings' | { pluginName: string; component: VNode }
  >(null);

  // Add debouncing for loading and disconnection states
  const [debouncedDiscovering, setDebouncedDiscovering] = useState(false);
  const [debouncedDisconnected, setDebouncedDisconnected] = useState(false);

  const chatState = useChatState();

  const { minimized, minimize, expand, position } = useAppState();

  useEffect(() => {
    if (minimized) {
      setPluginBox(null);
      setOpenPanel(null);
    }
  }, [minimized]);

  // Debounce for isDiscovering - show loading state only if it lasts more than 500ms
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isDiscovering) {
      timeoutId = setTimeout(() => {
        setDebouncedDiscovering(true);
      }, 500);
    } else {
      setDebouncedDiscovering(false);
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [isDiscovering]);

  // Debounce for disconnected state - show disconnection only if it lasts more than 1000ms
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const actuallyDisconnected = !isConnected && !isDiscovering;

    if (actuallyDisconnected) {
      timeoutId = setTimeout(() => {
        setDebouncedDisconnected(true);
      }, 1000);
    } else {
      setDebouncedDisconnected(false);
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [isConnected, isDiscovering]);

  // Remove automatic chat mode activation when expanding
  // Now chat is activated only through Option+Period hotkey

  // Create a wrapper function to handle button clicks
  const handleButtonClick = (handler: () => void) => (e: MouseEvent) => {
    handler();
  };

  // Determine which theme and content to show
  const isLoadingState = debouncedDiscovering;
  const isDisconnectedState = debouncedDisconnected;
  const isConnectedState = isConnected;
  const shouldShowWindowSelection =
    shouldPromptWindowSelection && isConnectedState;

  // Theme classes based on state
  const getThemeClasses = () => {
    if (isDisconnectedState) {
      return {
        border: 'border-orange-300',
        bg: 'bg-orange-100/80',
        divideBorder: 'divide-orange-200',
        buttonBg: 'bg-orange-600',
        buttonColor: 'text-orange-700',
      };
    }
    // Connected state (default) - use same styles for normal and loading states
    return {
      border: 'border-border/30',
      bg: 'bg-background/80',
      divideBorder: 'divide-border/20',
      buttonBg: 'bg-foreground',
      buttonColor: 'stroke-foreground',
    };
  };

  const theme = getThemeClasses();

  // Get the appropriate icon for the minimized state
  const getMinimizedIcon = () => {
    // Show spinner if reconnecting (even without debounce for instant reaction)
    if (isDiscovering) {
      return <RefreshCwIcon className="size-4 animate-spin text-background" />;
    }
    // Show disconnection icon if not connected
    if (isDisconnectedState) {
      return <WifiOffIcon className="size-5 text-background" />;
    }
    // Show logo by default
    return <Logo className="size-5 text-background" color="current" />;
  };

  // Get CSS classes for position
  const getPositionClasses = () => {
    switch (position) {
      case 'bottomLeft':
        return 'bottom-5 left-5';
      case 'bottomRight':
        return 'bottom-5 right-5';
      case 'topLeft':
        return 'top-5 left-5';
      case 'topRight':
        return 'top-5 right-5';
      default:
        return 'bottom-5 right-5';
    }
  };

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      {/* Draggable Chat Area - positioned independently */}
      {isConnectedState && !minimized && <ToolbarChatArea />}

      {/* Plugin box / info panel next to button */}
      {(pluginBox ||
        openPanel === 'settings' ||
        (!isConnectedState && !minimized) || // Show disconnection states only in expanded view
        (shouldShowWindowSelection && !minimized)) && // Show window selection only in expanded view
        !minimized && (
          <div
            className={cn(
              'absolute w-[480px] max-w-[calc(100vw-40px)] transition-all duration-300 ease-out',
              // Settings panel positioning based on toolbar position
              openPanel === 'settings'
                ? position.includes('top')
                  ? 'top-full mt-12'
                  : 'bottom-full mb-12'
                : position.includes('top')
                  ? 'top-full mt-2'
                  : 'bottom-full mb-2',
              // Prevent panel from going off-screen
              position.includes('Right')
                ? '-right-2' // Shift panel right by 2 units from right-positioned toolbar
                : '-left-2', // Shift panel left by 2 units from left-positioned toolbar
            )}
          >
            {/* Render content based on state - remove ConnectingStatePanel */}
            {isDisconnectedState && (
              <DisconnectedStatePanel
                discover={discover}
                discoveryError={discoveryError}
              />
            )}
            {shouldShowWindowSelection && <WindowSelectionPanel />}
            {isConnectedState &&
              openPanel === 'settings' &&
              !shouldShowWindowSelection && (
                <SettingsPanel onClose={() => setOpenPanel(null)} />
              )}
            {isConnectedState &&
              !shouldShowWindowSelection &&
              pluginBox?.component}
          </div>
        )}

      {/* Settings button above/below logo */}
      {isConnectedState && !minimized && chatState.isPromptCreationActive && (
        <div
          className={cn(
            'absolute flex items-center justify-center transition-all duration-300 ease-out',
            // Settings button positioning based on toolbar position
            position.includes('top') ? 'top-full mt-1' : 'bottom-full mb-1',
            'right-0 left-0',
          )}
        >
          <ToolbarButton
            onClick={handleButtonClick(() => {
              // Simple logic - toggle settings
              setOpenPanel(openPanel === 'settings' ? null : 'settings');
            })}
            active={openPanel === 'settings'}
            className="pointer-events-auto transition-all duration-150 hover:border-none"
          >
            <SettingsIcon className="size-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Main button */}
      <ToolbarButton
        onClick={handleButtonClick(() => {
          if (chatState.isPromptCreationActive) {
            chatState.stopPromptCreation();
          } else if (minimized) {
            expand();
            setTimeout(() => chatState.startPromptCreation(), 100);
          } else {
            chatState.startPromptCreation();
          }
        })}
        active={chatState.isPromptCreationActive}
        className={cn(
          '!w-8 !max-w-8 pointer-events-auto relative z-50 flex h-8 cursor-pointer items-center justify-center rounded-full border shadow-md backdrop-blur transition-all duration-300 ease-out',
          theme.border,
          theme.bg,
          theme.buttonBg,
        )}
      >
        {/* Logo with blur animation */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
            chatState.isPromptCreationActive
              ? 'pointer-events-none scale-95 opacity-0 blur-sm'
              : 'pointer-events-auto scale-100 opacity-100 blur-none',
          )}
        >
          {getMinimizedIcon()}
        </div>

        {/* X icon with blur animation */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
            chatState.isPromptCreationActive
              ? 'pointer-events-auto scale-100 opacity-100 blur-none'
              : 'pointer-events-none scale-95 opacity-0 blur-sm',
          )}
        >
          <XIcon className="h-5 min-h-5 w-5 min-w-5 text-background" />
        </div>
      </ToolbarButton>
    </div>
  );
}
