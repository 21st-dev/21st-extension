import { Button } from '@/components/ui/button';
import { InlineSuggestion } from '@/components/ui/inline-suggestion';
import { TWENTY_FIRST_URL } from '@/constants';
import { useAppState } from '@/hooks/use-app-state';
import { useChatState } from '@/hooks/use-chat-state';
import { useComponentSearch } from '@/hooks/use-component-search';
import { DraggableProvider, useDraggable } from '@/hooks/use-draggable';
import { useHotkeyListenerComboText } from '@/hooks/use-hotkey-listener-combo-text';
import { usePlugins } from '@/hooks/use-plugins';
import { useRuntimeErrors } from '@/hooks/use-runtime-errors';
import { useSearchIntent } from '@/hooks/use-search-intent';
import type { SelectedComponentWithCode } from '@/hooks/use-selected-components';
import { useSelectedComponents } from '@/hooks/use-selected-components';
import { useSRPCBridge } from '@/hooks/use-srpc-bridge';
import { useVSCode } from '@/hooks/use-vscode';
import { createPrompt } from '@/prompts';
import type { ComponentSearchResult } from '@/types/supabase';
import { cn, HotkeyActions } from '@/utils';
import { getIDENameFromAppName } from '@/utils/get-ide-name';
import { EventName } from '@21st-extension/extension-toolbar-srpc-contract';
import { Textarea } from '@headlessui/react';
import { Loader } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { SearchResults, type SearchResultsRef } from './search-results';
import { SelectedDomElements } from './selected-dom-elements';

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
  const [isMagicChatLoading, setIsMagicChatLoading] = useState(false);
  // State to preserve context during loading
  const [loadingContext, setLoadingContext] = useState<{
    hasText: boolean;
    hasSelectedElements: boolean;
  } | null>(null);
  const { plugins } = usePlugins();
  const { appName, selectedSession } = useVSCode();
  const { bridge } = useSRPCBridge();
  const { selectedComponents, removeComponent, addComponent, clearSelection } =
    useSelectedComponents();
  const { promptAction } = useAppState();
  const { lastError } = useRuntimeErrors();

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

  // Track readiness of search results after animation
  const [isSearchResultsReady, setIsSearchResultsReady] = useState(false);

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

    // Save current context before loading starts
    setLoadingContext({
      hasText: currentInput.trim().length > 0,
      hasSelectedElements:
        (currentChat.domContextElements &&
          currentChat.domContextElements.length > 0) ||
        selectedComponents.length > 0,
    });

    setIsMagicChatLoading(true);
    try {
      // Note: For Magic Chat, we don't include runtime errors
      const finalPrompt = await createPrompt(
        currentChat.domContextElements.map((e) => e.element),
        currentInput,
        window.location.href,
        pluginContextSnippets,
        currentChat.selectedComponents || [],
        null, // Don't include runtime error for Magic Chat
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

        // Track Magic Chat triggered event
        if (selectedSession) {
          try {
            await bridge.call.trackEvent(
              {
                eventName: EventName.MAGIC_CHAT_TRIGGERED,
                properties: {
                  sessionId: selectedSession.sessionId,
                  text: currentInput.trim(),
                  prompt: finalPrompt,
                  domSelectedElementsCount:
                    currentChat.domContextElements?.length || 0,
                  selectedComponents: selectedComponents.map((c) => ({
                    id: c.id,
                    name: c.name,
                  })),
                },
              },
              { onUpdate: () => {} },
            );
          } catch (error) {
            console.warn(
              '[Analytics] Failed to track magic_chat_triggered:',
              error,
            );
          }
        }

        if (!openResult.result.success) {
          throw new Error(openResult.result.error || 'Failed to open URL');
        }
      }

      // Clear everything after successful navigation
      if (chatState.currentChatId) {
        chatState.clearSelectedComponents(chatState.currentChatId);
        // Also clear local selected components state
        clearSelection();
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
    } finally {
      setIsMagicChatLoading(false);
      setLoadingContext(null);
    }
  }, [
    currentChat,
    currentInput,
    pluginContextSnippets,
    chatState,
    clearSelection,
    selectedComponents,
    bridge,
    selectedSession,
  ]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchResultsRef = useRef<SearchResultsRef>(null);

  // Ref and state for dynamic positioning of search results
  const selectedElementsContainerRef = useRef<HTMLDivElement>(null);
  const [selectedElementsHeight, setSelectedElementsHeight] =
    useState<number>(0);

  // Update height whenever selected DOM elements, components, or runtime errors change
  useEffect(() => {
    if (selectedElementsContainerRef.current) {
      setSelectedElementsHeight(
        selectedElementsContainerRef.current.offsetHeight || 0,
      );
    } else {
      setSelectedElementsHeight(0);
    }
  }, [
    currentChat?.domContextElements?.length,
    selectedComponents.length,
    currentChat?.runtimeError,
    lastError?.timestamp.getTime(), // Include timestamp to detect when error changes
  ]);

  // Style object to lift search results above selected elements block
  const searchResultsTranslateStyle = useMemo<React.CSSProperties>(
    () => ({ transform: `translateY(-${selectedElementsHeight - 8}px)` }),
    [selectedElementsHeight],
  );

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
    // Check if runtime error suggestion should be shown
    const hasRuntimeErrorInContext =
      currentChat?.runtimeError &&
      lastError &&
      currentChat.runtimeError.timestamp.getTime() ===
        lastError.timestamp.getTime();

    const shouldShowRuntimeErrorSuggestion =
      lastError && !hasRuntimeErrorInContext;

    const hasSelectedElements =
      (currentChat?.domContextElements &&
        currentChat.domContextElements.length > 0) ||
      selectedComponents.length > 0 ||
      currentChat?.runtimeError ||
      shouldShowRuntimeErrorSuggestion;

    // Use different rounding based on whether there are selected elements above
    const roundingClass = hasSelectedElements ? 'rounded-b-xl' : 'rounded-xl';
    const baseClasses = `flex h-24 w-full flex-1 flex-row items-end ${roundingClass} px-2 pb-2 pt-2.5 text-sm text-zinc-950 shadow-md transition-[background-color,border-color,color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter] duration-300 ease-in-out placeholder:text-zinc-950/70`;

    switch (chatState.promptState) {
      case 'loading':
        return cn(baseClasses, 'border border-border/30', 'bg-[#F5F5F5]');
      case 'success':
        return cn(
          baseClasses,
          'border border-border/30',
          'bg-[#F5F5F5]',
          'chat-success-border',
        );
      case 'error':
        return cn(
          baseClasses,
          'border border-border/30',
          'bg-[#F5F5F5]',
          'chat-error-border animate-shake',
        );
      default:
        return cn(baseClasses, 'border border-border/30', 'bg-[#F5F5F5]');
    }
  }, [
    chatState.promptState,
    currentChat?.domContextElements,
    currentChat?.runtimeError,
    selectedComponents.length,
    lastError,
  ]);

  const ctrlAltCText = useHotkeyListenerComboText(HotkeyActions.ALT_PERIOD);

  // Get Esc indicator text based on current state
  const getEscIndicatorText = useCallback(() => {
    if (isSearchResultsFocused) {
      return 'Close search';
    }
    if (chatState.isDomSelectorActive) {
      return 'Close inspector';
    }
    return 'Close chat';
  }, [isSearchResultsFocused, chatState.isDomSelectorActive]);

  // Check if we should show "Fix error" mode (only runtime error in context)
  const shouldShowFixError = useMemo(() => {
    return (
      currentInput.trim().length === 0 &&
      domContextElements.length === 0 &&
      selectedComponents.length === 0 &&
      currentChat?.runtimeError &&
      !isSearchResultsFocused
    );
  }, [
    currentInput,
    domContextElements.length,
    selectedComponents.length,
    currentChat?.runtimeError,
    isSearchResultsFocused,
  ]);

  // Get Magic Chat button text based on context
  const getMagicChatButtonText = useCallback(() => {
    // Use loading context if available, otherwise use current context
    const contextToUse = loadingContext || {
      hasText: currentInput.trim().length > 0,
      hasSelectedElements:
        (currentChat?.domContextElements &&
          currentChat.domContextElements.length > 0) ||
        selectedComponents.length > 0,
    };

    // If no text but has selected elements/components, show "Refine with Magic"
    if (!contextToUse.hasText && contextToUse.hasSelectedElements) {
      return 'Refine with Magic';
    }

    // Default to "Create with Magic"
    return 'Create with Magic';
  }, [
    currentInput,
    currentChat?.domContextElements,
    selectedComponents.length,
    loadingContext,
  ]);

  // Get main button text based on prompt action setting
  const getMainButtonText = useCallback(() => {
    if (shouldShowFixError) {
      switch (promptAction) {
        case 'copy':
          return 'Copy error';
        case 'both':
          return `Fix and copy`;
        case 'send':
        default:
          return `Fix in ${ideName}`;
      }
    }

    switch (promptAction) {
      case 'copy':
        return 'Copy to clipboard';
      case 'both':
        return `Send and copy`;
      case 'send':
      default:
        return `Send to ${ideName}`;
    }
  }, [promptAction, ideName, shouldShowFixError]);

  const handleComponentSelection = useCallback(
    (result: ComponentSearchResult, selected: boolean) => {
      if (selected) {
        // Track component selection event
        if (bridge && selectedSession) {
          try {
            bridge.call.trackEvent(
              {
                eventName: EventName.COMPONENT_SELECTED,
                properties: {
                  sessionId: selectedSession.sessionId,
                  demoId: result.id,
                  demoName: result.name,
                  componentName:
                    result.component_data.name || result.name || 'Unknown',
                  componentDescription: result.component_data.description || '',
                  searchQuery: currentInput.trim(),
                  searchQueryLength: currentInput.trim().length,
                  searchIntent: searchIntent || '',
                },
              },
              { onUpdate: () => {} },
            );
          } catch (error) {
            console.warn(
              '[Analytics] Failed to track component_selected:',
              error,
            );
          }
        }

        // Add component to selected components (local state)
        addComponent(result);

        // Also add to chat state for addMessage to use
        if (chatState.currentChatId) {
          const currentComponents = currentChat?.selectedComponents || [];
          const newComponent: SelectedComponentWithCode = {
            ...result, // Copy all properties from ComponentSearchResult
          };
          const updatedComponents = [...currentComponents, newComponent];
          chatState.addSelectedComponents(
            chatState.currentChatId,
            updatedComponents,
          );
        }
      } else {
        // Remove component (if needed)
        removeComponent(result.id);

        // Also remove from chat state
        if (chatState.currentChatId) {
          const currentComponents = currentChat?.selectedComponents || [];
          const updatedComponents = currentComponents.filter(
            (c) => c.id !== result.id,
          );
          chatState.addSelectedComponents(
            chatState.currentChatId,
            updatedComponents,
          );
        }
      }
    },
    [
      addComponent,
      removeComponent,
      chatState,
      currentChat,
      currentInput,
      bridge,
      selectedSession,
    ],
  );

  const handleRemoveComponent = useCallback(
    (componentId: string) => {
      const numericId = Number.parseInt(componentId, 10);
      removeComponent(numericId);

      // Also remove from chat state
      if (chatState.currentChatId) {
        const currentComponents = currentChat?.selectedComponents || [];
        const updatedComponents = currentComponents.filter(
          (c) => c.id !== numericId,
        );
        chatState.addSelectedComponents(
          chatState.currentChatId,
          updatedComponents,
        );
      }

      // Return focus to input, close search results and disable search
      setSearchDisabled(true);
      setSearchActivated(false);
      setTimeout(() => {
        inputRef.current?.focus();
        setSearchResultsFocused(false);
      }, 100);
    },
    [removeComponent, setSearchResultsFocused, chatState, currentChat],
  );

  // Show search results only when search is activated (Tab pressed)
  // Results are pre-loaded in background when searchIntent is available
  const shouldShowSearchResults =
    !searchDisabled && isSearchActivated && chatState.isPromptCreationActive;

  // Reset readiness when search results hidden or disabled
  useEffect(() => {
    if (!shouldShowSearchResults) {
      setIsSearchResultsReady(false);
    }
  }, [shouldShowSearchResults]);

  // Clear loading context when prompt state changes from loading
  useEffect(() => {
    if (chatState.promptState !== 'loading' && loadingContext) {
      setLoadingContext(null);
    }
  }, [chatState.promptState, loadingContext]);

  // Clear local selected components when main prompt loading finishes
  useEffect(() => {
    if (
      chatState.promptState !== 'loading' &&
      chatState.promptState !== 'idle'
    ) {
      // Clear local selected components state when prompt completes (success or error)
      clearSelection();
    }
  }, [chatState.promptState, clearSelection]);

  // Auto-focus input after success state resets to idle
  useEffect(() => {
    if (chatState.promptState === 'idle' && chatState.isPromptCreationActive) {
      // Small delay to ensure the input is ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [chatState.promptState, chatState.isPromptCreationActive]);

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
      !currentChat?.runtimeError &&
      !chatState.isDomSelectorActive &&
      !isSearchResultsFocused
    );
  }, [
    currentInput,
    domContextElements.length,
    selectedComponents.length,
    currentChat?.runtimeError,
    chatState.isDomSelectorActive,
    isSearchResultsFocused,
  ]);

  // Check if we should allow Tab to add runtime error
  const shouldAllowTabForRuntimeError = useMemo(() => {
    const hasRuntimeErrorInContext =
      currentChat?.runtimeError &&
      lastError &&
      currentChat.runtimeError.timestamp.getTime() ===
        lastError.timestamp.getTime();

    const shouldShowRuntimeErrorSuggestion =
      lastError && !hasRuntimeErrorInContext;

    return (
      currentInput.trim().length === 0 &&
      domContextElements.length === 0 &&
      selectedComponents.length === 0 &&
      shouldShowRuntimeErrorSuggestion &&
      !isSearchActivated &&
      !isSearchResultsFocused &&
      !shouldShowInlineSuggestion
    );
  }, [
    currentInput,
    domContextElements.length,
    selectedComponents.length,
    lastError,
    currentChat?.runtimeError,
    isSearchActivated,
    isSearchResultsFocused,
    shouldShowInlineSuggestion,
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

    // If in "Fix Error" mode, send the runtime error context
    if (shouldShowFixError) {
      if (!currentChat) return;
      // Send message to IDE with runtime error in context
      chatState.addMessage(currentChat.id, '');
      return;
    }

    // Normal submit behavior
    if (!currentChat || !currentInput.trim()) return;

    // Save current context before loading starts
    setLoadingContext({
      hasText: currentInput.trim().length > 0,
      hasSelectedElements:
        (currentChat.domContextElements &&
          currentChat.domContextElements.length > 0) ||
        selectedComponents.length > 0,
    });

    // Send message to IDE
    chatState.addMessage(currentChat.id, currentInput);

    // Note: Components and DOM elements will be cleared after loading completes
  }, [
    isSearchResultsFocused,
    currentChat,
    currentInput,
    chatState,
    handleFocusReturn,
    shouldShowOpenInspector,
    shouldShowFixError,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Tab' && shouldShowInlineSuggestion) {
        // Activate search when Tab is pressed with search intent
        e.preventDefault();

        // Track components search triggered event
        if (bridge && selectedSession) {
          try {
            bridge.call.trackEvent(
              {
                eventName: EventName.COMPONENTS_SEARCH_TRIGGERED,
                properties: {
                  sessionId: selectedSession.sessionId,
                  searchQuery: currentInput.trim(),
                  searchQueryLength: currentInput.trim().length,
                  searchIntent: searchIntent || '',
                  selectedDomElementsCount:
                    currentChat?.domContextElements?.length || 0,
                  selectedComponents: selectedComponents.map((c) => ({
                    id: c.id,
                    name: c.name,
                  })),
                },
              },
              { onUpdate: () => {} },
            );
          } catch (error) {
            console.warn(
              '[Analytics] Failed to track components_search_triggered:',
              error,
            );
          }
        }

        setSearchActivated(true);
        return;
      }

      if (e.key === 'Tab' && shouldAllowTabForRuntimeError) {
        // Add runtime error to context when Tab is pressed
        e.preventDefault();
        if (lastError && chatState.currentChatId) {
          chatState.addChatRuntimeError(chatState.currentChatId, lastError);
        }
        return;
      }

      if (e.key === 'Backspace' && currentInput.trim().length === 0) {
        // Remove items from context in reverse order (right to left) when input is empty
        e.preventDefault();
        if (!currentChat) return;

        // Order of removal (right to left):
        // 1. Runtime error (rightmost)
        // 2. Selected components (last added first)
        // 3. DOM elements (last added first)

        if (currentChat.runtimeError) {
          // Remove runtime error first
          chatState.removeChatRuntimeError(chatState.currentChatId);
        } else if (selectedComponents.length > 0) {
          // Remove last selected component
          const lastComponent =
            selectedComponents[selectedComponents.length - 1];
          handleRemoveComponent(lastComponent.id.toString());
        } else if (
          currentChat.domContextElements &&
          currentChat.domContextElements.length > 0
        ) {
          // Remove last DOM element
          const lastElement =
            currentChat.domContextElements[
              currentChat.domContextElements.length - 1
            ];
          chatState.removeChatDomContext(
            chatState.currentChatId,
            lastElement.element,
          );
        }
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
      shouldAllowTabForRuntimeError,
      lastError,
      chatState,
      handleMagicChatSubmit,
      handleSubmitOrAddToContext,
      isComposing,
      currentInput,
      currentChat,
      selectedComponents,
      handleRemoveComponent,
      searchIntent,
      searchDisabled,
      intentInvalidated,
      isSearchResultsFocused,
      bridge,
      selectedSession,
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
            'pointer-events-auto relative z-40 w-[400px] max-w-[80vw] rounded-xl transition-all duration-300 ease-out',
            chatState.isPromptCreationActive
              ? 'scale-100 opacity-100 blur-none'
              : 'pointer-events-none scale-95 opacity-0 blur-md',
            // Add bounce effect for success state
            chatState.promptState === 'success' && 'chat-success-bounce',
          )}
          style={{ position: 'absolute' }}
        >
          {/* Search Results - positioned absolutely above chat input */}
          {shouldShowSearchResults && (
            <div
              className="absolute right-0 bottom-full left-0 z-50 mb-2"
              style={searchResultsTranslateStyle}
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
                onReady={() => setIsSearchResultsReady(true)}
              />
            </div>
          )}

          {/* Selected DOM Elements and Components - positioned above chat */}
          {((currentChat?.domContextElements &&
            currentChat.domContextElements.length > 0) ||
            selectedComponents.length > 0 ||
            currentChat?.runtimeError ||
            (lastError &&
              (!currentChat?.runtimeError ||
                currentChat.runtimeError.timestamp.getTime() !==
                  lastError.timestamp.getTime()))) && (
            <div className="absolute right-0 bottom-full left-0 z-40">
              <div className="slide-in-from-top-2 animate-in duration-200 ease-out">
                <div
                  ref={selectedElementsContainerRef}
                  className="-mb-2 rounded-t-xl border-border/30 border-x border-t bg-[#F5F5F5] px-2 pt-2"
                >
                  <SelectedDomElements
                    elements={currentChat?.domContextElements || []}
                    selectedComponents={selectedComponents}
                    onRemoveComponent={handleRemoveComponent}
                    chatId={chatState.currentChatId}
                    compact={true}
                    runtimeError={lastError}
                    hasInputText={currentInput.trim().length > 0}
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
                      ? 'Enter prompt or 21st.dev search...'
                      : `What do you want to change? (${ctrlAltCText})`
                  }
                  disabled={
                    chatState.promptState === 'loading' || isMagicChatLoading
                  }
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
                      '!py-0 gap-0.5 whitespace-normal border-none bg-transparent text-[10px] hover:bg-transparent',
                      (currentInput.trim().length > 0 ||
                        (currentChat?.domContextElements &&
                          currentChat.domContextElements.length > 0) ||
                        selectedComponents.length > 0) &&
                        !isMagicChatLoading &&
                        chatState.promptState !== 'loading'
                        ? 'text-black hover:text-gray-800'
                        : 'cursor-not-allowed text-gray-400',
                    )}
                    disabled={
                      (currentInput.trim().length === 0 &&
                        (!currentChat?.domContextElements ||
                          currentChat.domContextElements.length === 0) &&
                        selectedComponents.length === 0) ||
                      isMagicChatLoading ||
                      chatState.promptState === 'loading'
                    }
                    onClick={handleMagicChatSubmit}
                  >
                    {isMagicChatLoading && (
                      <Loader className="mr-1 h-3.5 w-3.5 animate-spin" />
                    )}
                    <span className="mr-1 whitespace-normal font-semibold">
                      {getMagicChatButtonText()}
                    </span>
                    <span
                      className={cn(
                        'flex items-center justify-center py-0.5 leading-none',
                        (currentInput.trim().length > 0 ||
                          (currentChat?.domContextElements &&
                            currentChat.domContextElements.length > 0) ||
                          selectedComponents.length > 0) &&
                          !isMagicChatLoading &&
                          chatState.promptState !== 'loading'
                          ? 'text-gray-600'
                          : 'text-gray-400',
                      )}
                    >
                      ⌘
                    </span>
                    <span
                      className={cn(
                        'flex items-center justify-center py-0.5 leading-none',
                        (currentInput.trim().length > 0 ||
                          (currentChat?.domContextElements &&
                            currentChat.domContextElements.length > 0) ||
                          selectedComponents.length > 0) &&
                          !isMagicChatLoading &&
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
                      'gap-0.5 whitespace-normal border-none py-0.5 text-[10px] transition-all duration-200 ease-out',
                      // Add to context state (keep original blue)
                      isSearchResultsFocused &&
                        isSearchResultsReady &&
                        'bg-blue-500 text-white hover:bg-blue-600',
                      // Open Inspector state (green background, white text)
                      !isSearchResultsFocused &&
                        shouldShowOpenInspector &&
                        chatState.promptState !== 'loading' &&
                        'bg-green-500 text-white hover:bg-green-600 hover:text-white',
                      // Send to IDE state (black background, white text)
                      !isSearchResultsFocused &&
                        (!shouldShowOpenInspector || shouldShowFixError) &&
                        (currentInput.trim().length > 0 ||
                          shouldShowFixError) &&
                        chatState.promptState !== 'loading' &&
                        'bg-black text-white hover:bg-gray-800 hover:text-white',
                      // Loading state
                      chatState.promptState === 'loading' &&
                        'cursor-not-allowed bg-gray-300 text-gray-500 hover:bg-gray-300 hover:text-gray-500',
                      // Disabled state (only when not loading)
                      chatState.promptState !== 'loading' &&
                        (currentInput.trim().length === 0 &&
                        (!isSearchResultsFocused || !isSearchResultsReady) &&
                        !shouldShowOpenInspector &&
                        !shouldShowFixError
                          ? 'cursor-not-allowed bg-gray-300 text-gray-500 hover:bg-gray-300 hover:text-gray-500'
                          : ''),
                    )}
                    disabled={
                      (currentInput.trim().length === 0 &&
                        (!isSearchResultsFocused || !isSearchResultsReady) &&
                        !shouldShowOpenInspector &&
                        !shouldShowFixError) ||
                      chatState.promptState === 'loading' ||
                      isMagicChatLoading
                    }
                    onClick={handleSubmitOrAddToContext}
                  >
                    {chatState.promptState === 'loading' && (
                      <Loader className="mr-1 h-3.5 w-3.5 animate-spin" />
                    )}
                    <span className="mr-1 whitespace-normal font-semibold">
                      {isSearchResultsFocused && isSearchResultsReady
                        ? 'Add to context'
                        : shouldShowOpenInspector
                          ? 'Open Inspector'
                          : getMainButtonText()}
                    </span>
                    <span className="flex items-center justify-center py-0.5 leading-none">
                      ⏎
                    </span>
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
                      className="flex size-8 items-center justify-center rounded-full bg-[#F5F5F5] p-1 opacity-60 transition-all duration-150 hover:bg-[#F5F5F5] hover:opacity-100"
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
