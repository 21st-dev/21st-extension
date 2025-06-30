import { initToolbar, type ToolbarConfig } from '@21st-extension/toolbar';
import { useEffect, useRef } from 'react';

export type { ToolbarConfig } from '@21st-extension/toolbar';

export function TwentyFirstToolbar({
  config,
  enabled = process.env.NODE_ENV === 'development',
}: {
  config?: ToolbarConfig;
  enabled?: boolean;
}) {
  const isLoaded = useRef(false);
  useEffect(() => {
    if (isLoaded.current || !enabled) return;
    isLoaded.current = true;
    initToolbar(config);
  }, [config, enabled]);

  return null;
}
