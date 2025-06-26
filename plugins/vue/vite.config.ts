import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import preserveDirectives from 'rollup-preserve-directives';
import { defineConfig, type PluginOption } from 'vite';
import dts from 'vite-plugin-dts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@21st-extension/toolbar/plugin-ui',
    }),
    dts({
      rollupTypes: true,
    }) as PluginOption,
    preserveDirectives(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'react/jsx-runtime': '@21st-extension/toolbar/plugin-ui/jsx-runtime',
      react: '@21st-extension/toolbar/plugin-ui',
    },
    mainFields: ['module', 'main'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  esbuild: {
    minifyIdentifiers: false,
    treeShaking: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'StagewisePluginExample',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
        preserveModules: false,
        globals: {
          react: '@21st-extension/toolbar/plugin-ui',
          'react/jsx-runtime': '@21st-extension/toolbar/plugin-ui/jsx-runtime',
        },
      },
      external: [
        '@21st-extension/toolbar',
        '@21st-extension/toolbar/plugin-ui',
        '@21st-extension/toolbar/plugin-ui/jsx-runtime',
      ],
      treeshake: true,
    },
    minify: false,
    cssMinify: false,
  },
  optimizeDeps: {
    esbuildOptions: {
      mainFields: ['module', 'main'],
    },
  },
});
