import { useChatState } from '@/hooks/use-chat-state';
import { cn } from '@/utils';
import { useCallback } from 'preact/hooks';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard } from '@/components/ui/hover-card';
import type { SelectedComponentWithCode } from '@/hooks/use-selected-components';

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
}

export function SelectedDomElements({
  elements,
  selectedComponents = [],
  onRemoveComponent,
  chatId,
  compact = false,
}: SelectedDomElementsProps) {
  const { removeChatDomContext } = useChatState();

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

  const getElementInfo = useCallback(
    (element: HTMLElement, pluginContext: any[]) => {
      // Получаем тип элемента (tagName)
      const tagName = element.tagName.toLowerCase();

      // Получаем аннотацию от плагинов (например, компонент React)
      const annotation = pluginContext.find((ctx) => ctx.context?.annotation)
        ?.context?.annotation;

      // Возвращаем HTML тег в первую очередь
      return tagName;
    },
    [],
  );

  if (elements.length === 0 && selectedComponents.length === 0) {
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
        // Создаем уникальный ключ на основе элемента и его позиции в DOM
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

        return (
          <HoverCard
            key={`component-${component.id}`}
            content={{
              name: componentName,
              preview_url: component.preview_url,
            }}
          >
            <div
              className={cn(
                'flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs',
                'transition-all duration-150 hover:border-blue-300 hover:bg-blue-100',
                compact && 'px-1 py-0.5 text-xs',
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveComponent(component.id.toString())}
                className="h-3.5 max-h-3.5 w-3.5 max-w-3.5 flex-shrink-0 rounded-[2px] text-[8px] text-blue-400 leading-none hover:bg-blue-200 hover:text-blue-900"
                title="Remove component"
              >
                <XIcon className="h-2.5 min-h-2.5 w-2.5 min-w-2.5 text-blue-400 hover:text-blue-900" />
              </Button>
              <span className="min-w-0 truncate font-medium text-blue-700">
                {componentName}
              </span>
            </div>
          </HoverCard>
        );
      })}
    </div>
  );
}
