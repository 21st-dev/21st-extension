/// <reference types="vite/client" />

declare module '*.vue' {
  import type { ToolbarConfig } from '@21st-extension/toolbar';
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    { config: ToolbarConfig },
    Record<string, never>,
    any
  >;
  export default component;
}
