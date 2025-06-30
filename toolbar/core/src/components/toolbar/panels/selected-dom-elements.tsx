import { useChatState } from '@/hooks/use-chat-state';
import { cn } from '@/utils';
import { useCallback } from 'preact/hooks';
import { XIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverPeek } from '@/components/ui/link-preview';
import type { SelectedComponentWithCode } from '@/hooks/use-selected-components';
import type { RuntimeError } from '@/hooks/use-runtime-errors';

interface SelectedDomElementsProps {
  elements: Array<{
    element: HTMLElement;
    pluginContext: Array<{
      pluginName: string;
      context: { annotation: string | null };
    }>;
  }>;
  selectedComponents?: SelectedComponentWithCode[];
  onRemoveComponent?: (componentId: string) => void;
  chatId: string;
  compact?: boolean;
  runtimeError?: RuntimeError | null;
  hasInputText?: boolean;
}

export function SelectedDomElements({
  elements,
  selectedComponents = [],
  onRemoveComponent,
  chatId,
  compact = false,
  runtimeError,
  hasInputText = false,
}: SelectedDomElementsProps) {
  const { removeChatDomContext, removeChatRuntimeError, addChatRuntimeError } =
    useChatState();

  const handleRemoveElement = useCallback(
    (element: HTMLElement) => {
      removeChatDomContext(chatId, element);
    },
    [removeChatDomContext, chatId],
  );

  const handleRemoveComponent = useCallback(
    (componentId: string) => {
      if (onRemoveComponent) {
        onRemoveComponent(componentId);
      }
    },
    [onRemoveComponent],
  );

  const handleAddRuntimeError = useCallback(() => {
    if (runtimeError) {
      addChatRuntimeError(chatId, runtimeError);
    }
  }, [runtimeError, addChatRuntimeError, chatId]);

  const handleRemoveRuntimeError = useCallback(() => {
    removeChatRuntimeError(chatId);
  }, [removeChatRuntimeError, chatId]);

  const getRuntimeErrorText = useCallback((error: RuntimeError) => {
    if (!error.filename || error.filename === 'unknown') {
      return 'Runtime Error';
    }
    const fileName =
      error.filename.split('/').pop()?.split('?')[0] || 'unknown file';
    return `Runtime Error in ${fileName}`;
  }, []);

  const getElementInfo = useCallback(
    (element: HTMLElement, pluginContext: any[]) => {
      // Get element type (tagName)
      const tagName = element.tagName.toLowerCase();

      // Get annotation from plugins (e.g., React component)
      const annotation = pluginContext.find((ctx) => ctx.context?.annotation)
        ?.context?.annotation;

      // Return HTML tag first
      return tagName;
    },
    [],
  );

  // Get current chat to check if runtime error is in context
  const currentChat = useChatState().chats.find((chat) => chat.id === chatId);

  // Check if we should show runtime error suggestion
  // Show if there's a runtime error and it's not already in the current chat context
  const shouldShowRuntimeErrorSuggestion =
    runtimeError &&
    (!currentChat?.runtimeError ||
      currentChat.runtimeError.timestamp.getTime() !==
        runtimeError.timestamp.getTime());

  if (
    elements.length === 0 &&
    selectedComponents.length === 0 &&
    !currentChat?.runtimeError &&
    !shouldShowRuntimeErrorSuggestion
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {/* DOM Elements */}
      {elements.map((elementData, index) => {
        const info = getElementInfo(
          elementData.element,
          elementData.pluginContext,
        );
        // Create unique key based on element and its position in DOM
        const elementKey = `dom-${elementData.element.tagName}-${elementData.element.className || 'no-class'}-${index}`;

        return (
          <div
            key={elementKey}
            className={cn(
              'flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-xs',
              'transition-all duration-150 hover:border-gray-300 hover:bg-gray-50',
              compact && 'px-1 py-0.5 text-xs',
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveElement(elementData.element)}
              className="h-3.5 max-h-3.5 w-3.5 max-w-3.5 flex-shrink-0 rounded-[2px] text-[8px] text-gray-400 leading-none hover:bg-gray-100 hover:text-gray-900"
              title="Remove element"
            >
              <XIcon className="h-2.5 min-h-2.5 w-2.5 min-w-2.5 text-gray-400 hover:text-gray-900" />
            </Button>
            <span className="min-w-0 truncate font-medium text-gray-700">
              {info}
            </span>
          </div>
        );
      })}

      {/* Selected Components */}
      {selectedComponents.map((component) => {
        const componentName =
          component.component_data?.name || component.name || 'Component';
        const avatarLetter = componentName.charAt(0).toUpperCase();

        return (
          <HoverPeek
            key={`component-${component.id}`}
            url="#"
            isStatic={true}
            imageSrc={component.preview_url}
            peekWidth={240}
            peekHeight={180}
            enableMouseFollow={false}
            enableLensEffect={false}
            side="top"
          >
            <div
              className={cn(
                'group flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs',
                'transition-all duration-150 hover:border-blue-300 hover:bg-blue-100',
                compact && 'px-1 py-0.5 text-xs',
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveComponent(component.id.toString())}
                className="relative h-3.5 max-h-3.5 w-3.5 max-w-3.5 flex-shrink-0 overflow-hidden rounded-[2px] text-[8px] leading-none hover:bg-blue-200"
                title="Remove component"
              >
                {/* Avatar - shown by default */}
                <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:scale-75 group-hover:opacity-0">
                  {component.preview_url ? (
                    <img
                      src={component.preview_url}
                      alt={componentName}
                      className="h-full w-full rounded-[1px] object-cover"
                      onError={(e) => {
                        // Fallback to letter if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="bg-blue-200 text-blue-700 font-medium text-[7px] h-full w-full flex items-center justify-center">${avatarLetter}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-200 font-medium text-[7px] text-blue-700">
                      {avatarLetter}
                    </div>
                  )}
                </div>
                {/* X Icon - shown on hover */}
                <div className="absolute inset-0 flex scale-125 items-center justify-center opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                  <XIcon className="h-2.5 w-2.5 text-blue-400 group-hover:text-blue-900" />
                </div>
              </Button>
              <span className="min-w-0 truncate font-medium text-blue-700">
                {componentName}
              </span>
            </div>
          </HoverPeek>
        );
      })}

      {/* Runtime Error Suggestion */}
      {shouldShowRuntimeErrorSuggestion && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'group flex flex-1 items-center gap-1 rounded-md border-[1px] border-red-300 border-dashed px-1.5 py-0.5 text-xs',
              'cursor-pointer transition-all duration-150 hover:border-red-400',
              compact && 'px-1 py-0.5 text-xs',
            )}
            onClick={handleAddRuntimeError}
            role="button"
            tabIndex={0}
            title="Click or press Tab to add runtime error to context"
          >
            <AlertTriangleIcon className="h-2.5 w-2.5 flex-shrink-0 text-red-500" />
            <span className="min-w-0 truncate font-medium text-red-700">
              {runtimeError && getRuntimeErrorText(runtimeError)}
            </span>
          </div>
          {!hasInputText && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium text-gray-600',
                'rounded border border-gray-200/50 bg-gray-100 px-1 py-0.5 backdrop-blur-sm',
                'flex-shrink-0 transition-all duration-200 ease-out',
              )}
            >
              <span className="rounded-[2px] bg-gray-200 p-0.5 font-bold text-[10px] text-gray-600 leading-none">
                Tab
              </span>
              <span className="text-[11px] leading-none">
                to add to context
              </span>
            </span>
          )}
        </div>
      )}

      {/* Runtime Error in Context */}
      {currentChat?.runtimeError && (
        <div
          className={cn(
            'group flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs',
            'transition-all duration-150 hover:border-red-300 hover:bg-red-100',
            compact && 'px-1 py-0.5 text-xs',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemoveRuntimeError}
            className="h-3.5 max-h-3.5 w-3.5 max-w-3.5 flex-shrink-0 rounded-[2px] text-[8px] text-red-400 leading-none hover:bg-red-100 hover:text-red-900"
            title="Remove runtime error from context"
          >
            <XIcon className="h-2.5 min-h-2.5 w-2.5 min-w-2.5 text-red-400 hover:text-red-900" />
          </Button>
          <span className="min-w-0 truncate font-medium text-red-700">
            {getRuntimeErrorText(currentChat.runtimeError)}
          </span>
        </div>
      )}
    </div>
  );
}
