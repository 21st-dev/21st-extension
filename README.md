# <img src="https://21st.dev/brand/21st-logo-dark.png" alt="logo" width="48" height="48" style="border-radius: 50%; vertical-align: middle; margin-right: 8px;" /> 21st.dev VSCode Extension

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/21st-dev.21st-extension?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=21st-dev.21st-extension) [![GitHub Repo stars](https://img.shields.io/github/stars/21st-dev/21st-extension)](https://github.com/21st-dev/21st-extension) [![Join us on Discord](https://img.shields.io/discord/1229378372141056010?label=Discord&logo=discord&logoColor=white)](https://discord.gg/Qx4rFunHfm) <!-- [![Build Status](https://img.shields.io/github/actions/workflow/status/stagewise-io/stagewise/ci.yml?branch=main)](https://github.com/stagewise-io/stagewise/actions) -->

Forked from [stagewise-io/stagewise](https://github.com/stagewise-io/stagewise)

![demo](assets/gif-extension.gif)

## About the project

**This extension is a browser toolbar that connects your frontend UI to your code ai agents in your code editor.**

* 🧠 Select any element(s) in your web app
* 💬 Leave a comment on it
* 💡 Let your AI-Agent do the magic

> Perfect for devs tired of pasting folder paths into prompts. stagewise gives your AI real-time, browser-powered context.


## ✨ Features

The Toolbar makes it incredibly easy to edit your frontend code with AI agents:

* ⚡ Works out of the box
* 🧩 Customise and extend functionality with Plugins
* 🧠 Sends DOM elements & more metadata to your AI agent
* 🧪 Comes with examples for React, Vue, Svelte and more
* 🔍 Search and integrate UI components from 21st.dev library
* 🚨 Runtime error detection with intelligent assistance
* 🪄 AI-powered component generation with Magic Chat


## 📖 Quickstart 

### 1. 🧩 **Install the code editor extension (Cursor, Windsurf, VS Code, Trae IDE, Kilo Code)**

- **VS Code**: install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=21st-dev.21st-extension) or Extensions tab in IDE
- **Cursor, Windsurf, Trae IDE, etc.**: install from Extensions tab in IDE or manually from [Open VSX](https://open-vsx.org/extension/21st-dev/21st-extension) → Open file in editor → Right click → Install Extension

### 2. 👨🏽‍💻 **Install and inject the toolbar**

> [!TIP]
> 🪄 **Auto-Install the toolbar (AI-guided):** 
> 1. In Cursor, Press `CMD + Shift + P`
> 2. Enter `setupToolbar`
> 3. Execute the command and the toolbar will init automatically 🦄

Or follow the manual way:

Install [@21st-extension/toolbar](https://www.npmjs.com/package/@21st-extension/toolbar):
```bash
pnpm i -D @21st-extension/toolbar
```

Inject the toolbar into your app dev-mode:

```ts
// 1. Import the toolbar
import { initToolbar } from '@21st-extension/toolbar';

// 2. Define your toolbar configuration
const stagewiseConfig = {
  plugins: [],
};

// 3. Initialize the toolbar when your app starts
// Framework-agnostic approach - call this when your app initializes
function setupStagewise() {
  // Only initialize once and only in development mode
  if (process.env.NODE_ENV === 'development') {
    initToolbar(stagewiseConfig);
  }
}

// Call the setup function when appropriate for your framework
setupStagewise();
```
> ⚡️ The toolbar will **automatically connect** to the extension!

> [!IMPORTANT]
> 🚫 **If nothing happens when a prompt is sent:**
> 
> If you have multiple Cursor windows open, the toolbar may send prompts to the wrong window, making it appear as if "no prompt is being sent". To ensure reliable operation:
> - Keep only one Cursor window open when using stagewise
>
> A fix for this is on the way!

### Framework-specific integration examples

For easier integration, we provide framework-specific NPM packages that come with dedicated toolbar components (e.g., `<TwentyFirstToolbar>`). You can usually import these from `@21st-extension/toolbar-[framework-name]`.

<details>
<summary>React.js</summary>

We provide the `@21st-extension/toolbar-react` package for React projects. Initialize the toolbar in your main entry file (e.g., `src/main.tsx`) by creating a separate React root for it. This ensures it doesn't interfere with your main application tree.

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { TwentyFirstToolbar } from '@21st-extension/toolbar-react';
import './index.css';

// Render the main app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Initialize toolbar separately
const toolbarConfig = {
  plugins: [], // Add your custom plugins here
};

document.addEventListener('DOMContentLoaded', () => {
  const toolbarRoot = document.createElement('div');
  toolbarRoot.id = 'stagewise-toolbar-root'; // Ensure a unique ID
  document.body.appendChild(toolbarRoot);

  createRoot(toolbarRoot).render(
    <StrictMode>
      <TwentyFirstToolbar config={toolbarConfig} />
    </StrictMode>
  );
});
```
</details>

<details>
<summary>Next.js</summary>

Use the `@21st-extension/toolbar-next` package for Next.js applications. Include the `<TwentyFirstToolbar>` component in your root layout file (`src/app/layout.tsx`).

```tsx
// src/app/layout.tsx
import { TwentyFirstToolbar } from '@21st-extension/toolbar-next';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TwentyFirstToolbar
          config={{
            plugins: [], // Add your custom plugins here
          }}
        />
        {children}
      </body>
    </html>
  );
}
```

</details>

<details>
<summary>Nuxt.js</summary>

For Nuxt.js projects, you can use the `@21st-extension/toolbar-vue` package. Place the `<TwentyFirstToolbar>` component in your `app.vue` or a relevant layout file.

```vue
// app.vue
<script setup lang="ts">
import { TwentyFirstToolbar, type ToolbarConfig } from '@21st-extension/toolbar-vue';

const config: ToolbarConfig = {
  plugins: [], // Add your custom plugins here
};
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <ClientOnly>
      <TwentyFirstToolbar :config="config" />
    </ClientOnly>
    <NuxtWelcome />
  </div>
</template>
```

</details>

<details>
<summary>Vue.js</summary>

Use the `@21st-extension/toolbar-vue` package for Vue.js projects. Add the `<TwentyFirstToolbar>` component to your main App component (e.g., `App.vue`).

```vue
// src/App.vue
<script setup lang="ts">
import { TwentyFirstToolbar, type ToolbarConfig } from '@21st-extension/toolbar-vue';

const config: ToolbarConfig = {
  plugins: [], // Add your custom plugins here
};
</script>

<template>
  <TwentyFirstToolbar :config="config" />
  <div>
    <!-- Your app content -->
  </div>
</template>
```

</details>

<details>
<summary>SvelteKit</summary>

For SvelteKit, you can integrate the toolbar using `@21st-extension/toolbar` and Svelte's lifecycle functions, or look for a dedicated `@21st-extension/toolbar-svelte` package if available. Create a component that conditionally renders/initializes the toolbar on the client side (e.g., `src/lib/components/TwentyFirstToolbarLoader.svelte` or directly in `src/routes/+layout.svelte`).

**Using `onMount` in `+layout.svelte` (with `@21st-extension/toolbar`):**
```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initToolbar, type ToolbarConfig } from '@21st-extension/toolbar'; // Adjust path if needed

  onMount(() => {
    if (browser) {
      const stagewiseConfig: ToolbarConfig = {
        plugins: [
          // Add your Svelte-specific plugins or configurations here
        ],
      };
      initToolbar(stagewiseConfig);
    }
  });
</script>

<slot />
```

**Using a loader component (example from repository):**
The example repository uses a `ToolbarLoader.svelte` which wraps `ToolbarWrapper.svelte`. `ToolbarWrapper.svelte` would then call `initToolbar` from `@21st-extension/toolbar`.

```svelte
<!-- examples/svelte-kit-example/src/lib/components/stagewise/ToolbarLoader.svelte -->
<script lang="ts">
import type { ToolbarConfig } from '@21st-extension/toolbar';
// ToolbarWrapper.svelte is a custom component that would call initToolbar
import ToolbarWrapper from './ToolbarWrapper.svelte'; 
import { browser } from '$app/environment';

const stagewiseConfig: ToolbarConfig = {
  plugins: [
    // ... your svelte plugin config
  ],
};
</script>

{#if browser}
  <ToolbarWrapper config={stagewiseConfig} />
{/if}
```
You would then use `TwentyFirstToolbarLoader` in your `src/routes/+layout.svelte`.

</details>


## 🤖 Agent support 

> Important: In case of any troubles with the agents, you could still use the extension via the "Copy Prompt" feature (Toolbar Settings > Prompt Action > Copy To Clipboard) to copy the prompt and paste it into the agent manually

| **Agent**      | **Supported**  |
| -------------- | -------------- |
| Cursor         | ✅             |
| GitHub Copilot | ✅             |
| Windsurf       | ✅             |
| Cline          | ✅             |
| Roo Code       | ✅             |
| Trae IDE       | ✅             |
| Kilo Code      | ✅             |
| Claude Code    | ✅ (via Copy Prompt) |
| Gemini CLI     | ✅ (via Copy Prompt) |
| Any AI Agent   | ✅ (via Copy Prompt) |

## 📜 License

21st.dev Extension is developed by 21st Labs Inc. (forked from Stagewise) and offerend under the AGPLv3 license.

For more information on the license model, visit the [FAQ about the GNU Licenses](https://www.gnu.org/licenses/gpl-faq.html).
For use cases that fall outside the scope permitted by the AGPLv3 license, feel free to [📬 Contact Us](#contact-us-section).

## 📬 Contact Us

* 👾 [Join our Discord](https://discord.gg/Qx4rFunHfm)
* 📧 [support@21st.dev](mailto:support@21st.dev)