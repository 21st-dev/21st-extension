import { RefreshCwIcon, WifiOffIcon } from 'lucide-react';
import { useState } from 'preact/hooks';

export function DisconnectedStatePanel({
  discover,
  discoveryError,
}: {
  discover: () => Promise<void>;
  discoveryError: string | null;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await discover();
    } finally {
      // Add a small delay to show the loading state
      setTimeout(() => {
        setIsRetrying(false);
      }, 500);
    }
  };

  return (
    <section className="pointer-events-auto flex max-h-full min-h-48 w-[480px] flex-col items-stretch justify-start rounded-xl border border-border bg-background shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <WifiOffIcon className="size-5 text-muted-foreground" />
          <h2 className="font-medium text-base text-foreground">
            Not Connected
          </h2>
        </div>
      </div>

      <div className="flex flex-col border-border/30 border-t px-4 py-3 text-foreground">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            The 21st.dev toolbar isn't connected to any IDE window.
          </p>

          {discoveryError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-destructive text-sm">
                <span className="font-medium">Error:</span> {discoveryError}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="font-medium text-foreground text-sm">To connect:</p>
            <ol className="list-inside list-decimal space-y-2 text-muted-foreground text-sm">
              <li>Open your IDE (Cursor, Windsurf, etc.)</li>
              <li>Install the 21st.dev extension</li>
              <li>Make sure the extension is active</li>
              <li>Click retry below</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCwIcon
              className={`size-4 ${isRetrying ? 'animate-spin' : ''}`}
            />
            {isRetrying ? 'Connecting...' : 'Retry Connection'}
          </button>

          <div className="border-border border-t pt-3">
            <a
              href="https://marketplace.visualstudio.com/items?itemName=21st-dev.21st-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground text-sm hover:text-foreground hover:underline"
            >
              Get 21st.dev Extension →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
