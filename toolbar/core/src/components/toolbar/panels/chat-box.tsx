import { useChatState } from '@/hooks/use-chat-state';
import { useComponentSearch } from '@/hooks/use-component-search';
import { useSearchIntent } from '@/hooks/use-search-intent';
import { useHotkeyListenerComboText } from '@/hooks/use-hotkey-listener-combo-text';
import { usePlugins } from '@/hooks/use-plugins';
import type { SelectedComponentWithCode } from '@/hooks/use-selected-components';
import { cn, HotkeyActions } from '@/utils';
import { Textarea } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { TWENTY_FIRST_URL } from '@/constants';
import { createPrompt } from '@/prompts';
import { useVSCode } from '@/hooks/use-vscode';
import { getIDENameFromAppName } from '@/utils/get-ide-name';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { SearchResults, type SearchResultsRef } from './search-results';
import { SelectedDomElements } from './selected-dom-elements';
import { InlineSuggestion } from '@/components/ui/inline-suggestion';
import type { ComponentSearchResult } from '@/types/supabase';
import { useSelectedComponents } from '@/hooks/use-selected-components';
import { XIcon } from 'lucide-react';

export function ToolbarChatArea() {
  const chatState = useChatState();
  const [isComposing, setIsComposing] = useState(false);
  const { plugins } = usePlugins();
  const { appName } = useVSCode();
  const { selectedComponents, removeComponent, addComponent } =
    useSelectedComponents();

  // Search results focus state from chatState
  const { isSearchResultsFocused, setSearchResultsFocused } = chatState;
  const [activeSearchResult, setActiveSearchResult] = useState<
    ComponentSearchResult | undefined
  >();
  const [searchDisabled, setSearchDisabled] = useState(false);
  const [searchActivated, setSearchActivated] = useState(false);

  // Determine IDE name using the same logic as get-current-ide.ts
  const ideName = useMemo(() => {
    return getIDENameFromAppName(appName);
  }, [appName]);

  const currentChat = useMemo(
    () => chatState.chats.find((c) => c.id === chatState.currentChatId),
    [chatState.chats, chatState.currentChatId],
  );

  const currentInput = useMemo(() => {
    const input = currentChat?.inputValue || '';
    return input;
  }, [currentChat?.inputValue]);

  // Use search intent hook for constant API calls
  const { searchIntent } = useSearchIntent(currentInput);

  // Add component search hook - only when search is activated
  const { results, isLoading, error } = useComponentSearch(
    searchActivated ? currentInput : '',
    searchActivated ? searchIntent : undefined,
  );

  // Get DOM context elements from current chat
  const domContextElements = useMemo(() => {
    const elements =
      currentChat?.domContextElements.map((e) => e.element) || [];
    return elements;
  }, [currentChat?.domContextElements]);

  // Create plugin context snippets (simplified version for search results)
  const pluginContextSnippets = useMemo(() => {
    if (!currentChat?.domContextElements.length) {
      return [];
    }

    const snippets = plugins
      .filter((plugin) => plugin.onContextElementSelect)
      .map((plugin) => ({
        pluginName: plugin.pluginName,
        contextSnippets: currentChat.domContextElements.flatMap((el) =>
          el.pluginContext
            .filter((pc) => pc.pluginName === plugin.pluginName)
            .map((pc) => ({
              promptContextName: 'element_context',
              content: JSON.stringify(pc.context),
            })),
        ),
      }))
      .filter((snippet) => snippet.contextSnippets.length > 0);

    return snippets;
  }, [currentChat?.domContextElements, plugins]);

  const handleInputChange = useCallback(
    (value: string) => {
      chatState.setChatInput(chatState.currentChatId, value);

      // Reset search activation if input becomes empty
      if (value.trim() === '') {
        setSearchActivated(false);
      }

      // Re-enable search when user types
      if (searchDisabled) {
        setSearchDisabled(false);
      }
    },
    [chatState.setChatInput, chatState.currentChatId, searchDisabled],
  );

  const handleSubmit = useCallback(() => {
    if (!currentChat || !currentInput.trim()) return;
    chatState.addMessage(currentChat.id, currentInput);
    // Reset search state after sending
    setSearchActivated(false);
  }, [currentChat, currentInput, chatState.addMessage]);

  const handleMagicChatSubmit = useCallback(async () => {
    if (!currentChat || !currentInput.trim()) return;

    try {
      const finalPrompt = await createPrompt(
        currentChat.domContextElements.map((e) => e.element),
        currentInput,
        window.location.href,
        pluginContextSnippets,
        currentChat.selectedComponents || [],
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
      window.open(url, '_blank', 'noopener,noreferrer');

      // Clear everything after successful navigation
      if (chatState.currentChatId) {
        chatState.clearSelectedComponents(chatState.currentChatId);
        currentChat.domContextElements.forEach((elementData) => {
          chatState.removeChatDomContext(
            chatState.currentChatId,
            elementData.element,
          );
        });
        chatState.setChatInput(chatState.currentChatId, '');
        // Reset search state
        setSearchActivated(false);
      }
    } catch (err) {
      console.error('Error opening Magic Chat:', err);
    }
  }, [currentChat, currentInput, pluginContextSnippets, chatState]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchResultsRef = useRef<SearchResultsRef>(null);

  useEffect(() => {
    const blurHandler = () => inputRef.current?.focus();

    if (chatState.isPromptCreationActive) {
      inputRef.current?.focus();
      inputRef.current?.addEventListener('blur', blurHandler);
    } else {
      inputRef.current?.blur();
    }

    return () => {
      inputRef.current?.removeEventListener('blur', blurHandler);
    };
  }, [chatState.isPromptCreationActive]);

  const buttonClassName = useMemo(
    () =>
      cn(
        'flex size-8 items-center justify-center rounded-full bg-transparent p-1 text-zinc-950 opacity-20 transition-all duration-150',
        currentInput.length > 0 && 'bg-blue-600 text-white opacity-100',
        chatState.promptState === 'loading' &&
          'cursor-not-allowed bg-zinc-300 text-zinc-500 opacity-30',
      ),
    [currentInput.length, chatState.promptState],
  );

  const textareaClassName = useMemo(
    () =>
      cn(
        'ml-1 h-full w-full flex-1 resize-none bg-transparent text-zinc-950 transition-all duration-150 placeholder:text-zinc-950/50 focus:outline-none',
        chatState.promptState === 'loading' &&
          'text-zinc-500 placeholder:text-zinc-400',
      ),
    [chatState.promptState],
  );

  // Container styles based on prompt state
  const containerClassName = useMemo(() => {
    const hasSelectedElements =
      currentChat?.domContextElements &&
      currentChat.domContextElements.length > 0;
    const baseClasses = hasSelectedElements
      ? 'flex min-h-24 w-full flex-1 flex-row items-start gap-1 rounded-2xl p-2 text-sm text-zinc-950 shadow-md backdrop-blur transition-all duration-150 placeholder:text-zinc-950/70'
      : 'flex h-24 w-full flex-1 flex-row items-end gap-1 rounded-2xl p-2 text-sm text-zinc-950 shadow-md backdrop-blur transition-all duration-150 placeholder:text-zinc-950/70';

    switch (chatState.promptState) {
      case 'loading':
        return cn(
          baseClasses,
          'border-2 border-transparent bg-zinc-50/80',
          'chat-loading-gradient',
        );
      case 'success':
        return cn(
          baseClasses,
          'border-2 border-transparent bg-zinc-50/80',
          'chat-success-border',
        );
      case 'error':
        return cn(
          baseClasses,
          'border-2 border-transparent bg-zinc-50/80',
          'chat-error-border animate-shake',
        );
      default:
        return cn(baseClasses, 'border border-border/30 bg-zinc-50/80');
    }
  }, [chatState.promptState, currentChat?.domContextElements]);

  const ctrlAltCText = useHotkeyListenerComboText(HotkeyActions.ALT_PERIOD);

  const handleComponentSelection = useCallback(
    (result: ComponentSearchResult, selected: boolean) => {
      if (selected) {
        // Add component to selected components
        addComponent(result);
      } else {
        // Remove component (if needed)
        removeComponent(result.id);
      }
    },
    [addComponent, removeComponent],
  );

  const handleRemoveComponent = useCallback(
    (componentId: string) => {
      removeComponent(Number.parseInt(componentId, 10));
      // Return focus to input, close search results and disable search
      setSearchDisabled(true);
      setSearchActivated(false);
      setTimeout(() => {
        inputRef.current?.focus();
        setSearchResultsFocused(false);
      }, 100);
    },
    [removeComponent, setSearchResultsFocused],
  );

  // Show search results only when search is activated
  const shouldShowSearchResults =
    !searchDisabled && searchActivated && chatState.isPromptCreationActive;

  // Show inline suggestion when there's search intent but search not activated
  const shouldShowInlineSuggestion =
    !searchDisabled &&
    !searchActivated &&
    searchIntent &&
    chatState.isPromptCreationActive &&
    !isSearchResultsFocused;

  const handleFocusReturn = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearchDeactivation = useCallback(() => {
    setSearchActivated(false);
  }, []);

  const handleSearchResultsFocusChange = useCallback(
    (isFocused: boolean, activeResult?: ComponentSearchResult) => {
      setSearchResultsFocused(isFocused);
      setActiveSearchResult(activeResult);
      // If focus is lost, just reset disabled state but keep search activated
      if (!isFocused) {
        setSearchDisabled(false);
        // Note: We keep searchActivated true to maintain search results
      }
    },
    [setSearchResultsFocused],
  );

  // Handle submit or add to context based on focus state
  const handleSubmitOrAddToContext = useCallback(() => {
    if (isSearchResultsFocused && searchResultsRef.current) {
      // Try to select active component from search results
      const success = searchResultsRef.current.selectActiveComponent();
      if (success) {
        // Component was selected, return focus to input
        setTimeout(() => handleFocusReturn(), 100);
        return;
      }
    }

    // Normal submit behavior
    if (!currentChat || !currentInput.trim()) return;
    chatState.addMessage(currentChat.id, currentInput);
  }, [
    isSearchResultsFocused,
    currentChat,
    currentInput,
    chatState,
    handleFocusReturn,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Tab' && shouldShowInlineSuggestion) {
        // Activate search when Tab is pressed with search intent
        e.preventDefault();
        setSearchActivated(true);
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          // ⌘ + ⏎ (or Ctrl + ⏎ on Windows/Linux)
          handleMagicChatSubmit();
        } else {
          // Just ⏎ - either select component or submit
          handleSubmitOrAddToContext();
        }
      } else if (e.key === 'ArrowDown' && shouldShowSearchResults) {
        // Focus on search results when arrow down is pressed
        e.preventDefault();
        searchResultsRef.current?.focusOnResults();
      }
    },
    [
      shouldShowInlineSuggestion,
      handleMagicChatSubmit,
      handleSubmitOrAddToContext,
      isComposing,
      shouldShowSearchResults,
    ],
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Search Results */}
      {shouldShowSearchResults && (
        <SearchResults
          ref={searchResultsRef}
          results={results}
          isLoading={isLoading}
          error={error}
          searchQuery={currentInput}
          domContextElements={domContextElements}
          pluginContextSnippets={pluginContextSnippets}
          selectedComponents={selectedComponents}
          onComponentSelection={handleComponentSelection}
          onFocusReturn={handleFocusReturn}
          onFocusChange={handleSearchResultsFocusChange}
        />
      )}

      {/* Chat Input */}
      <div
        className={containerClassName}
        onClick={() => chatState.startPromptCreation()}
        role="button"
        tabIndex={0}
      >
        <div className="flex w-full flex-col gap-1">
          {/* Selected DOM Elements and Components inside input */}
          {((currentChat?.domContextElements &&
            currentChat.domContextElements.length > 0) ||
            selectedComponents.length > 0) && (
            <div className="slide-in-from-top-2 animate-in duration-200 ease-out">
              <SelectedDomElements
                elements={currentChat?.domContextElements || []}
                selectedComponents={selectedComponents}
                onRemoveComponent={handleRemoveComponent}
                chatId={chatState.currentChatId}
                compact={true}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="relative">
              <Textarea
                ref={inputRef}
                className={textareaClassName}
                value={currentInput}
                onChange={(e) => handleInputChange(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder={
                  chatState.isPromptCreationActive
                    ? chatState.promptState === 'loading'
                      ? 'Processing...'
                      : 'Enter prompt or 21st.dev search...'
                    : `What do you want to change? (${ctrlAltCText})`
                }
                disabled={chatState.promptState === 'loading'}
              />
              <InlineSuggestion
                text={currentInput}
                suggestion={searchIntent}
                visible={shouldShowInlineSuggestion}
                className="z-10"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  '!py-0 gap-0.5 border-none bg-transparent text-[10px] hover:bg-transparent',
                  (currentInput.trim().length > 0 ||
                    (currentChat?.domContextElements &&
                      currentChat.domContextElements.length > 0)) &&
                    chatState.promptState !== 'loading'
                    ? 'text-black hover:text-gray-800'
                    : 'cursor-not-allowed text-gray-400',
                )}
                disabled={
                  (currentInput.trim().length === 0 &&
                    (!currentChat?.domContextElements ||
                      currentChat.domContextElements.length === 0)) ||
                  chatState.promptState === 'loading'
                }
                onClick={handleMagicChatSubmit}
              >
                <span className="mr-1 font-semibold">Magic Create</span>
                <span
                  className={cn(
                    (currentInput.trim().length > 0 ||
                      (currentChat?.domContextElements &&
                        currentChat.domContextElements.length > 0)) &&
                      chatState.promptState !== 'loading'
                      ? 'text-gray-600'
                      : 'text-gray-400',
                  )}
                >
                  ⌘
                </span>
                <span
                  className={cn(
                    (currentInput.trim().length > 0 ||
                      (currentChat?.domContextElements &&
                        currentChat.domContextElements.length > 0)) &&
                      chatState.promptState !== 'loading'
                      ? 'text-gray-600'
                      : 'text-gray-400',
                  )}
                >
                  ⏎
                </span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={cn(
                  'gap-0.5 border-none py-0.5 text-[10px] transition-all duration-200',
                  // Add to context state (keep original blue)
                  isSearchResultsFocused &&
                    'bg-blue-500 text-white hover:bg-blue-600',
                  // Send to IDE state (black background, white text)
                  !isSearchResultsFocused &&
                    currentInput.trim().length > 0 &&
                    chatState.promptState !== 'loading' &&
                    'bg-black text-white hover:bg-gray-800 hover:text-white',
                  // Disabled state
                  (currentInput.trim().length === 0 &&
                    !isSearchResultsFocused) ||
                    chatState.promptState === 'loading'
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500 hover:bg-gray-300 hover:text-gray-500'
                    : '',
                )}
                disabled={
                  (currentInput.trim().length === 0 &&
                    !isSearchResultsFocused) ||
                  chatState.promptState === 'loading'
                }
                onClick={handleSubmitOrAddToContext}
              >
                <span className="mr-1 font-semibold">
                  {isSearchResultsFocused
                    ? 'Add to context'
                    : `Send to ${ideName}`}
                </span>
                <span>⏎</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
