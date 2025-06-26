import { TWENTY_FIRST_URL } from '@/constants';
import { useChatState } from '@/hooks/use-chat-state';
import {
  useSelectedComponents,
  type SelectedComponentWithCode,
} from '@/hooks/use-selected-components';
import { useSRPCBridge } from '@/hooks/use-srpc-bridge';
import { useVSCode } from '@/hooks/use-vscode';
import { createPrompt, type PluginContextSnippets } from '@/prompts';
import type { ComponentSearchResult } from '@/types/supabase';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import LogoIcon from '../../../../assets/21st-logo-dark.svg';
import { TextShimmer } from '../../ui/text-shimmer';
import { ComponentResultButton } from './component-result-button';

interface SearchResultsProps {
  results: ComponentSearchResult[];
  isLoading: boolean;
  error: string | null;
  searchQuery?: string;
  domContextElements?: HTMLElement[];
  pluginContextSnippets?: PluginContextSnippets[];
  onSelectionChange?: (selectedResults: SelectedComponentWithCode[]) => void;
}

function CreateCustomComponentCard({
  searchQuery,
  results,
  domContextElements = [],
  pluginContextSnippets = [],
  selectedComponents = [],
}: {
  searchQuery?: string;
  results: ComponentSearchResult[];
  domContextElements?: HTMLElement[];
  pluginContextSnippets?: PluginContextSnippets[];
  selectedComponents?: any[];
}) {
  const [isCreatingQuery, setIsCreatingQuery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    currentChatId,
    clearSelectedComponents,
    removeChatDomContext,
    setChatInput,
  } = useChatState();
  const { clearSelection } = useSelectedComponents();
  const { bridge } = useSRPCBridge();
  const { selectedSession } = useVSCode();

  const handleOpenMagicChat = async () => {
    if (isCreatingQuery) return;

    setIsCreatingQuery(true);
    setError(null);

    try {
      const finalPrompt = await createPrompt(
        domContextElements,
        searchQuery ||
          'Create a custom component based on the following context',
        window.location.href,
        pluginContextSnippets,
        selectedComponents,
      );

      const response = await fetch(
        TWENTY_FIRST_URL + '/api/magic-chat/prefill-text',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: finalPrompt }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.id) {
        throw new Error('No ID returned from API');
      }

      const url = TWENTY_FIRST_URL + `/magic-chat?q_key=${data.id}`;

      // Use SRPC openExternal instead of window.open
      if (bridge && selectedSession) {
        const openResult = await bridge.call.openExternal(
          {
            url,
            sessionId: selectedSession.sessionId,
          },
          { onUpdate: () => {} },
        );

        if (!openResult.result.success) {
          throw new Error(openResult.result.error || 'Failed to open URL');
        }
      }

      // Clear everything after successful navigation - mimic message submission behavior
      if (currentChatId) {
        // Clear selected components from chat state
        clearSelectedComponents(currentChatId);

        // Clear DOM context elements by removing each one
        domContextElements.forEach((element) => {
          removeChatDomContext(currentChatId, element);
        });

        // Clear chat input - mimic successful message submission
        setChatInput(currentChatId, '');
      }

      // Clear local selected components state
      clearSelection();
    } catch (err) {
      console.error('Error creating query:', err);
      setError(err instanceof Error ? err.message : 'Failed to create query');
    } finally {
      setIsCreatingQuery(false);
    }
  };

  return (
    <button
      onClick={handleOpenMagicChat}
      disabled={isCreatingQuery}
      className="w-full flex items-center gap-3 p-2 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200 group border border-gray-200 hover:border-blue-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
        {isCreatingQuery ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <img src={LogoIcon} alt="21st Logo" className="w-10 h-10" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h3 className="font-medium text-sm text-gray-900 group-hover:text-blue-900 transition-colors">
          {isCreatingQuery ? 'Creating Query...' : 'Open in Magic Chat'}
        </h3>
        <p className="text-xs text-gray-600 group-hover:text-blue-700 transition-colors">
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : (
            'Create a custom component with AI'
          )}
        </p>
      </div>
      <div className="text-blue-500 group-hover:text-blue-600 transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-external-link-icon lucide-external-link"
        >
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      </div>
    </button>
  );
}

export function SearchResults({
  results,
  isLoading,
  error,
  searchQuery,
  domContextElements,
  pluginContextSnippets,
  onSelectionChange,
}: SearchResultsProps) {
  const { selectedComponents, addComponent, removeComponent, clearSelection } =
    useSelectedComponents();

  // Use ref to track if we need to notify parent
  const prevSelectedRef = useRef<number>(0);

  // Notify parent only when selection count changes
  useEffect(() => {
    if (
      onSelectionChange &&
      selectedComponents.length !== prevSelectedRef.current
    ) {
      prevSelectedRef.current = selectedComponents.length;
      onSelectionChange(selectedComponents);
    }
  }, [selectedComponents, onSelectionChange]);

  // Handle component selection - simplified without code fetching
  const handleComponentSelection = useCallback(
    (result: ComponentSearchResult, selected: boolean) => {
      if (selected) {
        addComponent(result);
      } else {
        removeComponent(result.id);
      }
    },
    [addComponent, removeComponent],
  );

  if (error) {
    return (
      <div className="p-2 text-xs text-red-500 bg-red-50/50 rounded border border-red-200/50">
        Search error: {error}
      </div>
    );
  }

  // Show CreateCustomComponentCard if there's a prompt or meaningful context
  const hasPromptOrContext =
    (searchQuery && searchQuery.trim().length > 0) ||
    (pluginContextSnippets && pluginContextSnippets.length > 0) ||
    (domContextElements && domContextElements.length > 0);

  // Don't render anything if not loading, no results, and no prompt/context
  if (!isLoading && results.length === 0 && !hasPromptOrContext) {
    return null;
  }

  return (
    <div>
      {isLoading ? (
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <TextShimmer
              duration={1.5}
              className="text-sm font-medium [--base-color:theme(colors.gray.600)] [--base-gradient-color:theme(colors.blue.600)]"
            >
              Searching components...
            </TextShimmer>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Show custom component card if there's a prompt or context elements */}
          {hasPromptOrContext && (
            <CreateCustomComponentCard
              searchQuery={searchQuery}
              results={results}
              domContextElements={domContextElements}
              pluginContextSnippets={pluginContextSnippets}
              selectedComponents={selectedComponents}
            />
          )}

          {/* Previously Selected Components Section */}
          {selectedComponents.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1 py-1">
                <h4 className="text-xs font-medium text-gray-700">
                  Selected Components ({selectedComponents.length})
                </h4>
                <button
                  onClick={clearSelection}
                  className="text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1">
                {selectedComponents.map((component) => (
                  <ComponentResultButton
                    key={`selected-${component.id}`}
                    result={component}
                    isSelected={true}
                    onSelectionChange={handleComponentSelection}
                  />
                ))}
              </div>
              {/* Divider between selected and search results */}
              {results.length > 0 && (
                <div className="border-t border-gray-200 my-2"></div>
              )}
            </div>
          )}

          {/* Search Results Section */}
          {results.length > 0 && (
            <div className="space-y-1">
              {selectedComponents.length > 0 && (
                <h4 className="text-xs font-medium text-gray-700 px-1 py-1">
                  Search Results
                </h4>
              )}
              <div className="max-h-[210px] overflow-y-auto space-y-1">
                {results
                  .filter(
                    (result) =>
                      !selectedComponents.some((c) => c.id === result.id),
                  ) // Don't show already selected components
                  .map((result) => (
                    <ComponentResultButton
                      key={result.id}
                      result={result}
                      isSelected={false}
                      onSelectionChange={handleComponentSelection}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
