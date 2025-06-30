import { dispatchAgentCall } from 'src/utils/dispatch-agent-call';
import * as vscode from 'vscode';

export async function updateToolbar() {
  const prompt = `
<task>
  Update all occurences of the 21st.dev Toolbar to the latest version.
</task>

<context>
  21st.dev Toolbar is a browser toolbar that connects frontend UI to coding AI agents in your code editor. It allows developers to select elements in a web app, leave comments, and let AI agents make changes based on that context.
</context>

<requirements>
    - Call the update method of the user-favored package manger that updates all packages under the scopes "@21st-extension/" and "@21st-extension/".
    - Depending on the repository setup (single proejct or monorepo), build a strategy on how to update all packages that use the 21st.dev Toolbar or it's plugins as a (dev)-dependency to the latest version.
      - Packages for the toolbar are either named "@21st-extension/toolbar" or "@21st-extension/toolbar-[framework-specific-variant]".
      - Plugin packages are named "@21st-extension/[plugin-name]".
      - Update all given packages that you find.
      - Apply the most solid and reliable strategy to thoroughly update all found packages or only 21st.dev Toolbar and it's plugins.
    - Execute your strategy while making sure that the package.json files are also updated to reflect the updated versions.
</requirements>

<expected_outcome>
  All 21st.dev Toolbar and official plugin packages are updated to the latest available versions.
</expected_outcome>`;

  await dispatchAgentCall({
    prompt,
    sessionId: vscode.env.sessionId,
  });
}
