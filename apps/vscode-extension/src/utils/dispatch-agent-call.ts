import type { PromptRequest } from '@21st-extension/extension-toolbar-srpc-contract';
import * as vscode from 'vscode';
import { callClineAgent } from './call-cline-agent';
import { callCopilotAgent } from './call-copilot-agent';
import { callCursorAgent } from './call-cursor-agent';
import { callRoocodeAgent } from './call-roocode-agent';
import { callWindsurfAgent } from './call-windsurf-agent';
import { getCurrentIDE } from './get-current-ide';
import { isClineInstalled } from './is-cline-installed';
import { isCopilotChatInstalled } from './is-copilot-chat-installed';
import { isRoocodeInstalled } from './is-roocode-installed';

export async function dispatchAgentCall(request: PromptRequest) {
  const ide = getCurrentIDE();
  switch (ide) {
    case 'CURSOR':
      return await callCursorAgent(request);
    case 'WINDSURF':
      return await callWindsurfAgent(request);
    case 'VSCODE':
      if (isClineInstalled()) return await callClineAgent(request);
      if (isRoocodeInstalled()) return await callRoocodeAgent(request);
      if (isCopilotChatInstalled()) return await callCopilotAgent(request);
      else {
        vscode.window.showErrorMessage(
          'Currently, only Copilot Chat is supported for VSCode. Please install it from the marketplace to use 21st.dev Extension with VSCode.',
        );
        break;
      }
    case 'UNKNOWN':
      vscode.window.showErrorMessage(
        'Failed to call agent: IDE is not supported',
      );
  }
}
