import { Button } from '@/components/ui/button';
import { InlineSuggestion } from '@/components/ui/inline-suggestion';
import { TWENTY_FIRST_URL } from '@/constants';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth, useAuthStatus } from '@/hooks/use-auth';
import { useMagicProjects } from '@/hooks/use-magic-projects';
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
import {
  cn,
  HotkeyActions,
  fetchSVGContent,
  processSVGForInline,
} from '@/utils';
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
import { MagicStatusBar } from './magic-status-bar';
import { BookmarksList, type BookmarksListRef } from './bookmarks-list';
import { useBookmarks, type Bookmark } from '@/hooks/use-bookmarks';
import { AtMenu } from './at-menu';
import { IconsList, type IconsListRef } from './icons-list';
import { DocsList, type DocsListRef } from './docs-list';
import type { DocsItem } from './docs-list';
import { LogosList, type LogosListRef } from './logos-list';
import type { SVGLogo } from '@/types/svgl';

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

  // Auth and Magic Projects hooks
  const { signIn } = useAuth();
  const { isAuthenticated } = useAuthStatus();
  const {
    createProject,
    status: magicStatus,
    progress: magicProgress,
  } = useMagicProjects();

  // Magic Chat loading state - only show spinner during creation
  const isMagicChatLoading = magicStatus === 'creating';

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

  // Bookmarks state
  const {
    bookmarks,
    isLoading: isBookmarksLoading,
    error: bookmarksError,
  } = useBookmarks();
  const [isBookmarksActivated, setIsBookmarksActivated] = useState(false);
  const [isBookmarksFocused, setIsBookmarksFocused] = useState(false);
  const [isBookmarksReady, setIsBookmarksReady] = useState(false);
  const bookmarksListRef = useRef<BookmarksListRef>(null);

  // Icons (Lucide) state
  const [isIconsActivated, setIsIconsActivated] = useState(false);
  const [isIconsFocused, setIsIconsFocused] = useState(false);
  const [isIconsReady, setIsIconsReady] = useState(false);
  const iconsListRef = useRef<IconsListRef>(null);

  // Docs (Context7) state
  const [isDocsActivated, setIsDocsActivated] = useState(false);
  const [isDocsFocused, setIsDocsFocused] = useState(false);
  const [isDocsReady, setIsDocsReady] = useState(false);
  const docsListRef = useRef<DocsListRef>(null);

  // Logos (SVGL) state
  const [isLogosActivated, setIsLogosActivated] = useState(false);
  const [isLogosFocused, setIsLogosFocused] = useState(false);
  const [isLogosReady, setIsLogosReady] = useState(false);
  const logosListRef = useRef<LogosListRef>(null);

  // @ mention mode state (bookmarks, icons, docs, or logos)
  const [atMode, setAtMode] = useState<
    'bookmarks' | 'icons' | 'docs' | 'logos' | null
  >(null);

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

  // Reset atMode and activations when input no longer starts with "@"
  useEffect(() => {
    if (!currentInput.startsWith('@')) {
      setAtMode(null);
      setIsIconsActivated(false);
      setIsBookmarksActivated(false);
      setIsDocsActivated(false);
      setIsLogosActivated(false);
    }
  }, [currentInput]);

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

      // Reset bookmarks activation when user types after bookmarks were activated
      if (isBookmarksActivated) {
        setIsBookmarksActivated(false);
      }

      // Reset docs activation when user types after docs were activated
      if (isDocsActivated) {
        setIsDocsActivated(false);
      }

      // Reset logos activation when user types after logos were activated
      if (isLogosActivated) {
        setIsLogosActivated(false);
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
      isBookmarksActivated,
      isDocsActivated,
      isLogosActivated,
      intentInvalidated,
    ],
  );

  const handleSubmit = useCallback(() => {
    if (!currentChat || !currentInput.trim()) return;
    chatState.addMessage(currentChat.id, currentInput, atMode);
    // Reset search state after sending
    setSearchActivated(false);
  }, [currentChat, currentInput, chatState.addMessage, atMode]);

  const handleMagicChatSubmit = useCallback(async () => {
    if (!currentInput.trim()) return;

    // Check authentication first
    if (!isAuthenticated) {
      try {
        await signIn();
        // After successful sign in, the user can try again
        return;
      } catch (error) {
        console.error('Sign in failed:', error);
        return;
      }
    }

    // Save current context before loading starts
    setLoadingContext({
      hasText: currentInput.trim().length > 0,
      hasSelectedElements:
        (currentChat?.domContextElements &&
          currentChat.domContextElements.length > 0) ||
        selectedComponents.length > 0,
    });

    // Track Magic Chat triggered event (async but don't wait)
    if (bridge && selectedSession) {
      bridge.call
        .trackEvent(
          {
            eventName: EventName.MAGIC_CHAT_TRIGGERED,
            properties: {
              sessionId: selectedSession.sessionId,
              text: currentInput.trim(),
              prompt: currentInput.trim(), // Use input as prompt for now
              domSelectedElementsCount:
                currentChat?.domContextElements?.length || 0,
              selectedComponents: selectedComponents.map((c) => ({
                id: c.id,
                name: c.name,
              })),
              atMenuMode: atMode, // Track which @-menu mode was used
              atMenuContextUsed: atMode !== null, // Track if @-menu was used at all
            },
          },
          { onUpdate: () => {} },
        )
        .catch((error) => {
          console.warn(
            '[Analytics] Failed to track magic_chat_triggered:',
            error,
          );
        });
    }

    // Start Magic project creation (non-blocking)
    createProject(
      currentInput,
      window.location.href,
      currentChat?.domContextElements?.map((e) => e.element) || [],
      selectedComponents,
    )
      .then(() => {
        // Clear everything after successful project creation
        if (chatState.currentChatId && currentChat) {
          chatState.clearSelectedComponents(chatState.currentChatId);
          clearSelection();
          currentChat.domContextElements?.forEach((elementData) => {
            chatState.removeChatDomContext(
              chatState.currentChatId,
              elementData.element,
            );
          });
          chatState.setChatInput(chatState.currentChatId, '');
          setSearchActivated(false);
        }
      })
      .catch((err) => {
        console.error('Error creating Magic project:', err);
      })
      .finally(() => {
        setLoadingContext(null);
      });
  }, [
    currentInput,
    isAuthenticated,
    signIn,
    currentChat,
    selectedComponents,
    createProject,
    chatState,
    clearSelection,
    setSearchActivated,
    bridge,
    selectedSession,
    atMode,
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

  // Check if we should show selected elements block
  const shouldShowSelectedElements = useMemo(() => {
    const hasRuntimeErrorInContext =
      currentChat?.runtimeError &&
      lastError &&
      currentChat.runtimeError.timestamp.getTime() ===
        lastError.timestamp.getTime();

    const shouldShowRuntimeErrorSuggestion =
      lastError && !hasRuntimeErrorInContext;

    return (
      (currentChat?.domContextElements &&
        currentChat.domContextElements.length > 0) ||
      selectedComponents.length > 0 ||
      currentChat?.runtimeError ||
      shouldShowRuntimeErrorSuggestion
    );
  }, [
    currentChat?.domContextElements,
    selectedComponents.length,
    currentChat?.runtimeError,
    lastError,
  ]);

  // Update height whenever selected DOM elements, components, or runtime errors change
  useEffect(() => {
    if (shouldShowSelectedElements && selectedElementsContainerRef.current) {
      // Small delay to ensure DOM is updated before measuring height
      const updateHeight = () => {
        if (selectedElementsContainerRef.current) {
          setSelectedElementsHeight(
            selectedElementsContainerRef.current.offsetHeight || 0,
          );
        }
      };

      // Update immediately
      updateHeight();

      // Also update after a small delay to catch any DOM changes
      const timeout = setTimeout(updateHeight, 10);
      return () => clearTimeout(timeout);
    } else {
      // Force height to 0 when elements disappear
      setSelectedElementsHeight(0);
    }
  }, [
    shouldShowSelectedElements,
    currentChat?.domContextElements?.length,
    selectedComponents.length,
    currentChat?.runtimeError,
    lastError?.timestamp.getTime(), // Include timestamp to detect when error changes
  ]);

  // Additional effect to ensure height is reset when elements disappear
  useEffect(() => {
    if (!shouldShowSelectedElements) {
      // Immediately set height to 0 when elements disappear
      setSelectedElementsHeight(0);
    }
  }, [shouldShowSelectedElements]);

  // Style object to lift search results above selected elements block
  const searchResultsTranslateStyle = useMemo<React.CSSProperties>(
    () => ({
      transform: `translateY(-${shouldShowSelectedElements ? selectedElementsHeight - 8 : 0}px)`,
      transition: 'transform 200ms ease-out',
    }),
    [selectedElementsHeight, shouldShowSelectedElements],
  );

  // Style object to lift magic status bar above selected elements block
  const magicStatusBarTranslateStyle = useMemo<React.CSSProperties>(() => {
    const translateY = shouldShowSelectedElements
      ? selectedElementsHeight - 8
      : 0;
    return {
      transform: `translateY(-${translateY}px)`,
      transition: 'transform 200ms ease-out',
    };
  }, [selectedElementsHeight, shouldShowSelectedElements]);

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
        'flex size-8 items-center justify-center rounded-full bg-transparent p-1 text-foreground opacity-20 transition-all duration-150',
        currentInput.length > 0 &&
          'bg-primary text-primary-foreground opacity-100',
        chatState.promptState === 'loading' &&
          'cursor-not-allowed bg-muted text-muted-foreground opacity-30',
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
    const roundingClass = hasSelectedElements
      ? 'rounded-b-[16px]'
      : 'rounded-[16px]';
    const baseClasses = `flex h-24 w-full flex-1 flex-row items-end ${roundingClass} px-2 pb-2 pt-2.5 text-sm text-foreground shadow-md transition-[background-color,border-color,color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter] duration-300 ease-in-out placeholder:text-muted-foreground`;

    switch (chatState.promptState) {
      case 'loading':
        return cn(baseClasses, 'border border-border', 'bg-background');
      case 'success':
        return cn(baseClasses, 'border border-border', 'bg-background');
      case 'error':
        return cn(
          baseClasses,
          'border border-border',
          'bg-background',
          'chat-error-border animate-shake',
        );
      default:
        return cn(baseClasses, 'border border-border', 'bg-background');
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
    if (isBookmarksFocused) {
      return 'Close bookmarks';
    }
    if (chatState.isDomSelectorActive) {
      return 'Close inspector';
    }
    if (isIconsFocused) {
      return 'Close icons';
    }
    if (isDocsFocused) {
      return 'Close docs';
    }
    if (isLogosFocused) {
      return 'Close logos';
    }
    return 'Close chat';
  }, [
    isSearchResultsFocused,
    isBookmarksFocused,
    chatState.isDomSelectorActive,
    isIconsFocused,
    isDocsFocused,
    isLogosFocused,
  ]);

  // Check if we should show "Fix error" mode (only runtime error in context)
  const shouldShowFixError = useMemo(() => {
    return (
      currentInput.trim().length === 0 &&
      domContextElements.length === 0 &&
      selectedComponents.length === 0 &&
      currentChat?.runtimeError &&
      !isSearchResultsFocused &&
      !isIconsFocused &&
      !isDocsFocused &&
      !isLogosFocused
    );
  }, [
    currentInput,
    domContextElements.length,
    selectedComponents.length,
    currentChat?.runtimeError,
    isSearchResultsFocused,
    isIconsFocused,
    isDocsFocused,
    isLogosFocused,
  ]);

  // Get Magic Chat button text based on context and auth state
  const getMagicChatButtonText = useCallback(() => {
    // Check auth first
    if (!isAuthenticated) {
      return 'Sign in for Magic';
    }

    // Only show creating state briefly
    if (magicStatus === 'creating') {
      return 'Create with Magic';
    }

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
    isAuthenticated,
    magicStatus,
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
                  atMenuMode: atMode, // Track which @-menu mode was used
                  atMenuContextUsed: atMode !== null, // Track if @-menu was used at all
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
      atMode,
      searchIntent,
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

  // Show bookmarks when input starts with "@" and user is authenticated
  const shouldShowBookmarks = useMemo(() => {
    return (
      isAuthenticated &&
      currentInput.trim().startsWith('@') &&
      chatState.isPromptCreationActive &&
      !isSearchActivated &&
      atMode === 'bookmarks'
    );
  }, [
    isAuthenticated,
    currentInput,
    chatState.isPromptCreationActive,
    isSearchActivated,
    atMode,
  ]);

  // Show icons list when @mode is icons
  const shouldShowIcons = useMemo(() => {
    return (
      atMode === 'icons' &&
      currentInput.trim().startsWith('@') &&
      chatState.isPromptCreationActive &&
      !isSearchActivated
    );
  }, [
    atMode,
    currentInput,
    chatState.isPromptCreationActive,
    isSearchActivated,
  ]);

  // Show docs search when @mode is docs
  const shouldShowDocs = useMemo(() => {
    return (
      atMode === 'docs' &&
      currentInput.trim().startsWith('@') &&
      chatState.isPromptCreationActive &&
      !isSearchActivated
    );
  }, [
    atMode,
    currentInput,
    chatState.isPromptCreationActive,
    isSearchActivated,
  ]);

  // Show logos list when @mode is logos
  const shouldShowLogos = useMemo(() => {
    return (
      atMode === 'logos' &&
      currentInput.trim().startsWith('@') &&
      chatState.isPromptCreationActive &&
      !isSearchActivated
    );
  }, [
    atMode,
    currentInput,
    chatState.isPromptCreationActive,
    isSearchActivated,
  ]);

  // Show At-menu when user just typed "@" and no mode selected yet
  const shouldShowAtMenu = useMemo(() => {
    return (
      currentInput.trim().startsWith('@') &&
      chatState.isPromptCreationActive &&
      atMode === null
    );
  }, [currentInput, chatState.isPromptCreationActive, atMode]);

  // Extract search query for At-menu after "@"
  const atMenuSearchQuery = useMemo(() => {
    if (!shouldShowAtMenu) return '';
    const input = currentInput.trim();
    if (input.startsWith('@')) {
      return input.slice(1).trim();
    }
    return '';
  }, [shouldShowAtMenu, currentInput]);

  // Extract search query for icons after "@"
  const iconsSearchQuery = useMemo(() => {
    if (!shouldShowIcons) return '';
    const input = currentInput.trim();
    if (input.startsWith('@')) {
      return input.slice(1).trim();
    }
    return '';
  }, [shouldShowIcons, currentInput]);

  // Extract search query from input after "@"
  const bookmarksSearchQuery = useMemo(() => {
    if (!shouldShowBookmarks) return '';

    const input = currentInput.trim();
    if (input.startsWith('@')) {
      return input.slice(1).trim(); // Remove "@" and trim whitespace
    }
    return '';
  }, [shouldShowBookmarks, currentInput]);

  // Extract search query for docs after "@"
  const docsSearchQuery = useMemo(() => {
    if (!shouldShowDocs) return '';
    const input = currentInput.trim();
    if (input.startsWith('@')) {
      return input.slice(1).trim();
    }
    return '';
  }, [shouldShowDocs, currentInput]);

  // Extract search query for logos after "@"
  const logosSearchQuery = useMemo(() => {
    if (!shouldShowLogos) return '';
    const input = currentInput.trim();
    if (input.startsWith('@')) {
      return input.slice(1).trim();
    }
    return '';
  }, [shouldShowLogos, currentInput]);

  // Activate bookmarks list only after the user picked the "bookmarks" option
  useEffect(() => {
    if (atMode === 'bookmarks' && !isBookmarksActivated) {
      setIsBookmarksActivated(true);
    } else if (atMode !== 'bookmarks' && isBookmarksActivated) {
      setIsBookmarksActivated(false);
    }
  }, [atMode, isBookmarksActivated]);

  // Reset readiness when search results hidden or disabled
  useEffect(() => {
    if (!shouldShowSearchResults) {
      setIsSearchResultsReady(false);
    }
  }, [shouldShowSearchResults]);

  // Reset readiness when bookmarks hidden or disabled
  useEffect(() => {
    if (!shouldShowBookmarks) {
      setIsBookmarksReady(false);
    }
  }, [shouldShowBookmarks]);

  // Reset readiness when docs hidden or disabled
  useEffect(() => {
    if (!shouldShowDocs) {
      setIsDocsReady(false);
    }
  }, [shouldShowDocs]);

  // Reset readiness when logos hidden or disabled
  useEffect(() => {
    if (!shouldShowLogos) {
      setIsLogosReady(false);
    }
  }, [shouldShowLogos]);

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
    !isSearchResultsFocused &&
    !isMagicChatLoading &&
    !isBookmarksFocused &&
    !isIconsFocused &&
    !isDocsFocused &&
    !isLogosFocused &&
    !shouldShowIcons &&
    !shouldShowBookmarks &&
    !shouldShowDocs &&
    !shouldShowLogos;

  const textareaClassName = useMemo(
    () =>
      cn(
        'ml-1 h-full w-full flex-1 resize-none bg-transparent text-foreground transition-all duration-150 placeholder:text-muted-foreground/50 focus:outline-none',
        chatState.promptState === 'loading' &&
          'text-muted-foreground placeholder:text-muted-foreground/40',
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

  // Bookmarks handlers
  const handleBookmarkSelection = useCallback(
    (bookmark: Bookmark) => {
      if (!currentChat) return;

      // Convert bookmark to ComponentSearchResult format for consistency
      const bookmarkAsComponent: ComponentSearchResult = {
        id: bookmark.id,
        name: bookmark.name,
        preview_url: bookmark.preview_url || '',
        video_url: bookmark.video_url || '',
        demo_slug: bookmark.demo_slug,
        user_id: bookmark.user.id,
        component_data: {
          name: bookmark.component.name,
          description: '',
          code: '',
          component_slug: bookmark.component.component_slug,
          install_command: '',
        },
        user_data: {
          name: bookmark.component.display_name,
          username: bookmark.component.username,
          image_url: bookmark.component.image_url || '',
          display_image_url: bookmark.component.image_url || '',
          display_name: bookmark.component.display_name,
          display_username: bookmark.component.username,
        },
        usage_data: {
          total_usages: bookmark.bookmarks_count,
          views: bookmark.view_count,
          downloads: 0,
          prompt_copies: 0,
          code_copies: 0,
        },
      };

      // Add component to selected components
      addComponent(bookmarkAsComponent);

      // Also add to chat state
      if (chatState.currentChatId) {
        const currentComponents = currentChat?.selectedComponents || [];
        const newComponent: SelectedComponentWithCode = {
          ...bookmarkAsComponent,
        };
        const updatedComponents = [...currentComponents, newComponent];
        chatState.addSelectedComponents(
          chatState.currentChatId,
          updatedComponents,
        );
      }

      // Clear the entire input (remove "@" and search query)
      chatState.setChatInput(chatState.currentChatId, '');

      // Close bookmarks
      setIsBookmarksActivated(false);
    },
    [currentChat, addComponent, chatState],
  );

  const handleCloseBookmarks = useCallback(() => {
    setIsBookmarksActivated(false);
    setIsBookmarksFocused(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleBookmarksFocusChange = useCallback(
    (isFocused: boolean, activeBookmark?: Bookmark) => {
      setIsBookmarksFocused(isFocused);
    },
    [],
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

  // Auto-focus on bookmarks when they become visible
  useEffect(() => {
    if (shouldShowBookmarks && isBookmarksActivated) {
      // Immediate focus without delay
      bookmarksListRef.current?.focusOnBookmarks();
    }
  }, [shouldShowBookmarks, isBookmarksActivated]);

  // Auto-focus on icons when they become visible (copied from bookmarks logic)
  useEffect(() => {
    if (shouldShowIcons && isIconsActivated) {
      // Immediate focus without delay
      iconsListRef.current?.focusOnIcons();
    }
  }, [shouldShowIcons, isIconsActivated]);

  // Auto-focus на IconsList, когда меняется строка поиска
  useEffect(() => {
    if (shouldShowIcons && isIconsActivated && !isIconsFocused) {
      // небольшая задержка, чтобы React успел пересчитать список
      const t = setTimeout(() => {
        iconsListRef.current?.focusOnIcons();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [iconsSearchQuery, shouldShowIcons, isIconsActivated, isIconsFocused]);

  // Auto-focus on docs when they become visible
  useEffect(() => {
    if (shouldShowDocs && isDocsActivated) {
      docsListRef.current?.focusOnDocs();
    }
  }, [shouldShowDocs, isDocsActivated]);

  // Auto-focus on logos when they become visible
  useEffect(() => {
    if (shouldShowLogos && isLogosActivated) {
      // Immediate focus without delay
      logosListRef.current?.focusOnLogos();
    }
  }, [shouldShowLogos, isLogosActivated]);

  // Auto-focus on LogosList when search query changes
  useEffect(() => {
    if (shouldShowLogos && isLogosActivated && !isLogosFocused) {
      // Small delay to ensure React has recalculated the list
      const t = setTimeout(() => {
        logosListRef.current?.focusOnLogos();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [logosSearchQuery, shouldShowLogos, isLogosActivated, isLogosFocused]);

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
      !shouldShowInlineSuggestion &&
      !isIconsFocused &&
      !isDocsFocused &&
      !isLogosFocused
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
    isIconsFocused,
    isDocsFocused,
    isLogosFocused,
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

    if (isBookmarksFocused && bookmarksListRef.current) {
      // Try to select active bookmark from bookmarks list
      const success = bookmarksListRef.current.selectActiveBookmark();
      if (success) {
        // Bookmark was selected, return focus to input
        setTimeout(() => handleFocusReturn(), 100);
        return;
      }
    }

    if (isIconsFocused && iconsListRef.current) {
      const success = iconsListRef.current.selectActiveIcon();
      if (success) {
        setTimeout(() => handleFocusReturn(), 100);
        return;
      }
    }

    if (isDocsFocused && docsListRef.current) {
      const success = docsListRef.current.selectActiveDoc();
      if (success) {
        setTimeout(() => handleFocusReturn(), 100);
        return;
      }
    }

    if (isLogosFocused && logosListRef.current) {
      const success = logosListRef.current.selectActiveLogo();
      if (success) {
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
      chatState.addMessage(currentChat.id, '', atMode);
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
    chatState.addMessage(currentChat.id, currentInput, atMode);

    // Note: Components and DOM elements will be cleared after loading completes
  }, [
    isSearchResultsFocused,
    isBookmarksFocused,
    isIconsFocused,
    isDocsFocused,
    isLogosFocused,
    currentChat,
    currentInput,
    chatState,
    handleFocusReturn,
    shouldShowOpenInspector,
    shouldShowFixError,
    atMode,
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
                  atMenuMode: atMode, // Track which @-menu mode was used
                  atMenuContextUsed: atMode !== null, // Track if @-menu was used at all
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
        // Don't handle Enter if AtMenu is active - let AtMenu handle it
        if (shouldShowAtMenu) {
          return;
        }

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
      isBookmarksFocused,
      bridge,
      selectedSession,
      shouldShowAtMenu,
      atMode,
    ],
  );

  // Activate icons list only after the user picked the "icons" option (copied from bookmarks logic)
  useEffect(() => {
    if (atMode === 'icons' && !isIconsActivated) {
      setIsIconsActivated(true);
    } else if (atMode !== 'icons' && isIconsActivated) {
      setIsIconsActivated(false);
    }
  }, [atMode, isIconsActivated]);

  // Activate docs search only after the user picked the "docs" option
  useEffect(() => {
    if (atMode === 'docs' && !isDocsActivated) {
      setIsDocsActivated(true);
    } else if (atMode !== 'docs' && isDocsActivated) {
      setIsDocsActivated(false);
    }
  }, [atMode, isDocsActivated]);

  // Activate logos list only after the user picked the "logos" option
  useEffect(() => {
    if (atMode === 'logos' && !isLogosActivated) {
      setIsLogosActivated(true);
    } else if (atMode !== 'logos' && isLogosActivated) {
      setIsLogosActivated(false);
    }
  }, [atMode, isLogosActivated]);

  // Reset readiness when icons hidden or disabled
  useEffect(() => {
    if (!shouldShowIcons) {
      setIsIconsReady(false);
    }
  }, [shouldShowIcons]);

  // Reset readiness when docs hidden or disabled
  useEffect(() => {
    if (!shouldShowDocs) {
      setIsDocsReady(false);
    }
  }, [shouldShowDocs]);

  // Reset readiness when logos hidden or disabled
  useEffect(() => {
    if (!shouldShowLogos) {
      setIsLogosReady(false);
    }
  }, [shouldShowLogos]);

  // Icons handlers
  const computeIconId = useCallback((name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash += name.charCodeAt(i);
    }
    return -Math.abs(hash);
  }, []);

  // Logos handlers
  const computeLogoId = useCallback((logo: SVGLogo) => {
    const identifier = logo.id?.toString() || logo.title;
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash += identifier.charCodeAt(i);
    }
    return -Math.abs(hash);
  }, []);

  const handleIconSelection = useCallback(
    (iconName: string) => {
      if (!currentChat) return;

      const iconComponent: ComponentSearchResult = {
        id: computeIconId(iconName),
        name: iconName,
        preview_url: '',
        video_url: '',
        demo_slug: '',
        user_id: '0',
        component_data: {
          name: iconName,
          description: `${iconName} icon from Lucide Icons library`,
          code: '',
          component_slug: iconName,
          install_command: `import { ${iconName} } from 'lucide-react';`,
        },
        user_data: {
          name: '',
          username: '',
          image_url: '',
          display_image_url: '',
          display_name: '',
          display_username: '',
        },
        usage_data: {
          total_usages: 0,
          views: 0,
          downloads: 0,
          prompt_copies: 0,
          code_copies: 0,
        },
      };

      addComponent(iconComponent);

      if (chatState.currentChatId) {
        const existing = currentChat?.selectedComponents || [];
        const newComponent: SelectedComponentWithCode = { ...iconComponent };
        chatState.addSelectedComponents(chatState.currentChatId, [
          ...existing,
          newComponent,
        ]);
      }

      // Clear input
      chatState.setChatInput(chatState.currentChatId, '');

      // Close icons list
      setIsIconsActivated(false);
    },
    [currentChat, addComponent, chatState, computeIconId],
  );

  const handleCloseIcons = useCallback(() => {
    setIsIconsFocused(false);
    setIsIconsActivated(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleIconsFocusChange = useCallback((isFocused: boolean) => {
    setIsIconsFocused(isFocused);
  }, []);

  const handleLogoSelection = useCallback(
    async (logo: SVGLogo) => {
      if (!currentChat) return;

      const logoUrl =
        typeof logo.route === 'string'
          ? logo.route
          : logo.route.light || logo.route.dark;

      try {
        // Fetch SVG content instead of using URL
        const svgContent = await fetchSVGContent(logoUrl);
        const processedSvg = processSVGForInline(svgContent, 'w-6 h-6');

        const logoComponent: ComponentSearchResult = {
          id: computeLogoId(logo),
          name: logo.title,
          preview_url: logoUrl,
          video_url: '',
          demo_slug: '',
          user_id: '0',
          component_data: {
            name: logo.title,
            description: `${logo.title} logo from SVGL`,
            code: processedSvg,
            component_slug: logo.title.toLowerCase().replace(/\s+/g, '-'),
            install_command: `// ${logo.title} Logo - Inline SVG
// Source: ${logoUrl}
// Ready to use - copy and paste into your React/JSX component

${processedSvg}

// Usage example:
// function MyComponent() {
//   return (
//     <div>
//       {/* Paste the SVG above here */}
//     </div>
//   );
// }
//
// You can customize the size by changing the class:
// w-4 h-4 (16px), w-6 h-6 (24px), w-8 h-8 (32px), etc.`,
          },
          user_data: {
            name: '',
            username: '',
            image_url: '',
            display_image_url: '',
            display_name: '',
            display_username: '',
          },
          usage_data: {
            total_usages: 0,
            views: 0,
            downloads: 0,
            prompt_copies: 0,
            code_copies: 0,
          },
        };

        addComponent(logoComponent);

        if (chatState.currentChatId) {
          const existing = currentChat?.selectedComponents || [];
          const newComponent: SelectedComponentWithCode = { ...logoComponent };
          chatState.addSelectedComponents(chatState.currentChatId, [
            ...existing,
            newComponent,
          ]);
        }

        // Clear input
        chatState.setChatInput(chatState.currentChatId, '');

        // Close logos list
        setIsLogosActivated(false);
      } catch (error) {
        console.error('Failed to fetch SVG content:', error);
        // Fallback to original behavior with img tag
        const logoComponent: ComponentSearchResult = {
          id: computeLogoId(logo),
          name: logo.title,
          preview_url: logoUrl,
          video_url: '',
          demo_slug: '',
          user_id: '0',
          component_data: {
            name: logo.title,
            description: `${logo.title} logo from SVGL`,
            code: `<img src="${logoUrl}" alt="${logo.title}" className="w-6 h-6" />`,
            component_slug: logo.title.toLowerCase().replace(/\s+/g, '-'),
            install_command: `// ${logo.title} Logo - Image fallback
// Source: ${logoUrl}
// SVG loading failed, using image tag instead

<img 
  src="${logoUrl}" 
  alt="${logo.title}" 
  className="w-6 h-6" 
/>

// Usage example:
// function MyComponent() {
//   return (
//     <div>
//       <img src="${logoUrl}" alt="${logo.title}" className="w-6 h-6" />
//     </div>
//   );
// }`,
          },
          user_data: {
            name: '',
            username: '',
            image_url: '',
            display_image_url: '',
            display_name: '',
            display_username: '',
          },
          usage_data: {
            total_usages: 0,
            views: 0,
            downloads: 0,
            prompt_copies: 0,
            code_copies: 0,
          },
        };

        addComponent(logoComponent);

        if (chatState.currentChatId) {
          const existing = currentChat?.selectedComponents || [];
          const newComponent: SelectedComponentWithCode = { ...logoComponent };
          chatState.addSelectedComponents(chatState.currentChatId, [
            ...existing,
            newComponent,
          ]);
        }

        // Clear input
        chatState.setChatInput(chatState.currentChatId, '');

        // Close logos list
        setIsLogosActivated(false);
      }
    },
    [currentChat, addComponent, chatState, computeLogoId],
  );

  const handleCloseLogos = useCallback(() => {
    setIsLogosFocused(false);
    setIsLogosActivated(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleLogosFocusChange = useCallback((isFocused: boolean) => {
    setIsLogosFocused(isFocused);
  }, []);

  // Docs handlers
  const handleDocSelection = useCallback(
    async (item: DocsItem) => {
      if (!currentChat) return;

      // Convert doc to ComponentSearchResult format for consistency
      const docAsComponent: ComponentSearchResult = {
        id: computeIconId(item.id), // Reuse icon ID computation for unique negative IDs
        name: item.title,
        preview_url: '',
        video_url: '',
        demo_slug: '',
        user_id: '0',
        component_data: {
          name: item.title,
          description: item.description,
          code: '', // Will be filled with actual content
          component_slug: item.id,
          install_command: `// Documentation: ${item.title}`,
        },
        user_data: {
          name: '',
          username: '',
          image_url: '',
          display_image_url: '',
          display_name: '',
          display_username: '',
        },
        usage_data: {
          total_usages: 0,
          views: 0,
          downloads: 0,
          prompt_copies: 0,
          code_copies: 0,
        },
      };

      // Add component to selected components first
      addComponent(docAsComponent);

      if (chatState.currentChatId) {
        const existing = currentChat?.selectedComponents || [];
        const newComponent: SelectedComponentWithCode = { ...docAsComponent };
        chatState.addSelectedComponents(chatState.currentChatId, [
          ...existing,
          newComponent,
        ]);
      }

      // Clear input after adding the component
      chatState.setChatInput(chatState.currentChatId, '');

      // Close docs search
      setIsDocsActivated(false);
    },
    [currentChat, addComponent, chatState, computeIconId],
  );

  const handleCloseDocs = useCallback(() => {
    setIsDocsFocused(false);
    setIsDocsActivated(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleDocsFocusChange = useCallback((isFocused: boolean) => {
    setIsDocsFocused(isFocused);
  }, []);

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

          {/* @ Mention Menu - appears when user has only typed '@' */}
          {shouldShowAtMenu && (
            <div
              className="absolute right-0 bottom-full left-0 z-50 mb-2"
              style={searchResultsTranslateStyle}
            >
              <AtMenu
                onSelect={(type) => {
                  setAtMode(type);
                  // Clear input to just "@" when mode is selected
                  chatState.setChatInput(chatState.currentChatId, '@');
                  if (type === 'bookmarks') {
                    setIsBookmarksActivated(true);
                  } else if (type === 'icons') {
                    setIsIconsActivated(true);
                  } else if (type === 'docs') {
                    setIsDocsActivated(true);
                  } else if (type === 'logos') {
                    setIsLogosActivated(true);
                  }
                }}
                onFocusReturn={handleFocusReturn}
                searchQuery={atMenuSearchQuery}
              />
            </div>
          )}

          {/* Icons List - positioned above chat input */}
          {shouldShowIcons && isIconsActivated && (
            <div
              className="absolute right-0 bottom-full left-0 z-50 mb-2"
              style={searchResultsTranslateStyle}
            >
              <IconsList
                ref={iconsListRef}
                searchQuery={iconsSearchQuery}
                onIconSelection={handleIconSelection}
                onFocusReturn={handleFocusReturn}
                onFocusChange={handleIconsFocusChange}
                onCloseIcons={handleCloseIcons}
                onReady={() => setIsIconsReady(true)}
              />
            </div>
          )}

          {/* Docs List - positioned above chat input */}
          {shouldShowDocs && isDocsActivated && (
            <div
              className="absolute right-0 bottom-full left-0 z-50 mb-2"
              style={searchResultsTranslateStyle}
            >
              <DocsList
                ref={docsListRef}
                searchQuery={docsSearchQuery}
                onDocSelection={handleDocSelection}
                onFocusReturn={handleFocusReturn}
                onFocusChange={handleDocsFocusChange}
                onCloseDocs={handleCloseDocs}
                onReady={() => setIsDocsReady(true)}
              />
            </div>
          )}

          {/* Logos List - positioned above chat input */}
          {shouldShowLogos && isLogosActivated && (
            <div
              className="absolute right-0 bottom-full left-0 z-50 mb-2"
              style={searchResultsTranslateStyle}
            >
              <LogosList
                ref={logosListRef}
                searchQuery={logosSearchQuery}
                onLogoSelection={handleLogoSelection}
                onFocusReturn={handleFocusReturn}
                onFocusChange={handleLogosFocusChange}
                onCloseLogos={handleCloseLogos}
                onReady={() => setIsLogosReady(true)}
              />
            </div>
          )}

          {/* Bookmarks List - positioned absolutely above chat input */}
          {shouldShowBookmarks && isBookmarksActivated && (
            <div
              className="absolute right-0 bottom-full left-0 z-50 mb-2"
              style={searchResultsTranslateStyle}
            >
              <BookmarksList
                ref={bookmarksListRef}
                bookmarks={bookmarks}
                isLoading={isBookmarksLoading}
                error={bookmarksError}
                onBookmarkSelection={handleBookmarkSelection}
                onFocusReturn={handleFocusReturn}
                onFocusChange={handleBookmarksFocusChange}
                onCloseBookmarks={handleCloseBookmarks}
                onReady={() => setIsBookmarksReady(true)}
                searchQuery={bookmarksSearchQuery}
              />
            </div>
          )}

          {/* Magic Status Bar - positioned above chat when generation is active */}
          <div
            className={cn(
              'absolute right-0 bottom-full left-0 z-30 transition-all duration-300 ease-out',
              shouldShowSearchResults ||
                shouldShowBookmarks ||
                shouldShowIcons ||
                shouldShowDocs ||
                shouldShowLogos ||
                shouldShowAtMenu
                ? 'pointer-events-none translate-y-2 scale-95 opacity-0'
                : 'pointer-events-auto translate-y-0 scale-100 opacity-100',
            )}
            style={magicStatusBarTranslateStyle}
          >
            <MagicStatusBar />
          </div>

          {/* Selected DOM Elements and Components - positioned above chat */}
          {shouldShowSelectedElements && (
            <div className="absolute right-0 bottom-full left-0 z-40">
              <div className="slide-in-from-top-2 animate-in duration-200 ease-out">
                <div
                  ref={selectedElementsContainerRef}
                  className="-mb-2 rounded-t-[16px] border-border border-x border-t bg-background px-2 pt-2"
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
                      ? isAuthenticated
                        ? 'Enter prompt or 21st.dev search, @ for bookmarks and more...'
                        : 'Enter prompt or 21st.dev search, @ for more...'
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
                {/* Esc indicator on the left - hidden during loading */}
                <div
                  className={cn(
                    'flex items-center text-[10px] text-muted-foreground',
                    (chatState.promptState === 'loading' ||
                      isMagicChatLoading) &&
                      'invisible',
                  )}
                >
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
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
                        ? 'text-foreground hover:text-foreground/80'
                        : 'cursor-not-allowed text-muted-foreground',
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
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/60',
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
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/60',
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
                      (isSearchResultsFocused && isSearchResultsReady) ||
                        (isBookmarksFocused &&
                          isBookmarksReady &&
                          'bg-primary text-primary-foreground hover:bg-primary/90'),
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
                        'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
                      // Loading state
                      chatState.promptState === 'loading' &&
                        'cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground',
                      // Disabled state (only when not loading)
                      (chatState.promptState !== 'loading' &&
                        currentInput.trim().length === 0 &&
                        (!isSearchResultsFocused || !isSearchResultsReady) &&
                        (!isBookmarksFocused || !isBookmarksReady) &&
                        (!isIconsFocused || !isIconsReady) &&
                        (!isDocsFocused || !isDocsReady) &&
                        (!isLogosFocused || !isLogosReady) &&
                        !shouldShowOpenInspector &&
                        !shouldShowFixError) ||
                        chatState.promptState === 'loading' ||
                        isMagicChatLoading,
                    )}
                    disabled={
                      (currentInput.trim().length === 0 &&
                        (!isSearchResultsFocused || !isSearchResultsReady) &&
                        (!isBookmarksFocused || !isBookmarksReady) &&
                        (!isIconsFocused || !isIconsReady) &&
                        (!isDocsFocused || !isDocsReady) &&
                        (!isLogosFocused || !isLogosReady) &&
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
                      {(isSearchResultsFocused && isSearchResultsReady) ||
                      (isBookmarksFocused && isBookmarksReady) ||
                      (isIconsFocused && isIconsReady) ||
                      (isDocsFocused && isDocsReady) ||
                      (isLogosFocused && isLogosReady)
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
                        }
                      }}
                      className="flex size-8 items-center justify-center rounded-full bg-background p-1 opacity-60 transition-all duration-150 hover:bg-background hover:opacity-100"
                    >
                      {plugin.iconSvg ? (
                        <span className="size-4 stroke-foreground text-foreground *:size-full">
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
