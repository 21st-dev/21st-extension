import type { PromptRequest } from '@21st-extension/extension-toolbar-srpc-contract';
import * as vscode from 'vscode';
import { callClineAgent } from './call-cline-agent';
import { callCopilotAgent } from './call-copilot-agent';
import { callCursorAgent } from './call-cursor-agent';
import { callRoocodeAgent } from './call-roocode-agent';
import { callWindsurfAgent } from './call-windsurf-agent';
import { callTraeAgent } from './call-trae-agent';
import { callKilocodeAgent } from './call-kilocode-agent';
import { getCurrentIDE } from './get-current-ide';
import { isClineInstalled } from './is-cline-installed';
import { isCopilotChatInstalled } from './is-copilot-chat-installed';
import { isRoocodeInstalled } from './is-roocode-installed';
import { isKilocodeInstalled } from './is-kilocode-installed';

export async function dispatchAgentCall(request: PromptRequest) {
  const ide = getCurrentIDE();
  switch (ide) {
    case 'TRAE':
      return await callTraeAgent(request);
    case 'CURSOR':
      return await callCursorAgent(request);
    case 'WINDSURF':
      return await callWindsurfAgent(request);
    case 'VSCODE':
      if (isClineInstalled()) return await callClineAgent(request);
      if (isRoocodeInstalled()) return await callRoocodeAgent(request);
      if (isKilocodeInstalled()) return await callKilocodeAgent(request);
      if (isCopilotChatInstalled()) return await callCopilotAgent(request);
      else {
        vscode.window.showErrorMessage(
          'Currently, only Copilot Chat, Cline, Roo Code, and Kilo Code are supported for VSCode. Please install one of them from the marketplace to use 21st.dev Extension with VSCode.',
        );
        break;
      }
    case 'UNKNOWN':
      vscode.window.showErrorMessage(
        'Failed to call agent: IDE is not supported',
      );
  }
}
