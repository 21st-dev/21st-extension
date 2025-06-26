'use client';
import type { ToolbarPlugin } from '@21st-extension/toolbar';
import { ExampleComponent } from './component';

export const ExamplePlugin: ToolbarPlugin = {
  displayName: 'Example',
  description: 'Example Plugin',
  iconSvg: null,
  pluginName: 'example',
  onActionClick: () => <ExampleComponent />,
};
