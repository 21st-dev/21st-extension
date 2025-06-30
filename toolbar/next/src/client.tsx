'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { ToolbarConfig } from './types';

const DynamicToolbar = dynamic(
  () =>
    import('@21st-extension/toolbar-react').then((mod) => ({
      default: mod.TwentyFirstToolbar,
    })),
  { ssr: false },
);

export const TwentyFirstToolbar: ComponentType<{
  config?: ToolbarConfig;
  enabled?: boolean;
}> = ({ config, enabled = process.env.NODE_ENV === 'development' }) => {
  if (!enabled) {
    return null;
  }

  return <DynamicToolbar config={config} enabled={enabled} />;
};
