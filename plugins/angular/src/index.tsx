import type { ToolbarPlugin } from '@21st-extension/toolbar';
import { AngularLogo } from './logo';
import {
  getSelectedElementAnnotation,
  getSelectedElementsPrompt,
} from './utils';

export const AngularPlugin: ToolbarPlugin = {
  displayName: 'Angular',
  description:
    'This toolbar adds additional information and metadata for apps using Angular as a UI framework',
  iconSvg: <AngularLogo />,
  pluginName: 'angular',
  onContextElementHover: getSelectedElementAnnotation,
  onContextElementSelect: getSelectedElementAnnotation,
  onPromptSend: (prompt) => {
    const content = getSelectedElementsPrompt(prompt.contextElements);

    if (!content) {
      return { contextSnippets: [] };
    }

    return {
      contextSnippets: [
        {
          promptContextName: 'elements-angular-component-info',
          content: content,
        },
      ],
    };
  },
};
