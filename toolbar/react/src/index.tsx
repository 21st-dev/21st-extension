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

    const success = initToolbar(config);

    if (success) {
      isLoaded.current = true;

      // Cleanup функция для удаления тулбара при unmount
      return () => {
        const anchor = document.querySelector('stagewise-companion-anchor');
        if (anchor) {
          anchor.remove();
          isLoaded.current = false;
        }
      };
    }
  }, [config, enabled]);

  return null;
}
