import { useChatState } from '@/hooks/use-chat-state';
import { useComponentSearch } from '@/hooks/use-component-search';
import { useHotkeyListenerComboText } from '@/hooks/use-hotkey-listener-combo-text';
import { usePlugins } from '@/hooks/use-plugins';
import type { SelectedComponentWithCode } from '@/hooks/use-selected-components';
import { cn, HotkeyActions } from '@/utils';
import { Button, Textarea } from '@headlessui/react';
import { SendIcon } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { SearchResults } from './search-results';

export function ToolbarChatArea() {
  const chatState = useChatState();
  const [isComposing, setIsComposing] = useState(false);
  const { plugins } = usePlugins();

  const currentChat = useMemo(
    () => chatState.chats.find((c) => c.id === chatState.currentChatId),
    [chatState.chats, chatState.currentChatId],
  );

  const currentInput = useMemo(
    () => {
      const input = currentChat?.inputValue || '';
      return input;
    },
    [currentChat?.inputValue],
  );

  // Add component search hook
  const { results, isLoading, error } = useComponentSearch(currentInput);

  // Get DOM context elements from current chat
  const domContextElements = useMemo(
    () => {
      const elements = currentChat?.domContextElements.map((e) => e.element) || [];
      return elements;
    },
    [currentChat?.domContextElements],
  );

  // Create plugin context snippets (simplified version for search results)
  const pluginContextSnippets = useMemo(() => {
    if (!currentChat?.domContextElements.length) {
      return [];
    }
    
    const snippets = plugins
      .filter(plugin => plugin.onContextElementSelect)
      .map(plugin => ({
        pluginName: plugin.pluginName,
        contextSnippets: currentChat.domContextElements
          .flatMap(el => el.pluginContext
            .filter(pc => pc.pluginName === plugin.pluginName)
            .map(pc => ({
              promptContextName: 'element_context',
              content: JSON.stringify(pc.context)
            }))
          )
      }))
      .filter(snippet => snippet.contextSnippets.length > 0);
    
    return snippets;
  }, [currentChat?.domContextElements, plugins]);

  const handleInputChange = useCallback(
    (value: string) => {
      chatState.setChatInput(chatState.currentChatId, value);
    },
    [chatState.setChatInput, chatState.currentChatId],
  );

  const handleSubmit = useCallback(() => {
    if (!currentChat || !currentInput.trim()) return;
    chatState.addMessage(currentChat.id, currentInput);
  }, [currentChat, currentInput, chatState.addMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, isComposing],
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
      'flex h-24 w-full flex-1 flex-row items-end gap-1 rounded-2xl p-4 text-sm text-zinc-950 shadow-md backdrop-blur transition-all duration-150 placeholder:text-zinc-950/70';

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

  const handleSelectedComponentsChange = useCallback((selectedComponents: SelectedComponentWithCode[]) => {
    if (chatState.currentChatId) {
      chatState.addSelectedComponents(chatState.currentChatId, selectedComponents);
    }
  }, [chatState]);

  // Show search results when prompt creation is active and there are results/loading/error OR context elements
  const shouldShowSearchResults = chatState.isPromptCreationActive && 
    (results.length > 0 || isLoading || error || 
     pluginContextSnippets.length > 0 || domContextElements.length > 0);

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
        <Button
          className={buttonClassName}
          disabled={
            currentInput.length === 0 || chatState.promptState === 'loading'
          }
          onClick={handleSubmit}
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
