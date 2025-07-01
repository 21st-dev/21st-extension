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

    console.log('[21st Toolbar] Attempting to initialize toolbar');
    const success = initToolbar(config);

    if (success) {
      isLoaded.current = true;
      console.log('[21st Toolbar] Toolbar initialized successfully');

      // Cleanup функция для удаления тулбара при unmount
      return () => {
        const anchor = document.querySelector('stagewise-companion-anchor');
        if (anchor) {
          console.log('[21st Toolbar] Cleaning up toolbar');
          anchor.remove();
          isLoaded.current = false;
        }
      };
    } else {
      console.log(
        '[21st Toolbar] Toolbar initialization skipped (already exists)',
      );
    }
  }, [config, enabled]);

  return null;
}
