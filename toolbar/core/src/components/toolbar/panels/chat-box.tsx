import { TWENTY_FIRST_URL } from '@/constants';
import type { SelectedComponentWithCode } from '@/hooks/use-chat-state';
import { useChatState } from '@/hooks/use-chat-state';
import { useComponentSearch } from '@/hooks/use-component-search';
import { useHotkeyListenerComboText } from '@/hooks/use-hotkey-listener-combo-text';
import { usePlugins } from '@/hooks/use-plugins';
import { useSRPCBridge } from '@/hooks/use-srpc-bridge';
import { useVSCode } from '@/hooks/use-vscode';
import { createPrompt } from '@/prompts';
import { cn, HotkeyActions } from '@/utils';
import { Button as HeadlessButton, Textarea } from '@headlessui/react';
import { CodeXml } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { Badge } from '../badge';
import { SearchResults } from './search-results';

export function ToolbarChatArea() {
  const chatState = useChatState();
  const [isComposing, setIsComposing] = useState(false);
  const { plugins } = usePlugins();
  const { bridge } = useSRPCBridge();
  const { selectedSession } = useVSCode();

  const currentChat = useMemo(
    () => chatState.chats.find((c) => c.id === chatState.currentChatId),
    [chatState.chats, chatState.currentChatId],
  );

  const currentInput = useMemo(() => {
    const input = currentChat?.inputValue || '';
    return input;
  }, [currentChat?.inputValue]);

  // Add component search hook
  const { results, isLoading, error } = useComponentSearch(currentInput);

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
    },
    [chatState.setChatInput, chatState.currentChatId],
  );

  const handleSubmit = useCallback(() => {
    if (!currentChat) return;
    chatState.addMessage(currentChat.id, currentInput);
  }, [currentChat, currentInput, chatState.addMessage]);

  const handleOpenMagicChat = async () => {
    if (!currentChat || chatState.promptState === 'loading') return;

    // Set loading state at the start
    chatState.setPromptStateLoading();

    try {
      const finalPrompt = await createPrompt(
        domContextElements,
        currentInput,
        window.location.href,
        pluginContextSnippets,
        currentChat?.selectedComponents || [],
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

      // On success, show success state briefly then reset - mimic IDE submit behavior
      setTimeout(() => {
        chatState.setPromptStateSuccess();
      }, 1000);

      // Clear selection and input like addMessage does
      if (chatState.currentChatId) {
        // Clear selected components from chat state
        chatState.clearSelectedComponents(chatState.currentChatId);

        // Clear DOM context elements by removing each one
        domContextElements.forEach((element) => {
          chatState.removeChatDomContext(chatState.currentChatId!, element);
        });

        // Clear chat input
        chatState.setChatInput(chatState.currentChatId, '');
      }

      // Clear local selected components state
      chatState.clearSelection();
    } catch (err) {
      console.error('Error creating query:', err);
      // On error, go to error state - mimic IDE submit behavior
      chatState.setPromptStateError();

      // Auto-reset to idle after error animation
      setTimeout(() => {
        chatState.resetPromptState();
      }, 300);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        // Ensure prompt creation is active for loading animation to show
        if (!chatState.isPromptCreationActive) {
          chatState.startPromptCreation();
        }

        if (e.metaKey) {
          // ⌘ + Enter: Open in Magic Chat
          handleOpenMagicChat();
        } else {
          // Enter: Submit to IDE
          handleSubmit();
        }
      }
    },
    [handleSubmit, handleOpenMagicChat, isComposing, chatState],
  );

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        'h-full w-full flex-1 resize-none bg-transparent text-zinc-950 transition-all duration-150 placeholder:text-zinc-950/50 focus:outline-none',
        chatState.promptState === 'loading' &&
          'text-zinc-500 placeholder:text-zinc-400',
      ),
    [chatState.promptState],
  );

  // Container styles based on prompt state
  const containerClassName = useMemo(() => {
    const baseClasses =
      'flex h-24 w-full flex-1 flex-col gap-2 rounded-2xl p-4 text-sm text-zinc-950 shadow-md backdrop-blur transition-all duration-150 placeholder:text-zinc-950/70';

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
  }, [chatState.promptState]);

  const ctrlAltCText = useHotkeyListenerComboText(HotkeyActions.CTRL_ALT_C);

  const handleSelectedComponentsChange = useCallback(
    (selectedComponents: SelectedComponentWithCode[]) => {
      if (chatState.currentChatId) {
        chatState.addSelectedComponents(
          chatState.currentChatId,
          selectedComponents,
        );
      }
    },
    [chatState],
  );

  // Handle badge deletions
  const handleSelectedComponentDelete = useCallback(
    (componentId: number) => {
      chatState.removeComponent(componentId);
    },
    [chatState],
  );

  const handleDomElementDelete = useCallback(
    (element: HTMLElement) => {
      if (chatState.currentChatId) {
        chatState.removeChatDomContext(chatState.currentChatId, element);
      }
    },
    [chatState],
  );

  // Get selected components and DOM elements for badges
  const selectedComponentBadges = useMemo(() => {
    return (currentChat?.selectedComponents || []).map((component) => ({
      type: 'component' as const,
      id: component.id,
      title: component.name || 'Unknown',
      imgSrc: component.preview_url,
      component,
    }));
  }, [currentChat?.selectedComponents]);

  const domElementBadges = useMemo(() => {
    return (currentChat?.domContextElements || []).map((domEl, index) => ({
      type: 'dom' as const,
      id: `dom-${index}`,
      title: domEl.element.tagName.toLowerCase() || 'element',
      icon: <CodeXml />,
      element: domEl.element,
    }));
  }, [currentChat?.domContextElements]);

  const allBadges = useMemo(() => {
    return [...selectedComponentBadges, ...domElementBadges];
  }, [selectedComponentBadges, domElementBadges]);

  // Show search results when prompt creation is active and there are results/loading/error OR context elements
  const shouldShowSearchResults =
    chatState.isPromptCreationActive &&
    (results.length > 0 ||
      isLoading ||
      error ||
      pluginContextSnippets.length > 0 ||
      domContextElements.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Search Results */}
      {shouldShowSearchResults && (
        <SearchResults
          results={results}
          isLoading={isLoading}
          error={error}
          searchQuery={currentInput}
          domContextElements={domContextElements}
          pluginContextSnippets={pluginContextSnippets}
          onSelectionChange={handleSelectedComponentsChange}
        />
      )}

      {/* Chat Input */}
      <div
        className={containerClassName}
        onClick={() => chatState.startPromptCreation()}
        role="button"
        tabIndex={0}
      >
        {/* Selected Components and DOM Elements Badges */}
        {allBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 w-full">
            {allBadges.map((badge) => (
              <Badge
                key={badge.id}
                title={badge.title}
                className="shadow-sm"
                imgSrc={badge.type === 'component' ? badge.imgSrc : undefined}
                icon={badge.type === 'dom' ? badge.icon : undefined}
                onDelete={() => {
                  if (badge.type === 'component') {
                    handleSelectedComponentDelete(badge.component.id);
                  } else {
                    handleDomElementDelete(badge.element);
                  }
                }}
              />
            ))}
          </div>
        )}

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
                : 'Enter prompt...'
              : `What do you want to change? (${ctrlAltCText})`
          }
          disabled={chatState.promptState === 'loading'}
        />

        <div className="flex justify-end gap-2">
          <HeadlessButton
            type="button"
            className={cn(
              '!py-0 gap-0.5 bg-transparent text-[10px] hover:bg-transparent',
              chatState.promptState === 'loading'
                ? 'opacity-50 cursor-not-allowed'
                : '',
            )}
            disabled={chatState.promptState === 'loading'}
            onClick={handleOpenMagicChat}
          >
            <span className="mr-1 font-semibold text-foreground">
              {chatState.promptState === 'loading'
                ? 'Opening...'
                : 'Open in Magic'}
            </span>
            <span className="text-muted-foreground">⌘</span>
            <span className="text-muted-foreground">⏎</span>
          </HeadlessButton>
          <HeadlessButton
            type="button"
            className={cn(
              'gap-0.5 border py-0.5 text-[10px] transition-all duration-200 bg-muted',
              chatState.promptState === 'loading'
                ? 'opacity-50 cursor-not-allowed'
                : '',
            )}
            disabled={chatState.promptState === 'loading'}
            onClick={handleSubmit}
          >
            <span className="mr-1 font-semibold text-foreground">
              Send to IDE
            </span>
            <span className="text-muted-foreground">⏎</span>
          </HeadlessButton>
        </div>
      </div>
    </div>
  );
}
