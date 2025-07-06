import { useChatState } from '@/hooks/use-chat-state';
import { cn } from '@/utils';
import { useCallback, useMemo } from 'preact/hooks';
import { XIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverPeek } from '@/components/ui/link-preview';
import type { SelectedComponentWithCode } from '@/hooks/use-selected-components';
import type { RuntimeError } from '@/hooks/use-runtime-errors';
import * as LucideIcons from 'lucide-react';

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

  // Helper function to check if a component is a Lucide icon
  const isLucideIcon = useCallback((component: SelectedComponentWithCode) => {
    const description = component.component_data?.description || '';
    return description.includes('icon from Lucide Icons library');
  }, []);

  // Helper function to check if a component is a logo
  const isLogo = useCallback((component: SelectedComponentWithCode) => {
    const description = component.component_data?.description || '';
    return description.includes('logo from SVGL');
  }, []);

  // Helper function to check if a component is a documentation item
  const isDocumentation = useCallback(
    (component: SelectedComponentWithCode) => {
      const installCommand = component.component_data?.install_command || '';
      return installCommand.startsWith('// Documentation:');
    },
    [],
  );

  // Component for icon hover preview
  const IconHoverPeek = ({
    component,
    children,
  }: {
    component: SelectedComponentWithCode;
    children: any;
  }) => {
    const iconName = component.component_data?.name || component.name;
    const IconComponent = iconName ? (LucideIcons as any)[iconName] : null;

    if (!IconComponent) {
      return children;
    }

    return (
      <div className="group relative">
        {children}
        {/* Hover preview */}
        <div className="-translate-x-1/2 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden group-hover:block">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-background shadow-lg">
            <IconComponent className="h-10 w-10 text-foreground" />
          </div>
          <div className="mt-1 text-center text-muted-foreground text-xs">
            {iconName}
          </div>
        </div>
      </div>
    );
  };

  // Component for logo hover preview
  const LogoHoverPeek = useCallback(
    ({
      component,
      children,
    }: {
      component: SelectedComponentWithCode;
      children: any;
    }) => {
      const logoName = component.component_data?.name || component.name;
      const logoUrl = component.preview_url;

      // Memoize the image element to prevent re-downloads
      const logoImage = useMemo(() => {
        if (!logoUrl) return null;

        return (
          <img
            key={`logo-hover-${component.id}-${logoUrl}`}
            src={logoUrl}
            alt={logoName}
            className="h-8 w-8 object-contain"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      }, [logoUrl, logoName, component.id]);

      if (!logoUrl) {
        return children;
      }

      return (
        <div className="group relative">
          {children}
          {/* Hover preview - smaller than icon preview */}
          <div className="-translate-x-1/2 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden group-hover:block">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-background shadow-lg">
              {logoImage}
            </div>
            <div className="mt-1 text-center text-muted-foreground text-xs">
              {logoName}
            </div>
          </div>
        </div>
      );
    },
    [],
  );

  // Component for documentation hover preview
  const DocHoverPeek = ({
    component,
    children,
  }: {
    component: SelectedComponentWithCode;
    children: any;
  }) => {
    const docTitle = component.component_data?.name || component.name;
    const docDescription = component.component_data?.description || '';

    return (
      <div className="group relative">
        {children}
        {/* Hover preview */}
        <div className="-translate-x-1/2 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden group-hover:block">
          <div className="w-48 max-w-xs rounded-lg border border-border bg-background p-3 shadow-lg">
            <div className="font-medium text-foreground text-sm">
              {docTitle}
            </div>
            {docDescription && (
              <div className="mt-1 line-clamp-3 text-muted-foreground text-xs">
                {docDescription}
              </div>
            )}
            <div className="mt-2 text-muted-foreground text-xs">
              Documentation
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getElementInfo = useCallback(
    (element: HTMLElement, pluginContext: any[]) => {
      // Get element type (tagName)
      const tagName = element.tagName.toLowerCase();

      // Get annotation from plugins (e.g., React component)
      const annotation = pluginContext.find((ctx) => ctx.context?.annotation)
        ?.context?.annotation;

      // Return component name if available, otherwise fall back to HTML tag
      return annotation || tagName;
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
        const elementKey = `dom-${elementData.element.tagName}-${elementData.element.className || 'no-class'}-${index}`;

        return (
          <div
            key={elementKey}
            className={cn(
              'flex items-center gap-1 rounded-md border border-zinc-200 bg-background px-1.5 py-0.5 text-xs dark:border-zinc-800',
              'transition-all duration-150',
              compact && 'px-1 py-0.5 text-xs',
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveElement(elementData.element)}
              className="group relative h-3.5 max-h-3.5 w-3.5 max-w-3.5 flex-shrink-0 overflow-hidden rounded-[4px] text-[8px] leading-none hover:bg-muted"
              title="Remove element"
            >
              {/* Element Icon - shown by default */}
              <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:opacity-0">
                <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-accent font-medium text-[7px] text-primary">
                  {info.charAt(0).toUpperCase()}
                </div>
              </div>
              {/* X Icon - shown on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-muted">
                  <XIcon className="h-2.5 w-2.5 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
                </div>
              </div>
            </Button>
            <span className="min-w-0 truncate font-medium text-foreground">
              {info}
            </span>
          </div>
        );
      })}

      {/* Selected Components */}
      {useMemo(
        () =>
          selectedComponents.map((component) => {
            const componentName =
              component.component_data?.name || component.name || 'Component';
            const avatarLetter = componentName.charAt(0).toUpperCase();
            const isIcon = isLucideIcon(component);
            const isLogoComponent = isLogo(component);
            const isDoc = isDocumentation(component);
            const IconComponent = isIcon
              ? (LucideIcons as any)[componentName]
              : null;

            const componentElement = (
              <div
                key={`component-${component.id}`}
                className={cn(
                  'group flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-xs dark:border-zinc-800',
                  'transition-all duration-150',
                  compact && 'px-1 py-0.5 text-xs',
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveComponent(component.id.toString())}
                  className="relative h-3.5 max-h-3.5 w-3.5 max-w-3.5 flex-shrink-0 overflow-hidden rounded-[4px] text-[8px] leading-none hover:bg-accent"
                  title="Remove component"
                >
                  {/* Avatar - shown by default */}
                  <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:opacity-0">
                    {isIcon && IconComponent ? (
                      <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-accent">
                        <IconComponent className="h-2.5 w-2.5 text-primary" />
                      </div>
                    ) : isLogoComponent ? (
                      <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-accent">
                        <img
                          key={`logo-small-${component.id}-${component.preview_url}`}
                          src={component.preview_url}
                          alt={componentName}
                          className="h-2.5 w-2.5 object-contain"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : isDoc ? (
                      <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-accent">
                        <svg
                          className="h-2.5 w-2.5 text-primary"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10,9 9,9 8,9" />
                        </svg>
                      </div>
                    ) : component.preview_url ? (
                      <img
                        src={component.preview_url}
                        alt={componentName}
                        className="h-full w-full rounded-[4px] object-cover"
                        onError={(e) => {
                          // Fallback to letter if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="bg-accent text-primary font-medium text-[7px] h-full w-full flex items-center justify-center rounded-[4px]">${avatarLetter}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-accent font-medium text-[7px] text-primary">
                        {avatarLetter}
                      </div>
                    )}
                  </div>
                  {/* X Icon - shown on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                    <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-muted">
                      <XIcon className="h-2.5 w-2.5 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
                    </div>
                  </div>
                </Button>
                <span className="min-w-0 truncate font-medium text-primary">
                  {componentName}
                </span>
              </div>
            );

            // Render with appropriate hover component
            if (isIcon) {
              return (
                <IconHoverPeek component={component}>
                  {componentElement}
                </IconHoverPeek>
              );
            } else if (isLogoComponent) {
              return (
                <LogoHoverPeek component={component}>
                  {componentElement}
                </LogoHoverPeek>
              );
            } else if (isDoc) {
              return (
                <DocHoverPeek component={component}>
                  {componentElement}
                </DocHoverPeek>
              );
            } else {
              return (
                <HoverPeek
                  url="#"
                  isStatic={true}
                  imageSrc={component.preview_url}
                  peekWidth={240}
                  peekHeight={180}
                  enableMouseFollow={false}
                  enableLensEffect={false}
                  side="top"
                >
                  {componentElement}
                </HoverPeek>
              );
            }
          }),
        [
          selectedComponents,
          isLucideIcon,
          isLogo,
          isDocumentation,
          handleRemoveComponent,
          compact,
        ],
      )}

      {/* Runtime Error Suggestion */}
      {shouldShowRuntimeErrorSuggestion && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'group flex flex-1 items-center gap-1 rounded-md border border-zinc-200 border-dashed px-1.5 py-0.5 text-xs dark:border-zinc-800',
              'cursor-pointer transition-all duration-150',
              compact && 'px-1 py-0.5 text-xs',
            )}
            onClick={handleAddRuntimeError}
            role="button"
            tabIndex={0}
            title="Click or press Tab to add runtime error to context"
          >
            <AlertTriangleIcon className="h-2.5 w-2.5 flex-shrink-0 text-red-500" />
            <span className="min-w-0 truncate font-medium text-red-500">
              {runtimeError && getRuntimeErrorText(runtimeError)}
            </span>
          </div>
          {!hasInputText &&
            (!currentChat?.domContextElements ||
              currentChat.domContextElements.length === 0) &&
            selectedComponents.length === 0 && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-medium text-muted-foreground',
                  'rounded border border-zinc-200 bg-background px-1 py-0.5 dark:border-zinc-800',
                  'flex-shrink-0 transition-all duration-200 ease-out',
                )}
              >
                <span className="rounded-[2px] bg-muted p-0.5 font-bold text-[10px] text-muted-foreground leading-none">
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
            'group flex items-center gap-1 rounded-md border border-zinc-200 bg-background px-1.5 py-0.5 text-xs dark:border-zinc-800',
            'transition-all duration-150',
            compact && 'px-1 py-0.5 text-xs',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemoveRuntimeError}
            className="relative h-3.5 max-h-3.5 w-3.5 max-w-3.5 flex-shrink-0 overflow-hidden rounded-[4px] text-[8px] leading-none hover:bg-muted"
            title="Remove runtime error from context"
          >
            {/* Alert Icon - shown by default */}
            <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:opacity-0">
              <AlertTriangleIcon className="h-2.5 w-2.5 text-red-500" />
            </div>
            {/* X Icon - shown on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
              <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-muted">
                <XIcon className="h-2.5 w-2.5 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
              </div>
            </div>
          </Button>
          <span className="min-w-0 truncate font-medium text-red-500">
            {getRuntimeErrorText(currentChat.runtimeError)}
          </span>
        </div>
      )}
    </div>
  );
}
