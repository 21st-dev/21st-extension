import { RefreshCwIcon } from 'lucide-react';
import { useVSCode } from '@/hooks/use-vscode';
import { SelectNative } from '@/components/ui/select';
import { useState } from 'preact/hooks';

export function WindowSelectionPanel() {
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
    <section className="pointer-events-auto flex max-h-full min-h-48 w-[480px] flex-col items-stretch justify-start rounded-xl border border-border bg-background shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="font-medium text-base text-foreground">
          Select IDE Window
        </h2>
      </div>

      <div className="border-border border-t px-4 py-3 text-foreground">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <label
                  htmlFor="window-selection-select"
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
                id="window-selection-select"
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
              No IDE windows found. Make sure the Stagewise extension is
              installed and running.
            </p>
          )}

          {selectedSession && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-foreground text-sm">
                <span className="font-medium">Connected:</span>{' '}
                {selectedSession.displayName}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Session ID: {selectedSession.sessionId.substring(0, 8)}...
              </p>
            </div>
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
      </div>
    </section>
  );
}
