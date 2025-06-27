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
import { useSRPCBridge } from '@/hooks/use-srpc-bridge';
import { getIDENameFromAppName } from '@/utils/get-ide-name';
import { useDraggable, DraggableProvider } from '@/hooks/use-draggable';
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

// Component for drag border areas
function DragBorderAreas() {
  return (
    <>
      {/* Top border area */}
      <div className="drag-border-area -top-1 absolute right-4 left-4 h-2 cursor-grab" />
      {/* Bottom border area */}
      <div className="drag-border-area -bottom-1 absolute right-4 left-4 h-2 cursor-grab" />
      {/* Left border area */}
      <div className="drag-border-area -left-1 absolute top-4 bottom-4 w-2 cursor-grab" />
      {/* Right border area */}
      <div className="drag-border-area -right-1 absolute top-4 bottom-4 w-2 cursor-grab" />
      {/* Corner areas for better grabbing */}
      <div className="drag-border-area -top-1 -left-1 absolute h-3 w-3 cursor-grab" />
      <div className="drag-border-area -top-1 -right-1 absolute h-3 w-3 cursor-grab" />
      <div className="drag-border-area -bottom-1 -left-1 absolute h-3 w-3 cursor-grab" />
      <div className="drag-border-area -right-1 -bottom-1 absolute h-3 w-3 cursor-grab" />
    </>
  );
}

export function ToolbarChatArea() {
  const chatState = useChatState();
  const [isComposing, setIsComposing] = useState(false);
  const { plugins } = usePlugins();
  const { appName, selectedSession } = useVSCode();
  const { bridge } = useSRPCBridge();
  const { selectedComponents, removeComponent, addComponent } =
    useSelectedComponents();

  // Draggable refs
  const containerRef = useRef<HTMLDivElement>(null);
  const draggableElementRef = useRef<HTMLDivElement>(null);

  // Draggable configuration
  const draggableConfig = useMemo(
    () => ({
      initialRelativeCenter: { x: 0.5, y: 0.9 }, // Center bottom by default
      areaSnapThreshold: 80,
      springStiffness: 0.15,
      springDampness: 0.6,
    }),
    [],
  );

  const { draggableRef, handleRef, position } = useDraggable(draggableConfig);

  // Combined ref callback that works with both useDraggable and our local ref
  const combinedDraggableRef = useCallback(
    (node: HTMLDivElement | null) => {
      draggableElementRef.current = node;
      draggableRef(node);
    },
    [draggableRef],
  );

  // Search results focus state from chatState
  const {
    isSearchResultsFocused,
    setSearchResultsFocused,
    isSearchActivated,
    setSearchActivated,
  } = chatState;
  const [activeSearchResult, setActiveSearchResult] = useState<
    ComponentSearchResult | undefined
  >();
  const [searchDisabled, setSearchDisabled] = useState(false);
  const [intentInvalidated, setIntentInvalidated] = useState(false);
  const previousInputRef = useRef('');

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

  // Add component search hook - starts immediately when search intent is available
  // This allows pre-loading results for fast display when Tab is pressed
  const { results, isLoading, error } = useComponentSearch(
    searchIntent ? currentInput : '',
    searchIntent,
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

      // Reset search activation when user types after search was activated
      // This ensures search results are hidden until Tab is pressed again
      if (isSearchActivated) {
        setSearchActivated(false);
      }

      // Re-enable search when user types
      if (searchDisabled) {
        setSearchDisabled(false);
      }

      // Reset intent invalidation when user types, but not if only spaces were added
      if (intentInvalidated) {
        // Check if only spaces were added to the end of previous input
        const trimmedPrevious = previousInputRef.current.trimEnd();
        const trimmedCurrent = value.trimEnd();
        const onlySpacesAdded =
          trimmedCurrent === trimmedPrevious &&
          value.length > previousInputRef.current.length;

        // Only reset invalidation if it's not just spaces added
        if (!onlySpacesAdded) {
          setIntentInvalidated(false);
        }
      }

      // Update previous input ref for next comparison
      previousInputRef.current = value;
    },
    [
      chatState.setChatInput,
      chatState.currentChatId,
      searchDisabled,
      isSearchActivated,
      intentInvalidated,
    ],
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

  // Container styles based on prompt state
  const containerClassName = useMemo(() => {
    const hasSelectedElements =
      (currentChat?.domContextElements &&
        currentChat.domContextElements.length > 0) ||
      selectedComponents.length > 0;

    // Use different rounding based on whether there are selected elements above
    const roundingClass = hasSelectedElements ? 'rounded-b-2xl' : 'rounded-2xl';
    const baseClasses = `flex h-24 w-full flex-1 flex-row items-end ${roundingClass} px-2 pb-2 pt-2.5 text-sm text-zinc-950 shadow-md backdrop-blur transition-all duration-300 ease-in-out placeholder:text-zinc-950/70`;

    switch (chatState.promptState) {
      case 'loading':
        return cn(
          baseClasses,
          'border border-transparent bg-zinc-50/80',
          'chat-loading-gradient',
        );
      case 'success':
        return cn(
          baseClasses,
          'border border-border/30 bg-zinc-50/80',
          'chat-success-border',
        );
      case 'error':
        return cn(
          baseClasses,
          'border border-border/30 bg-zinc-50/80',
          'chat-error-border animate-shake',
        );
      default:
        return cn(baseClasses, 'border border-border/30 bg-zinc-50/80');
    }
  }, [
    chatState.promptState,
    currentChat?.domContextElements,
    selectedComponents.length,
  ]);

  const ctrlAltCText = useHotkeyListenerComboText(HotkeyActions.ALT_PERIOD);

  // Get Esc indicator text based on current state
  const getEscIndicatorText = useCallback(() => {
    if (isSearchResultsFocused) {
      return 'to close search';
    }
    if (chatState.isDomSelectorActive) {
      return 'to disable inspector';
    }
    return 'to close chat';
  }, [isSearchResultsFocused, chatState.isDomSelectorActive]);

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

  // Show search results only when search is activated (Tab pressed)
  // Results are pre-loaded in background when searchIntent is available
  const shouldShowSearchResults =
    !searchDisabled && isSearchActivated && chatState.isPromptCreationActive;

  // Show inline suggestion when there's search intent but search not activated
  const shouldShowInlineSuggestion =
    !searchDisabled &&
    !isSearchActivated &&
    searchIntent &&
    !intentInvalidated &&
    chatState.isPromptCreationActive &&
    !isSearchResultsFocused;

  const textareaClassName = useMemo(
    () =>
      cn(
        'ml-1 h-full w-full flex-1 resize-none bg-transparent text-zinc-950 transition-all duration-150 placeholder:text-zinc-950/50 focus:outline-none',
        chatState.promptState === 'loading' &&
          'text-zinc-500 placeholder:text-zinc-400',
        // Add shimmer effect during search loading - only when search is activated
        shouldShowSearchResults &&
          isLoading &&
          currentInput.trim() &&
          cn(
            'bg-[length:250%_100%,auto] bg-clip-text text-transparent',
            '[--base-color:#a1a1aa] [--base-gradient-color:#000]',
            '[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]',
            '[background-repeat:no-repeat,padding-box]',
            'dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff]',
            'dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]',
          ),
      ),
    [chatState.promptState, shouldShowSearchResults, isLoading, currentInput],
  );

  const handleFocusReturn = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearchDeactivation = useCallback(() => {
    setSearchActivated(false);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchActivated(false);
    setSearchResultsFocused(false);
    setIntentInvalidated(true); // Invalidate intent to prevent inline suggestion
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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

  // Auto-focus on search results when they become visible
  useEffect(() => {
    if (shouldShowSearchResults) {
      // Small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        searchResultsRef.current?.focusOnResults();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [shouldShowSearchResults]);

  // Check if we should show "Open Inspector" mode
  const shouldShowOpenInspector = useMemo(() => {
    return (
      currentInput.trim().length === 0 &&
      domContextElements.length === 0 &&
      selectedComponents.length === 0 &&
      !chatState.isDomSelectorActive &&
      !isSearchResultsFocused
    );
  }, [
    currentInput,
    domContextElements.length,
    selectedComponents.length,
    chatState.isDomSelectorActive,
    isSearchResultsFocused,
  ]);

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

    // If in "Open Inspector" mode, start DOM selector
    if (shouldShowOpenInspector) {
      chatState.startDomSelector();
      return;
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
    shouldShowOpenInspector,
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
      }
    },
    [
      shouldShowInlineSuggestion,
      handleMagicChatSubmit,
      handleSubmitOrAddToContext,
      isComposing,
    ],
  );

  return (
    <DraggableProvider
      containerRef={containerRef}
      snapAreas={{
        topLeft: false,
        topCenter: true,
        topRight: false,
        bottomLeft: false,
        bottomCenter: true,
        bottomRight: false,
      }}
    >
      <div ref={containerRef} className="pointer-events-none fixed inset-0">
        <div
          ref={combinedDraggableRef}
          className={cn(
            'pointer-events-auto relative z-40 w-[400px] max-w-[80vw] transition-all duration-300 ease-out',
            chatState.isPromptCreationActive
              ? 'scale-100 opacity-100 blur-none'
              : 'pointer-events-none scale-95 opacity-0 blur-md',
          )}
          style={{ position: 'absolute' }}
        >
          {/* Search Results - positioned absolutely above chat input */}
          {shouldShowSearchResults && (
            <div
              className="absolute right-0 bottom-full left-0 z-50 mb-2"
              style={{ transform: 'translateY(0)' }}
            >
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
                onCloseSearch={handleCloseSearch}
              />
            </div>
          )}

          {/* Selected DOM Elements and Components - positioned above chat */}
          {((currentChat?.domContextElements &&
            currentChat.domContextElements.length > 0) ||
            selectedComponents.length > 0) && (
            <div className="absolute right-0 bottom-full left-0 z-40">
              <div className="slide-in-from-top-2 animate-in duration-200 ease-out">
                <div className="-mb-2 rounded-t-2xl border-border/30 border-x border-t bg-zinc-50/80 px-2 pt-2 backdrop-blur">
                  <SelectedDomElements
                    elements={currentChat?.domContextElements || []}
                    selectedComponents={selectedComponents}
                    onRemoveComponent={handleRemoveComponent}
                    chatId={chatState.currentChatId}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chat Input */}
          <div
            className={cn(
              containerClassName,
              'draggable-chat-container group relative',
            )}
            onClick={() => chatState.startPromptCreation()}
            role="button"
            tabIndex={0}
          >
            {/* Drag border areas overlay for grabbing */}
            <DragBorderAreas />

            <div className="flex w-full flex-col gap-2">
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
                  style={
                    shouldShowSearchResults && isLoading && currentInput.trim()
                      ? ({
                          '--spread': `${currentInput.length * 2}px`,
                          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
                          animation: 'text-shimmer 3s linear infinite',
                        } as React.CSSProperties)
                      : undefined
                  }
                />
                <InlineSuggestion
                  text={currentInput}
                  suggestion={searchIntent}
                  visible={shouldShowInlineSuggestion}
                  className="z-10"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {/* Esc indicator on the left */}
                <div className="flex items-center text-[10px] text-gray-500">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-400">
                    ESC
                  </span>
                  <span className="ml-1">{getEscIndicatorText()}</span>
                </div>

                {/* Action buttons on the right */}
                <div className="flex gap-2">
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
                    <span className="mr-1 font-semibold">
                      Create with Magic
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
                      // Open Inspector state (green background, white text)
                      !isSearchResultsFocused &&
                        shouldShowOpenInspector &&
                        chatState.promptState !== 'loading' &&
                        'bg-green-500 text-white hover:bg-green-600 hover:text-white',
                      // Send to IDE state (black background, white text)
                      !isSearchResultsFocused &&
                        !shouldShowOpenInspector &&
                        currentInput.trim().length > 0 &&
                        chatState.promptState !== 'loading' &&
                        'bg-black text-white hover:bg-gray-800 hover:text-white',
                      // Disabled state
                      (currentInput.trim().length === 0 &&
                        !isSearchResultsFocused &&
                        !shouldShowOpenInspector) ||
                        chatState.promptState === 'loading'
                        ? 'cursor-not-allowed bg-gray-300 text-gray-500 hover:bg-gray-300 hover:text-gray-500'
                        : '',
                    )}
                    disabled={
                      (currentInput.trim().length === 0 &&
                        !isSearchResultsFocused &&
                        !shouldShowOpenInspector) ||
                      chatState.promptState === 'loading'
                    }
                    onClick={handleSubmitOrAddToContext}
                  >
                    <span className="mr-1 font-semibold">
                      {isSearchResultsFocused
                        ? 'Add to context'
                        : shouldShowOpenInspector
                          ? 'Open Inspector'
                          : `Send to ${ideName}`}
                    </span>
                    <span>⏎</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Plugin buttons under chat - only show when chat is active */}
            {chatState.isPromptCreationActive && (
              <div className="mt-2 flex justify-center gap-2">
                {/* Plugin buttons */}
                {plugins
                  .filter((plugin) => plugin.onActionClick)
                  .map((plugin) => (
                    <button
                      type="button"
                      key={plugin.pluginName}
                      onClick={() => {
                        // Call plugin action
                        const component = plugin.onActionClick?.();
                        if (component) {
                          console.log(`Plugin ${plugin.pluginName} activated`);
                        }
                      }}
                      className="flex size-8 items-center justify-center rounded-full bg-white/80 p-1 opacity-60 backdrop-blur transition-all duration-150 hover:bg-white/90 hover:opacity-100"
                    >
                      {plugin.iconSvg ? (
                        <span className="size-4 stroke-zinc-950 text-zinc-950 *:size-full">
                          {plugin.iconSvg}
                        </span>
                      ) : (
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-1.414-.586H15l-3 3" />
                          <path d="M9 9 6 6" />
                        </svg>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DraggableProvider>
  );
}
