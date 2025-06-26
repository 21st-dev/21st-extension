import { Panel } from '@/plugin-ui/components/panel';
import { ToolbarButton } from './button';
import { ToolbarSection } from './section';
import { SettingsIcon, RefreshCwIcon } from 'lucide-react';
import { useVSCode } from '@/hooks/use-vscode';
import { useAppState } from '@/hooks/use-app-state';
import { SelectNative } from '@/components/ui/select';
import { cn } from '@/utils';
import { useState } from 'preact/hooks';

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
    <section className="pointer-events-auto flex max-h-full min-h-48 w-[480px] flex-col items-stretch justify-start rounded-2xl border border-border/30 bg-zinc-50/80 shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <h2 className="font-medium text-base text-zinc-950">Preferences</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-col border-border/30 border-t px-4 py-3 text-zinc-950">
        <PositionSettings />
      </div>

      <div className="flex flex-col border-border/30 border-t px-4 py-3 text-zinc-950">
        <ConnectionSettings />
      </div>

      <div className="flex flex-col border-border/30 border-t px-4 py-3 text-zinc-950">
        <ProjectInfoSection />
      </div>
    </section>
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
          className="mb-1 block font-medium text-sm text-zinc-700"
        >
          Position
        </label>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Adjust the placement of your dev tools.
        </p>
      </div>
      <div className="flex-shrink-0">
        <SelectNative
          id="position-select"
          value={position}
          onChange={handlePositionChange}
          className="w-32 text-sm"
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
              className="font-medium text-sm text-zinc-700"
            >
              IDE Window
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              className="border-none bg-transparent p-0 font-normal text-xs text-zinc-500 hover:text-zinc-700"
            >
              {showRefreshed ? 'Refreshed' : 'Refresh'}
            </button>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
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
        <p className="text-red-600 text-sm">
          Error discovering windows: {discoveryError}
        </p>
      )}
      {!isDiscovering && windows.length === 0 && !discoveryError && (
        <p className="text-sm text-zinc-500">
          No IDE windows found. Make sure the Stagewise extension is installed
          and running.
        </p>
      )}

      {selectedSession && (
        <div className="rounded-lg bg-zinc-100/80 p-3">
          <p className="text-sm text-zinc-800">
            <span className="font-medium">Connected:</span>{' '}
            {selectedSession.displayName}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Session ID: {selectedSession.sessionId.substring(0, 8)}...
          </p>
        </div>
      )}

      {!selectedSession && windows.length > 0 && (
        <div className="rounded-lg border border-zinc-300/50 bg-zinc-100/80 p-3">
          <p className="text-sm text-zinc-700">
            <span className="font-medium">No window selected:</span> Please
            select an IDE window above to connect.
          </p>
        </div>
      )}
    </div>
  );
};

const ProjectInfoSection = () => (
  <div className="flex items-center justify-between text-xs text-zinc-500">
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
