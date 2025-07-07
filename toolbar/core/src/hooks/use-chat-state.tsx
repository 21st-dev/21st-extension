import type { ContextElementContext } from '@/plugin';
import { createPrompt, type PluginContextSnippets } from '@/prompts';
import { generateId } from '@/utils';
import { EventName } from '@21st-extension/extension-toolbar-srpc-contract';
import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';
import { useAppState } from './use-app-state';
import { usePlugins } from './use-plugins';
import { useRuntimeErrors, type RuntimeError } from './use-runtime-errors';
import type { SelectedComponentWithCode } from './use-selected-components';
import { useSRPCBridge } from './use-srpc-bridge';
import { useVSCode } from './use-vscode';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  type: 'regular' | 'user_request';
  timestamp: Date;
}

interface DomContextElement {
  element: HTMLElement;
  pluginContext: {
    pluginName: string;
    context: ContextElementContext;
  }[];
}

type ChatId = string;

interface Chat {
  id: ChatId;
  title: string | null;
  messages: Message[];
  inputValue: string;
  domContextElements: DomContextElement[];
  selectedComponents: SelectedComponentWithCode[];
  runtimeError: RuntimeError | null;
}

type ChatAreaState = 'hidden' | 'compact' | 'normal';

// Add new prompt state type
type PromptState = 'idle' | 'loading' | 'success' | 'error';

interface ChatContext {
  // Chat list management
  chats: Chat[];
  currentChatId: ChatId | null;

  // Chat operations
  createChat: () => ChatId;
  deleteChat: (chatId: ChatId) => void;
  setCurrentChat: (chatId: ChatId) => void;

  // Chat content operations
  setChatInput: (chatId: ChatId, value: string) => void;
  addMessage: (chatId: ChatId, content: string, atMenuMode?: 'bookmarks' | 'icons' | 'docs' | 'logos' | null) => void;
  addChatDomContext: (chatId: ChatId, element: HTMLElement) => void;
  removeChatDomContext: (chatId: ChatId, element: HTMLElement) => void;
  addSelectedComponents: (
    chatId: ChatId,
    components: SelectedComponentWithCode[],
  ) => void;
  clearSelectedComponents: (chatId: ChatId) => void;
  addChatRuntimeError: (chatId: ChatId, error: RuntimeError) => void;
  removeChatRuntimeError: (chatId: ChatId) => void;

  // UI state
  chatAreaState: ChatAreaState;
  setChatAreaState: (state: ChatAreaState) => void;
  isPromptCreationActive: boolean;
  startPromptCreation: () => void;
  stopPromptCreation: () => void;

  // Search results focus state
  isSearchResultsFocused: boolean;
  setSearchResultsFocused: (focused: boolean) => void;
  isSearchActivated: boolean;
  setSearchActivated: (activated: boolean) => void;
  closeSearchResults: () => void;

  // DOM selector state
  isDomSelectorActive: boolean;
  startDomSelector: () => void;
  stopDomSelector: () => void;

  // Prompt state
  promptState: PromptState;
  resetPromptState: () => void;
}

const ChatContext = createContext<ChatContext>({
  chats: [],
  currentChatId: null,
  createChat: () => '',
  deleteChat: () => {},
  setCurrentChat: () => {},
  setChatInput: () => {},
  addChatDomContext: () => {},
  removeChatDomContext: () => {},
  addMessage: () => {},
  addSelectedComponents: () => {},
  clearSelectedComponents: () => {},
  addChatRuntimeError: () => {},
  removeChatRuntimeError: () => {},
  chatAreaState: 'hidden',
  setChatAreaState: () => {},
  isPromptCreationActive: false,
  startPromptCreation: () => {},
  stopPromptCreation: () => {},
  isSearchResultsFocused: false,
  setSearchResultsFocused: () => {},
  isSearchActivated: false,
  setSearchActivated: () => {},
  closeSearchResults: () => {},
  isDomSelectorActive: false,
  startDomSelector: () => {},
  stopDomSelector: () => {},
  promptState: 'idle',
  resetPromptState: () => {},
});

interface ChatStateProviderProps {
  children: ComponentChildren;
}

export const ChatStateProvider = ({ children }: ChatStateProviderProps) => {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 'new_chat',
      messages: [],
      title: 'New chat',
      inputValue: '',
      domContextElements: [],
      selectedComponents: [],
      runtimeError: null,
    },
  ]);
  const [currentChatId, setCurrentChatId] = useState<ChatId>('new_chat');
  const [chatAreaState, internalSetChatAreaState] =
    useState<ChatAreaState>('hidden');
  const [isPromptCreationMode, setIsPromptCreationMode] =
    useState<boolean>(false);

  // Add search results focus state
  const [isSearchResultsFocused, setIsSearchResultsFocused] =
    useState<boolean>(false);

  // Add search activation state
  const [isSearchActivated, setIsSearchActivated] = useState<boolean>(false);

  // Add DOM selector state
  const [isDomSelectorActive, setIsDomSelectorActive] =
    useState<boolean>(false);

  // Add prompt state management
  const [promptState, setPromptState] = useState<PromptState>('idle');

  // Reset prompt state function
  const resetPromptState = useCallback(() => {
    setPromptState('idle');
  }, []);

  const { minimized, promptAction } = useAppState();

  const { selectedSession, setShouldPromptWindowSelection, windows } =
    useVSCode();

  useEffect(() => {
    if (minimized) {
      setIsPromptCreationMode(false);
      setIsDomSelectorActive(false);
      internalSetChatAreaState('hidden');
    }
  }, [minimized]);

  const { bridge } = useSRPCBridge();

  // Runtime errors handling
  const { lastError, clearError } = useRuntimeErrors();

  const createChat = useCallback(() => {
    const newChatId = generateId();
    const newChat: Chat = {
      id: newChatId,
      title: null,
      messages: [],
      inputValue: '',
      domContextElements: [],
      selectedComponents: [],
      runtimeError: null,
    };
    setChats((prev) => [...prev, newChat]);
    setCurrentChatId(newChatId);
    return newChatId;
  }, []);

  const deleteChat = useCallback(
    (chatId: ChatId) => {
      setChats((prev) => {
        const filteredChats = prev.filter((chat) => chat.id !== chatId);
        if (filteredChats.length === 0) {
          return [
            {
              id: 'new_chat',
              messages: [],
              title: 'New chat',
              inputValue: '',
              domContextElements: [],
              selectedComponents: [],
              runtimeError: null,
            },
          ];
        }
        return filteredChats;
      });
      if (currentChatId === chatId) {
        setChats((prev) => {
          setCurrentChatId(prev[0].id);
          return prev;
        });
      }
    },
    [currentChatId],
  );

  const setCurrentChat = useCallback((chatId: ChatId) => {
    setCurrentChatId(chatId);
  }, []);

  const setChatInput = useCallback((chatId: ChatId, value: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, inputValue: value } : chat,
      ),
    );
  }, []);

  const { plugins } = usePlugins();

  const startPromptCreation = useCallback(() => {
    setIsPromptCreationMode(true);
    if (chatAreaState === 'hidden') {
      internalSetChatAreaState('compact');
    }

    plugins.forEach((plugin) => {
      plugin.onPromptingStart?.();
    });
  }, [chatAreaState]);

  const stopPromptCreation = useCallback(() => {
    setIsPromptCreationMode(false);
    // Reset prompt state when stopping prompt creation
    setPromptState('idle');
    // Also stop DOM selector when stopping prompt creation
    setIsDomSelectorActive(false);
    // Reset search state when stopping prompt creation
    setIsSearchActivated(false);
    setIsSearchResultsFocused(false);
    // clear dom context for this chat so that it doesn't get too weird when re-starting prompt creation mode
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId ? { ...chat, domContextElements: [] } : chat,
      ),
    );
    if (chatAreaState === 'compact') {
      internalSetChatAreaState('hidden');
    }

    plugins.forEach((plugin) => {
      plugin.onPromptingAbort?.();
    });
  }, [currentChatId, chatAreaState]);

  const setChatAreaState = useCallback(
    (state: ChatAreaState) => {
      internalSetChatAreaState(state);
      if (state === 'hidden') {
        stopPromptCreation();
      }
    },
    [internalSetChatAreaState, stopPromptCreation],
  );

  const addChatDomContext = useCallback(
    (chatId: ChatId, element: HTMLElement) => {
      const pluginsWithContextGetters = plugins.filter(
        (plugin) => plugin.onContextElementSelect,
      );

      setChats((prev) =>
        prev.map((chat) => {
          return chat.id === chatId
            ? {
                ...chat,
                domContextElements: [
                  ...chat.domContextElements,
                  {
                    element,
                    pluginContext: pluginsWithContextGetters.map((plugin) => ({
                      pluginName: plugin.pluginName,
                      context: plugin.onContextElementSelect?.(element),
                    })),
                  },
                ],
              }
            : chat;
        }),
      );
    },
    [plugins],
  );

  const removeChatDomContext = useCallback(
    (chatId: ChatId, element: HTMLElement) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                domContextElements: chat.domContextElements.filter(
                  (e) => e.element !== element,
                ),
              }
            : chat,
        ),
      );
    },
    [],
  );

  const addSelectedComponents = useCallback(
    (chatId: ChatId, components: SelectedComponentWithCode[]) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, selectedComponents: components }
            : chat,
        ),
      );
    },
    [],
  );

  const clearSelectedComponents = useCallback((chatId: ChatId) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, selectedComponents: [] } : chat,
      ),
    );
  }, []);

  const addChatRuntimeError = useCallback(
    (chatId: ChatId, error: RuntimeError) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, runtimeError: error } : chat,
        ),
      );
    },
    [],
  );

  const removeChatRuntimeError = useCallback((chatId: ChatId) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, runtimeError: null } : chat,
      ),
    );
  }, []);

  // Note: We don't auto-add runtime errors to chat context
  // Instead, we show a suggestion in the UI to add them manually

  const addMessage = useCallback(
    async (chatId: ChatId, content: string, atMenuMode?: 'bookmarks' | 'icons' | 'docs' | 'logos' | null, pluginTriggered = false) => {
      if (!content.trim()) return;

      // Prevent sending new messages while one is already loading
      if (promptState === 'loading') return;

      const chat = chats.find((chat) => chat.id === chatId);

      // Set loading state at the start
      setPromptState('loading');

      const pluginContextSnippets: PluginContextSnippets[] = [];

      const pluginProcessingPromises = plugins.map(async (plugin) => {
        const userMessagePayload = {
          id: generateId(),
          text: content,
          contextElements:
            chat?.domContextElements.map((el) => el.element) || [],
          sentByPlugin: pluginTriggered,
        };

        const handlerResult = await plugin.onPromptSend?.(userMessagePayload);

        if (
          !handlerResult ||
          !handlerResult.contextSnippets ||
          handlerResult.contextSnippets.length === 0
        ) {
          return null;
        }

        const snippetPromises = handlerResult.contextSnippets.map(
          async (snippet) => {
            const resolvedContent =
              typeof snippet.content === 'string'
                ? snippet.content
                : await snippet.content();
            return {
              promptContextName: snippet.promptContextName,
              content: resolvedContent,
            };
          },
        );

        const resolvedSnippets = await Promise.all(snippetPromises);

        if (resolvedSnippets.length > 0) {
          const pluginSnippets: PluginContextSnippets = {
            pluginName: plugin.pluginName,
            contextSnippets: resolvedSnippets,
          };
          return pluginSnippets;
        }
        return null;
      });

      const allPluginContexts = await Promise.all(pluginProcessingPromises);

      allPluginContexts.forEach((pluginCtx) => {
        if (pluginCtx) {
          pluginContextSnippets.push(pluginCtx);
        }
      });

      const newMessage: Message = {
        id: generateId(),
        content: content.trim(),
        sender: 'user',
        type: 'regular',
        timestamp: new Date(),
      };

      async function triggerAgentPrompt() {
        if (bridge) {
          try {
            // Track agent prompt triggered with component event
            try {
              await bridge.call.trackEvent(
                {
                  eventName: EventName.AGENT_PROMPT_TRIGGERED_WITH_COMPONENT,
                  properties: {
                    sessionId: selectedSession.sessionId,
                    promptText: content.trim(),
                    componentCount: chat.selectedComponents.length,
                    components: chat.selectedComponents.map((c) => ({
                      id: c.id,
                      demoName: c.name,
                      componentName: c.component_data.name || '',
                      componentDescription: c.component_data.description || '',
                    })),
                    selectedDomElementsCount:
                      chat.domContextElements?.length || 0,
                    runtimeError: chat.runtimeError?.message,
                    promptAction: promptAction,
                    atMenuMode: atMenuMode, // Track which @-menu mode was used
                    atMenuContextUsed: atMenuMode !== null, // Track if @-menu was used at all
                  },
                },
                { onUpdate: () => {} },
              );
            } catch (error) {
              console.warn(
                '[Analytics] Failed to track agent_prompt_triggered_with_component:',
                error,
              );
            }

            // Create prompt (API fetching is now handled inside formatSelectedComponents)
            // Include runtime error only for Send to IDE mode (not for Magic Chat)
            const finalPrompt = await createPrompt(
              chat?.domContextElements.map((e) => e.element),
              content,
              window.location.href,
              pluginContextSnippets,
              chat?.selectedComponents,
              chat?.runtimeError,
            );

            // Call onPromptTransmit hooks for all plugins
            await Promise.all(
              plugins
                .filter((p) => p.onPromptTransmit)
                .map(async (p) => {
                  try {
                    await p.onPromptTransmit!(finalPrompt);
                  } catch (err) {
                    console.error(
                      `[toolbar] plugin "${p.pluginName}" onPromptTransmit failed`,
                      err,
                    );
                  }
                }),
            );

            // Handle prompt action based on user settings
            const shouldCopy =
              promptAction === 'copy' || promptAction === 'both';
            const shouldSend =
              promptAction === 'send' || promptAction === 'both';

            // Copy prompt to clipboard if enabled
            if (shouldCopy) {
              try {
                await navigator.clipboard.writeText(finalPrompt);
              } catch (err) {
                console.warn(
                  '[21st.dev Toolbar] Failed to copy prompt to clipboard:',
                  err,
                );
              }
            }

            let result: any = { result: { success: true } }; // Default success for copy-only mode

            // Send prompt to IDE if enabled
            if (shouldSend) {
              result = await bridge.call.triggerAgentPrompt(
                {
                  prompt: finalPrompt,
                  sessionId: selectedSession?.sessionId,
                },
                { onUpdate: (update) => {} },
              );
            }

            // Handle response based on success/error
            if (result.result.success) {
              // On success, show success state briefly then reset
              setTimeout(() => {
                setPromptState('success');
                // Deactivate DOM selector (inspector) after success
                setIsDomSelectorActive(false);
                // Clear input, DOM elements, and selected components after showing success state
                setChats((prev) =>
                  prev.map((chat) =>
                    chat.id === chatId
                      ? {
                          ...chat,
                          inputValue: '',
                          domContextElements: [],
                          selectedComponents: [],
                        }
                      : chat,
                  ),
                );
                // Reset to idle after success animation completes
                setTimeout(() => {
                  setPromptState('idle');
                }, 800); // Wait for success animation to finish
              }, 1000);
            } else {
              if (
                result.result.errorCode &&
                result.result.errorCode === 'session_mismatch'
              ) {
                setShouldPromptWindowSelection(true);
              }
              // On error, go to error state
              setPromptState('error');
              // Auto-reset to idle and close prompt creation after error animation
              setTimeout(() => {
                setPromptState('idle');
                setIsPromptCreationMode(false);
                // Deactivate DOM selector (inspector) after error
                setIsDomSelectorActive(false);
                // Clear input, DOM elements, and selected components after error completion
                setChats((prev) =>
                  prev.map((chat) =>
                    chat.id === chatId
                      ? {
                          ...chat,
                          inputValue: '',
                          domContextElements: [],
                          selectedComponents: [],
                        }
                      : chat,
                  ),
                );
              }, 300);
            }
          } catch (error) {
            // On exception, go to error state
            setPromptState('error');
            // TODO: show the error message
            // Auto-reset to idle and close prompt creation after error animation
            setTimeout(() => {
              setPromptState('idle');
              setIsPromptCreationMode(false);
              // Deactivate DOM selector (inspector) after exception
              setIsDomSelectorActive(false);
              // Clear input, DOM elements, and selected components after error completion
              setChats((prev) =>
                prev.map((chat) =>
                  chat.id === chatId
                    ? {
                        ...chat,
                        inputValue: '',
                        domContextElements: [],
                        selectedComponents: [],
                      }
                    : chat,
                ),
              );
            }, 300);
          }
        } else {
          // No bridge available, go to error state
          setShouldPromptWindowSelection(true);
          setPromptState('error');
          setTimeout(() => {
            setPromptState('idle');
            setIsPromptCreationMode(false);
            // Deactivate DOM selector (inspector) when no bridge available
            setIsDomSelectorActive(false);
            // Clear input, DOM elements, and selected components after error completion
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === chatId
                  ? {
                      ...chat,
                      inputValue: '',
                      domContextElements: [],
                      selectedComponents: [],
                    }
                  : chat,
              ),
            );
          }, 300);
        }
      }

      triggerAgentPrompt();

      // Don't close prompt creation mode immediately - keep it open to show loading state

      if (chatAreaState === 'hidden') {
        internalSetChatAreaState('compact');
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, newMessage],
                inputValue: content.trim(), // Keep the original prompt instead of clearing
                // Keep domContextElements during loading
              }
            : chat,
        ),
      );
    },
    [
      chatAreaState,
      bridge,
      chats,
      setIsPromptCreationMode,
      internalSetChatAreaState,
      selectedSession,
      promptState,
      setPromptState,
      plugins,
      promptAction,
    ],
  );

  const startDomSelector = useCallback(() => {
    setIsDomSelectorActive(true);
  }, []);

  const stopDomSelector = useCallback(() => {
    setIsDomSelectorActive(false);
  }, []);

  const closeSearchResults = useCallback(() => {
    setIsSearchActivated(false);
    setIsSearchResultsFocused(false);
  }, []);

  const value: ChatContext = {
    chats,
    currentChatId,
    createChat,
    deleteChat,
    setCurrentChat,
    setChatInput,
    addMessage,
    chatAreaState,
    setChatAreaState,
    isPromptCreationActive: isPromptCreationMode,
    startPromptCreation,
    stopPromptCreation,
    addChatDomContext,
    removeChatDomContext,
    addSelectedComponents,
    clearSelectedComponents,
    addChatRuntimeError,
    removeChatRuntimeError,
    isSearchResultsFocused,
    setSearchResultsFocused: setIsSearchResultsFocused,
    isSearchActivated,
    setSearchActivated: setIsSearchActivated,
    closeSearchResults,
    promptState,
    resetPromptState,
    isDomSelectorActive,
    startDomSelector,
    stopDomSelector,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChatState() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatState must be used within a ChatStateProvider');
  }
  return context;
}
