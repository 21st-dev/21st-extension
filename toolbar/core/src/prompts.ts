import { TWENTY_FIRST_URL } from '@/constants';
import type { SelectedComponentWithCode } from './hooks/use-selected-components';
import type { ContextSnippet } from './plugin';

/**
 * Extracts relevant attributes from an HTMLElement.
 * Filters out potentially noisy attributes like 'style' if computed styles are handled separately.
 * Prioritizes identifying attributes.
 */
function getElementAttributes(element: HTMLElement): { [key: string]: string } {
  const attrs: { [key: string]: string } = {};
  const priorityAttrs = [
    'id',
    'class',
    'name',
    'type',
    'href',
    'src',
    'alt',
    'for',
    'placeholder',
  ]; // Common identifying attributes
  const dataAttrs = [];

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    // Store data-* attributes separately for emphasis
    if (attr.name.startsWith('data-')) {
      dataAttrs.push({ name: attr.name, value: attr.value });
    }
    // Capture priority attributes or others, potentially excluding style if handled elsewhere
    else if (
      priorityAttrs.includes(attr.name.toLowerCase()) ||
      attr.name.toLowerCase() !== 'style'
    ) {
      // Include 'class' even though classList is preferred, as it's in the source HTML
      attrs[attr.name] = attr.value;
    }
  }
  // Add data attributes to the main dictionary, perhaps prefixed for clarity
  dataAttrs.forEach((da) => {
    attrs[da.name] = da.value;
  });
  return attrs;
}

/**
 * Generates a detailed context string for a single HTMLElement.
 */
function generateElementContext(element: HTMLElement, index: number): string {
  let context = `<element index="${index + 1}">\n`;
  context += `  <tag>${element.tagName.toLowerCase()}</tag>\n`;

  const id = element.id;
  if (id) {
    context += `  <id>${id}</id>\n`;
  }

  const classes = Array.from(element.classList).join(', ');
  if (classes) {
    context += `  <classes>${classes}</classes>\n`;
  }

  const attributes = getElementAttributes(element);
  if (Object.keys(attributes).length > 0) {
    context += `  <attributes>\n`;
    for (const [key, value] of Object.entries(attributes)) {
      if (key.toLowerCase() !== 'class' || !classes) {
        context += `    <${key}>${value}</${key}>\n`;
      }
    }
    context += `  </attributes>\n`;
  }

  const text = element.innerText?.trim();
  if (text) {
    const maxLength = 100;
    context += `  <text>${text.length > maxLength ? `${text.substring(0, maxLength)}...` : text}</text>\n`;
  }

  context += `  <structural_context>\n`;
  if (element.parentElement) {
    const parent = element.parentElement;
    context += `    <parent>\n`;
    context += `      <tag>${parent.tagName.toLowerCase()}</tag>\n`;
    if (parent.id) {
      context += `      <id>${parent.id}</id>\n`;
    }
    const parentClasses = Array.from(parent.classList).join(', ');
    if (parentClasses) {
      context += `      <classes>${parentClasses}</classes>\n`;
    }
    context += `    </parent>\n`;
  } else {
    context += `    <parent>No parent element found (likely root or disconnected)</parent>\n`;
  }
  context += `  </structural_context>\n`;

  try {
    const styles = window.getComputedStyle(element);
    const relevantStyles = {
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      display: styles.display,
    };
    context += `  <styles>\n`;
    for (const [key, value] of Object.entries(relevantStyles)) {
      context += `    <${key}>${value}</${key}>\n`;
    }
    context += `  </styles>\n`;
  } catch (e) {
    context += `  <styles>Could not retrieve computed styles</styles>\n`;
  }

  context += `</element>\n`;
  return context;
}

export interface PluginContextSnippets {
  pluginName: string;
  contextSnippets: ContextSnippet[];
}
[];

/**
 * Formats selected components into a structured prompt format.
 * Fetches prompts from API for each component and includes them in the output.
 */
async function formatSelectedComponents(
  components: SelectedComponentWithCode[],
): Promise<string> {
  if (!components || components.length === 0) {
    return '';
  }

  // Helper function to check if component needs API prompt
  const needsApiPrompt = (component: SelectedComponentWithCode): boolean => {
    const description = component.component_data?.description || '';
    const installCommand = component.component_data?.install_command || '';

    // Skip API for icons, logos, and documentation
    if (description.includes('icon from Lucide Icons library')) return false;
    if (description.includes('logo from SVGL')) return false;
    if (installCommand.startsWith('// Documentation:')) return false;

    return true;
  };

  // Helper function to generate local prompt for icons/logos/docs
  const generateLocalPrompt = (
    component: SelectedComponentWithCode,
  ): string => {
    const description = component.component_data?.description || '';
    const installCommand = component.component_data?.install_command || '';
    const name = component.component_data?.name || component.name || 'Unknown';

    if (description.includes('icon from Lucide Icons library')) {
      return `You are given a task to integrate an existing Lucide icon in the codebase

The codebase should support:
- React/Preact or similar framework
- TypeScript (recommended)

Import the icon:
\`\`\`tsx
${installCommand}
\`\`\`

Usage example:
\`\`\`tsx
import { ${name} } from 'lucide-react';

function MyComponent() {
  return (
    <div>
      <${name} className="h-4 w-4" />
    </div>
  );
}
\`\`\`

The icon is fully customizable via className prop for size, color, and other styles.`;
    }

    if (description.includes('logo from SVGL')) {
      const logoUrl = component.preview_url;
      return `You are given a task to integrate a brand logo in the codebase

${installCommand}

Usage example:
\`\`\`tsx
function MyComponent() {
  return (
    <div>
      <img 
        src="${logoUrl}" 
        alt="${name}" 
        className="h-6 w-6"
      />
    </div>
  );
}
\`\`\`

The logo URL is: ${logoUrl}
You can use this logo in img tags, as background images, or in any way that fits your design.`;
    }

    if (installCommand.startsWith('// Documentation:')) {
      return `${installCommand}

This is documentation reference for ${name}.
${component.component_data?.description || ''}

Use this documentation as context for implementing features, understanding APIs, or following best practices for this technology.`;
    }

    return '';
  };

  // Separate components into those that need API calls and those that don't
  const componentsNeedingApi = components.filter(needsApiPrompt);
  const localComponents = components.filter((c) => !needsApiPrompt(c));

  // Fetch prompts for components that need API calls
  const promptPromises = componentsNeedingApi.map((component) =>
    fetch(TWENTY_FIRST_URL + '/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt_type: 'extended',
        demo_id: component.id,
        rule_id: null,
        additional_context: null,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch prompt for component ${component.id}: ${response.statusText}`,
          );
        }
        return response.json();
      })
      .then((data) => {
        // Extract the prompt from the response structure and add componentId
        if (data && data.prompt) {
          return {
            prompt: data.prompt,
            debug: data.debug,
            componentId: component.id, // Add componentId from the original component
          };
        }
        throw new Error(
          `No prompt found in response for component ${component.id}`,
        );
      })
      .catch((error) => {
        console.warn(
          `Failed to fetch prompt for component ${component.id}:`,
          error,
        );
        return null; // Return null for failed requests
      }),
  );

  // Wait for all prompt requests to settle (some may fail, some may succeed)
  const promptResults = await Promise.allSettled(promptPromises);

  // Create a map of component ID to prompt for easy lookup
  const promptMap = new Map<number, string>();
  promptResults
    .filter(
      (result): result is PromiseFulfilledResult<any> =>
        result.status === 'fulfilled' && result.value !== null,
    )
    .forEach((result) => {
      const data = result.value;
      if (data?.prompt && data?.componentId) {
        promptMap.set(data.componentId, data.prompt);
      }
    });

  const formattedComponents = components
    .map((component, index) => {
      const fetchedPrompt = promptMap.get(component.id);
      const localPrompt = !needsApiPrompt(component)
        ? generateLocalPrompt(component)
        : null;
      const finalPrompt = fetchedPrompt || localPrompt;

      return `
  <component index="${index + 1}">
    <name>${component.component_data.name || component.name || 'Unknown'}</name>
    <description>${component.component_data.description || 'No description available'}</description>
    ${
      finalPrompt
        ? `
    <install_instructions>
${finalPrompt}
    </install_instructions>`
        : ''
    }
  </component>`;
    })
    .join('\n');

  return `
  <inspiration_components>
    <instructions>
      The user has selected the following UI components as inspiration or reference for achieving their goal.
      Use these components in the following ways:
      1. INSPIRATION: Use the design patterns, styling approaches, and component structure as inspiration
      2. CODE REFERENCE: Extract and adapt the code from the component prompts to implement similar functionality
      3. INTEGRATION: Incorporate elements from these components into your solution for the user's goal
      4. BEST PRACTICES: Follow the coding patterns and conventions demonstrated in these components
      
      Each component includes:
      - Component metadata (name, description, ID)
      - Detailed implementation prompt with code examples and instructions
      
      IMPORTANT: The user's goal should be achieved by leveraging these selected components as building blocks or inspiration.
    </instructions>
${formattedComponents}
  </inspiration_components>`;
}

export interface RuntimeError {
  message: string;
  filename: string;
  lineno: number;
  colno: number;
  stack?: string;
  timestamp: Date;
}

/**
 * Creates a comprehensive prompt for a Coding Agent LLM.
 *
 * @param selectedElements - An array of HTMLElements the user interacted with.
 * @param userPrompt - The user's natural language instruction.
 * @param url - The URL of the page where the interaction occurred.
 * @param contextSnippets - An array of context snippets from a list of plugins.
 * @param selectedComponents - An optional array of selected UI components (without code content).
 * @param runtimeError - An optional runtime error to include in the context.
 * @returns A formatted string prompt for the LLM.
 */
export async function createPrompt(
  selectedElements: HTMLElement[],
  userPrompt: string,
  url: string,
  contextSnippets: PluginContextSnippets[],
  selectedComponents?: SelectedComponentWithCode[],
  runtimeError?: RuntimeError | null,
): Promise<string> {
  const pluginContext = contextSnippets
    .map((snippet) =>
      `
      <plugin_contexts>
<${snippet.pluginName}>
${snippet.contextSnippets.map((snippet) => `    <${snippet.promptContextName}>${snippet.content}</${snippet.promptContextName}>`).join('\n')}
</${snippet.pluginName}>
</plugin_contexts>
`.trim(),
    )
    .join('\n');

  const selectedComponentsSection =
    selectedComponents && selectedComponents.length > 0
      ? await formatSelectedComponents(selectedComponents)
      : '';

  const runtimeErrorSection = runtimeError
    ? `
  <runtime_error>
    <message>${runtimeError.message}</message>
    <file>${runtimeError.filename}</file>
    <line>${runtimeError.lineno}</line>
    <column>${runtimeError.colno}</column>
    <timestamp>${runtimeError.timestamp.toISOString()}</timestamp>
    ${runtimeError.stack ? `<stack_trace>${runtimeError.stack}</stack_trace>` : ''}
  </runtime_error>`
    : '';

  // Create fallback user_goal when no specific prompt is provided
  const getFallbackUserGoal = () => {
    const hasSelectedElements = selectedElements && selectedElements.length > 0;
    const hasInspirationComponents =
      selectedComponents && selectedComponents.length > 0;

    if (hasSelectedElements && hasInspirationComponents) {
      return 'You have html components that are selected on the website. Please improve their design using the provided inspiration_components as reference and guidance.';
    } else if (hasSelectedElements) {
      return 'You have html components that are selected on the website. Please analyze and improve their design and functionality.';
    } else if (hasInspirationComponents) {
      return 'You have inspiration components available and instructions on how to use them. Combine them based on provided context.';
    } else {
      return 'Please analyze the given context and generate design for it.';
    }
  };

  const finalUserGoal = userPrompt.trim() || getFallbackUserGoal();

  if (!selectedElements || selectedElements.length === 0) {
    return `
    <request>
      <user_goal>${finalUserGoal}</user_goal>
      <url>${url}</url>
  <context>No specific element was selected on the page. Please analyze the page code in general or ask for clarification.</context>${selectedComponentsSection}
  ${pluginContext}
  ${runtimeErrorSection}
</request>`.trim();
  }

  let detailedContext = '';
  selectedElements.forEach((element, index) => {
    detailedContext += generateElementContext(element, index);
  });

  return `
<request>
  <user_goal>${finalUserGoal}</user_goal>
  <url>${url}</url>
  <selected_elements>
    ${detailedContext.trim()}
  </selected_elements>
  ${pluginContext}
  ${selectedComponentsSection}
  ${runtimeErrorSection}
</request>`.trim();
}
