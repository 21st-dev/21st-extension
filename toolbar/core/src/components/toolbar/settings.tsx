import { useVSCode } from '@/hooks/use-vscode';
import { Panel } from '@/plugin-ui/components/panel';
import { RefreshCwIcon, SettingsIcon } from 'lucide-react';
import { ToolbarButton } from './button';
import { ToolbarSection } from './section';
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
  <div className="flex flex-col gap-2 text-xs text-zinc-500">
    <div className="flex items-center justify-between">
      <a
        href="https://discord.gg/gkdGsDYaKA"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-indigo-700 hover:underline"
        title="Join our Discord"
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a.117.117 0 0 0-.124.06c-.537.96-1.13 2.22-1.552 3.2a18.524 18.524 0 0 0-5.418 0c-.423-.98-1.016-2.24-1.553-3.2a.117.117 0 0 0-.124-.06A19.736 19.736 0 0 0 3.683 4.369a.105.105 0 0 0-.047.043C.533 9.043-.32 13.579.099 18.057a.12.12 0 0 0 .045.083c1.934 1.426 3.81 2.288 5.671 2.857a.116.116 0 0 0 .127-.043c.438-.602.827-1.24 1.165-1.908a.112.112 0 0 0-.062-.158c-.619-.234-1.205-.52-1.77-.853a.117.117 0 0 1-.012-.194c.119-.09.238-.183.353-.277a.112.112 0 0 1 .114-.013c3.747 1.71 7.789 1.71 11.533 0a.112.112 0 0 1 .115.012c.115.094.234.188.353.278a.117.117 0 0 1-.012.194c-.565.333-1.151.619-1.77.853a.112.112 0 0 0-.062.158c.34.668.728 1.306 1.165 1.908a.115.115 0 0 0 .127.043c1.861-.569 3.737-1.431 5.671-2.857a.12.12 0 0 0 .045-.083c.5-5.177-.838-9.673-3.636-13.645a.105.105 0 0 0-.047-.043zM8.02 15.331c-1.183 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.955 2.419-2.156 2.419zm7.96 0c-1.183 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.946 2.419-2.156 2.419z" />
        </svg>
        Discord
      </a>
      <a
        href="https://marketplace.visualstudio.com/items?itemName=21st.21st-extension"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-violet-700 hover:underline"
        title="VS Code Marketplace"
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.805 2.29a2.25 2.25 0 0 0-2.45-.49l-7.5 3.25a2.25 2.25 0 0 0-1.31 2.06v1.13l-5.13 2.22a2.25 2.25 0 0 0-1.31 2.06v3.5a2.25 2.25 0 0 0 1.31 2.06l5.13 2.22v1.13a2.25 2.25 0 0 0 1.31 2.06l7.5 3.25a2.25 2.25 0 0 0 2.45-.49A2.25 2.25 0 0 0 23 20.25V3.75a2.25 2.25 0 0 0-1.195-1.46zM12 20.25v-16.5l7.5 3.25v10l-7.5 3.25z" />
        </svg>
        VS Code Marketplace
      </a>
    </div>
    <div className="mt-2">
      <span className="font-semibold">Contact:</span>{' '}
      <a
        href="mailto:sales@stagewise.io"
        className="text-blue-700 hover:underline"
      >
        sales@stagewise.io
      </a>
    </div>
    <div className="text-zinc-500">
      <span>
        Licensed under AGPL v3.{' '}
        <a
          href="https://github.com/stagewise-io/stagewise/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          View license
        </a>
      </span>
    </div>
  </div>
);
