import { useVSCode } from '@/hooks/use-vscode';
import { Panel } from '@/plugin-ui/components/panel';
import { RefreshCwIcon, SettingsIcon, X } from 'lucide-react';
import { ToolbarButton } from './button';
import { ToolbarSection } from './section';
import { useAppState } from '@/hooks/use-app-state';
import { SelectNative } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { useState } from 'preact/hooks';
import { AuthSection } from '@/components/auth/auth-section';

export const SettingsButton = ({
  onOpenPanel,
  isActive = false,
}: {
  onOpenPanel: () => void;
  isActive?: boolean;
}) => (
  <ToolbarSection>
    <ToolbarButton onClick={onOpenPanel} active={isActive}>
      <SettingsIcon className="size-4" />
    </ToolbarButton>
  </ToolbarSection>
);

export const SettingsPanel = ({ onClose }: { onClose?: () => void }) => {
  return (
    <section className="pointer-events-auto flex max-h-full min-h-48 w-[480px] flex-col items-stretch justify-start rounded-xl border border-border bg-background shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="font-medium text-base text-foreground">Preferences</h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 min-h-4 w-4 min-w-4" />
          </Button>
        )}
      </div>

      <div className="border-border border-t px-4 py-3">
        <AuthSection />
      </div>

      <div className="flex flex-col border-border border-t px-4 py-3 text-foreground">
        <ThemeSettings />
      </div>

      <div className="flex flex-col border-border border-t px-4 py-3 text-foreground">
        <PositionSettings />
      </div>

      <div className="flex flex-col border-border border-t px-4 py-3 text-foreground">
        <PromptSettings />
      </div>

      <div className="flex flex-col border-border border-t px-4 py-3 text-foreground">
        <ConnectionSettings />
      </div>

      <div className="flex flex-col border-border border-t px-4 py-3 text-foreground">
        <HotkeySection />
      </div>

      <div className="flex flex-col border-border border-t px-4 py-3 text-foreground">
        <ProjectInfoSection />
      </div>
    </section>
  );
};

const ThemeSettings = () => {
  const { theme, setTheme } = useAppState();

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ] as const;

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.currentTarget.value as 'light' | 'dark' | 'system');
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label
          htmlFor="theme-select"
          className="mb-1 block font-medium text-foreground text-sm"
        >
          Theme
        </label>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Choose your preferred color scheme.
        </p>
      </div>
      <div className="flex-shrink-0">
        <SelectNative
          id="theme-select"
          value={theme}
          onChange={handleThemeChange}
          className="text-sm"
          dynamicWidth={true}
        >
          {themes.map((themeOption) => (
            <option key={themeOption.value} value={themeOption.value}>
              {themeOption.label}
            </option>
          ))}
        </SelectNative>
      </div>
    </div>
  );
};

const PositionSettings = () => {
  const { position, setPosition } = useAppState();

  const positions = [
    { value: 'bottomLeft', label: 'Bottom Left' },
    { value: 'bottomRight', label: 'Bottom Right' },
    { value: 'topLeft', label: 'Top Left' },
    { value: 'topRight', label: 'Top Right' },
  ] as const;

  const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPosition(e.currentTarget.value as typeof position);
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label
          htmlFor="position-select"
          className="mb-1 block font-medium text-foreground text-sm"
        >
          Position
        </label>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Adjust the placement of your dev tools.
        </p>
      </div>
      <div className="flex-shrink-0">
        <SelectNative
          id="position-select"
          value={position}
          onChange={handlePositionChange}
          className="text-sm"
          dynamicWidth={true}
        >
          {positions.map((pos) => (
            <option key={pos.value} value={pos.value}>
              {pos.label}
            </option>
          ))}
        </SelectNative>
      </div>
    </div>
  );
};

const ConnectionSettings = () => {
  const {
    windows,
    isDiscovering,
    discoveryError,
    discover,
    selectedSession,
    selectSession,
    appName,
  } = useVSCode();

  const [showRefreshed, setShowRefreshed] = useState(false);

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSessionId =
      e.currentTarget.value === '' ? undefined : e.currentTarget.value;
    selectSession(selectedSessionId);
  };

  const handleRefresh = () => {
    discover();
    setShowRefreshed(true);
    setTimeout(() => {
      setShowRefreshed(false);
    }, 1000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <label
              htmlFor="session-select"
              className="font-medium text-foreground text-sm"
            >
              IDE Window
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              className="border-none bg-transparent p-0 font-normal text-muted-foreground text-xs hover:text-foreground"
            >
              {showRefreshed ? 'Refreshed' : 'Refresh'}
            </button>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Connect to your code editor workspace.
          </p>
        </div>
        <div className="flex-shrink-0">
          <SelectNative
            id="session-select"
            value={selectedSession?.sessionId || ''}
            onChange={handleSessionChange}
            className="w-44 text-sm"
            disabled={isDiscovering}
          >
            <option value="" disabled>
              {windows.length > 0
                ? 'Select an IDE window...'
                : 'No windows available'}
            </option>
            {windows.map((window) => (
              <option key={window.sessionId} value={window.sessionId}>
                {window.displayName} - Port {window.port}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      {discoveryError && (
        <p className="text-destructive text-sm">
          Error discovering windows: {discoveryError}
        </p>
      )}
      {!isDiscovering && windows.length === 0 && !discoveryError && (
        <p className="text-muted-foreground text-sm">
          No IDE windows found. Make sure the Stagewise extension is installed
          and running.
        </p>
      )}

      {!selectedSession && windows.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-foreground text-sm">
            <span className="font-medium">No window selected:</span> Please
            select an IDE window above to connect.
          </p>
        </div>
      )}
    </div>
  );
};

const PromptSettings = () => {
  const { promptAction, setPromptAction } = useAppState();

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPromptAction(e.currentTarget.value as 'send' | 'copy' | 'both');
  };

  const actions = [
    { value: 'send', label: 'Send to IDE only' },
    { value: 'copy', label: 'Copy to clipboard only' },
    { value: 'both', label: 'Send to IDE and copy' },
  ] as const;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label
          htmlFor="prompt-action-select"
          className="mb-1 block font-medium text-foreground text-sm"
        >
          Prompt Action
        </label>
        <p className="text-muted-foreground text-xs leading-relaxed">
          What happens when you send a prompt.
        </p>
      </div>
      <div className="flex-shrink-0">
        <SelectNative
          id="prompt-action-select"
          value={promptAction}
          onChange={handleActionChange}
          className="text-sm"
          dynamicWidth={true}
        >
          {actions.map((action) => (
            <option key={action.value} value={action.value}>
              {action.label}
            </option>
          ))}
        </SelectNative>
      </div>
    </div>
  );
};

const HotkeySection = () => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1">
      <div className="mb-1 block font-medium text-foreground text-sm">
        Keyboard Shortcuts
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Open toolbar
      </p>
    </div>
    <div className="flex-shrink-0">
      <kbd className="rounded bg-muted px-2 py-1 font-mono text-sm">
        ⌥ + .
      </kbd>
    </div>
  </div>
);

const ProjectInfoSection = () => (
  <div className="flex items-center justify-between text-muted-foreground text-xs">
    <span>
      Licensed under{' '}
      <a
        href="https://github.com/stagewise-io/stagewise/blob/main/LICENSE"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:underline"
      >
        AGPL v3
      </a>
    </span>
    <span>
      Fork of{' '}
      <a
        href="https://github.com/stagewise-io/stagewise"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:underline"
      >
        Stagewise
      </a>
    </span>
  </div>
);
