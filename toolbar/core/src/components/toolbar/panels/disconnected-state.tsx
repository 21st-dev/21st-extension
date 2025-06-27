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
    <section className="pointer-events-auto flex max-h-full min-h-48 w-[480px] flex-col items-stretch justify-start rounded-2xl border border-border/30 bg-zinc-50/80 shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <WifiOffIcon className="size-5 text-zinc-600" />
          <h2 className="font-medium text-base text-zinc-950">Not Connected</h2>
        </div>
      </div>

      <div className="flex flex-col border-border/30 border-t px-4 py-3 text-zinc-950">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            The 21st.dev toolbar isn't connected to any IDE window.
          </p>

          {discoveryError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-red-700 text-sm">
                <span className="font-medium">Error:</span> {discoveryError}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="font-medium text-sm text-zinc-700">To connect:</p>
            <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-600">
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2.5 font-medium text-sm text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCwIcon
              className={`size-4 ${isRetrying ? 'animate-spin' : ''}`}
            />
            {isRetrying ? 'Connecting...' : 'Retry Connection'}
          </button>

          <div className="border-zinc-200 border-t pt-3">
            <a
              href="https://marketplace.visualstudio.com/items?itemName=21st-dev.21st-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-600 hover:text-zinc-800 hover:underline"
            >
              Get 21st.dev Extension →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
