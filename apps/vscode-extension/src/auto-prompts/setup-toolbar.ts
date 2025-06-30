import { dispatchAgentCall } from 'src/utils/dispatch-agent-call';
import * as vscode from 'vscode';

export async function setupToolbar() {
  const prompt = `
<task>
  Implement the 21st.dev Toolbar into an existing web project to provide AI-powered editing capabilities through a browser toolbar.
</task>

<context>
  21st.dev Toolbar is a browser toolbar that connects frontend UI to coding AI agents in your code editor. It allows developers to select elements in a web app, leave comments, and let AI agents make changes based on that context.
</context>

<requirements>
  1. Install the required 21st.dev Toolbar package(s) for the project's framework
  2. Integrate the 21st.dev Toolbar into the project structure (ensure it only runs in development mode)
  3. Add the 21st.dev Extension to the active repositories recommended extensions list. If the list does not yet exist, cretae a new one.
</requirements>

<implementation_steps>
  <step_0>
    Identify the project's package manager (npm, yarn, pnpm, etc.). You must use the same package manager to install the 21st.dev Toolbar package.
  </step_0>
  <step_1>
    Identify, if the repository only contains one web app project or multiple. If multiple projects are located inside the repository, ask the user to which project the toolbar should be installed to.
  </step_1>
  <step_2>
    Identify, if the specific project already uses a 21st.dev Toolbar package. If so, ask the user if they want to use the existing package or replace it with a new one.
  </step_2>
  <step_3>
    If the project already included 21st.dev Toolbar, chek for correct integration and do changes if necessary.
    If the project does not include 21st.dev Toolbar, install the appropriate 21st.dev Toolbar package and follow the framework specific steps.
    If there is no description on how to install 21st.dev Toolbar for the used framework, reject the users request and say that the user needs to install the 21st.dev Toolbar package manually.
  </step_3>
</implementation_steps>

<framework_specific_integrations>
  <react>
    Use the \`@21st-extension/toolbar-react\` package for integration.
    Also, install and use the \`@21st-extension/react\` package for react specific functionality.

    Include the TwentyFirstToolbar component (exported by the \`\@21st-extension/toolbar-react\` package) inside the top-most component of the app.
    Set the \`config\` prop to an object with the plugins array containing the \`ReactPlugin\` (exported by the \`\@21st-extension/react\` package).

    Note: The \`@21st-extension/toolbar-react\` package already handles rendering the toolbar only in development mode. The "enabled" prop can be overriden with custom logic to conditionally load the toolbar.
  </react>
  
  <next>
    Use the \`@21st-extension/toolbar-next\` package for integration.
    Also, install and use the \`@21st-extension/react\` package for react specific functionality.

    Include the TwentyFirstToolbar component in the root layout file (layout.tsx).
    Set the \`config\` prop to an object with the plugins array containing the \`ReactPlugin\` (exported by the \`\@21st-extension/react\` package).

    Note: The \`@21st-extension/toolbar-next\` package already handles opt-out of SSR so that a simple integration of the component is enough.
    Note: The \`@21st-extension/toolbar-next\` package already handles rendering the toolbar only in development mode. The "enabled" prop can be overriden with custom logic to conditionally load the toolbar.
  </next>
  
  <vue>
    Use the \`@21st-extension/toolbar-vue\` package for integration.
    Also, install and use the \`@21st-extension/vue\` package for vue specific functionality.

    Add the TwentyFirstToolbar component to the main App component.
    Set the \`config\` prop to an object with the plugins array containing the \`VuePlugin\` (exported by the \`\@21st-extension/vue\` package).
  </vue>
  
  <nuxt>
    Use the \`@21st-extension/toolbar-nuxt\` package for integration.
    Also, install and use the \`@21st-extension/vue\` package for vue specific functionality.

    Wrap the TwentyFirstToolbar component in a ClientOnly component to ensure it only renders on the client side.
    Set the \`config\` prop to an object with the plugins array containing the \`VuePlugin\` (exported by the \`\@21st-extension/vue\` package).
  </nuxt>
  
  <svelte>
    Use the \`@21st-extension/toolbar\` package for integration.

    If the project is using SvelteKit, put the following code into the \`hooks.client.ts\` file:
    \`\`\`ts
    import { initToolbar } from '@21st-extension/toolbar';

    export function init() {
      // Keep other functionality that may already exist in the file
      // Just add the below initToolbar call (conditionally, depending if a dev mode is detected)

      // If the users uses other existing metrics to check for dev mode, use that instead of import.meta.env.DEV
      if (import.meta.env.DEV) {
        initToolbar({
          plugins: [],
        });
      }
    }
    \`\`\` 

    If the project is using Svelte without SvelteKit, put the following code into the \`main.ts\` file (or any other file that is the entry to the app):
    \`\`\`ts
    import { initToolbar } from '@21st-extension/toolbar';

    initToolbar({
      plugins: [],
    });
    \`\`\`
  </svelte>
</framework_specific_integrations>

<workspace_extensions_list>
  The recommended extensions lsit for a workspace is located in the root fo the workspace and has the filename "extensions.json".

  <example_list>
    {
      "recommendations": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
    }
  </example_list>

  <requirement>
    Make sure, that the 21st-extension extension is added to the recommended extensions list if it is not already present. The name of the extension is "21st.21st-extension".

    If the list does not yet exist, create a new one with the following content:
    <new_list_content>
      {
        "recommendations": ["21st.21st-extension"]
      }
    </new_list_content>
  </requirement>
</workspace_extensions_list>

<expected_outcome>
  A properly integrated 21st-extension toolbar that:
  1. Appears only in development mode
  2. Is not included in production builds
  3. Does not lead to any linting errors
  4. Is loaded once on initial opening in the browser
  5. Is only executed in the browser and not any SSR or server environment
</expected_outcome>`;

  await dispatchAgentCall({
    prompt,
    sessionId: vscode.env.sessionId,
  });
}
