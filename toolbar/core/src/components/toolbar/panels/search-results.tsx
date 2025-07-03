import type { SelectedComponentWithCode } from '@/hooks/use-selected-components';
import type { PluginContextSnippets } from '@/prompts';
import type { ComponentSearchResult } from '@/types/supabase';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  useMemo,
} from 'preact/hooks';
import { forwardRef } from 'preact/compat';
import { TextShimmer } from '../../ui/text-shimmer';

interface SearchResultsProps {
  results: ComponentSearchResult[];
  isLoading: boolean;
  error: string | null;
  searchQuery?: string;
  domContextElements?: HTMLElement[];
  pluginContextSnippets?: PluginContextSnippets[];
  selectedComponents?: SelectedComponentWithCode[];
  onComponentSelection?: (
    result: ComponentSearchResult,
    selected: boolean,
  ) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (
    isFocused: boolean,
    activeResult?: ComponentSearchResult,
  ) => void;
  onCloseSearch?: () => void;
  onReady?: () => void;
}

export interface SearchResultsRef {
  focusOnResults: () => void;
  selectActiveComponent: () => boolean;
}

// Mini component for small result cards
function MiniComponentCard({
  result,
  isSelected,
  isFocused,
  onSelectionChange,
}: {
  result: ComponentSearchResult;
  isSelected?: boolean;
  isFocused?: boolean;
  onSelectionChange?: (
    result: ComponentSearchResult,
    selected: boolean,
  ) => void;
}) {
  const componentName = result.component_data.name || result.name;

  // Фильтрация стандартных названий демо
  const shouldShowDemoName = (demoName: string) => {
    const normalizedName = demoName.toLowerCase().trim();
    const defaultNames = ['default', 'default demo', 'default.tsx'];
    return !defaultNames.includes(normalizedName);
  };

  const demoName =
    result.component_data.name && shouldShowDemoName(result.name)
      ? result.name
      : null;
  const authorName = result.user_data.display_name || result.user_data.name;
  const authorAvatar =
    result.user_data.display_image_url || result.user_data.image_url;

  const handleClick = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange(result, !isSelected);
    }
  }, [result, isSelected, onSelectionChange]);

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition-all duration-200 ${
        isSelected
          ? 'border-border bg-background ring-2 ring-blue-500'
          : isFocused
            ? 'border-border bg-background ring-2 ring-muted-foreground'
            : 'border-border bg-background hover:border-muted-foreground hover:bg-muted'
      }`}
      onClick={handleClick}
    >
      {/* Mini preview image */}
      <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
        {result.preview_url ? (
          <img
            src={result.preview_url}
            alt={componentName}
            className="h-full w-full rounded border border-border object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full rounded border border-border bg-muted" />
        )}
      </div>

      {/* Component name and demo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1">
          <span
            className="truncate text-left font-medium text-foreground"
          >
            {componentName || 'Unknown'}
          </span>
          {demoName && (
            <span className="truncate text-[10px] text-muted-foreground">
              {demoName}
            </span>
          )}
        </div>
      </div>

      {/* Author info */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {authorAvatar && (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-4 w-4 rounded-full border border-border"
            loading="eager"
          />
        )}
        {authorName && (
          <span className="max-w-16 truncate text-[10px] text-muted-foreground">
            {authorName}
          </span>
        )}
      </div>
    </button>
  );
}

export const SearchResults = forwardRef<SearchResultsRef, SearchResultsProps>(
  (
    {
      results,
      isLoading,
      error,
      searchQuery,
      domContextElements,
      pluginContextSnippets,
      selectedComponents = [],
      onComponentSelection,
      onFocusReturn,
      onFocusChange,
      onCloseSearch,
      onReady,
    },
    ref,
  ) => {
    // Keyboard navigation state
    const [activeIndex, setActiveIndex] = useState(-1);
    const [startIndex, setStartIndex] = useState(0); // Start of the visible window
    const [isFocused, setIsFocused] = useState(false);
    const [isFirstAppearance, setIsFirstAppearance] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const availableResultsRef = useRef<ComponentSearchResult[]>([]);

    // Get all available results (not selected)
    const allAvailableResults = useMemo(() => {
      return results.filter(
        (result) => !selectedComponents.some((c) => c.id === result.id),
      );
    }, [results, selectedComponents]);

    // Show 3 results starting from startIndex
    const visibleResults = useMemo(() => {
      return allAvailableResults.slice(startIndex, startIndex + 3);
    }, [allAvailableResults, startIndex]);

    // Get the currently active result for preview
    const activeResult = useMemo(() => {
      if (
        isFocused &&
        activeIndex >= 0 &&
        activeIndex < allAvailableResults.length
      ) {
        return allAvailableResults[activeIndex];
      }
      return null;
    }, [isFocused, activeIndex, allAvailableResults]);

    // Update ref when allAvailableResults changes
    useEffect(() => {
      availableResultsRef.current = allAvailableResults;
    }, [allAvailableResults]);

    // Handle staggered animation on first appearance
    useEffect(() => {
      if (visibleResults.length > 0 && isFirstAppearance) {
        // Calculate total animation time: last element delay + animation duration
        const totalAnimationTime = (visibleResults.length - 1) * 50 + 200;
        const timer = setTimeout(() => {
          setIsFirstAppearance(false);
          // Notify parent when animation completed
          if (onReady) {
            onReady();
          }
        }, totalAnimationTime);

        return () => clearTimeout(timer);
      }
    }, [visibleResults.length, isFirstAppearance, onReady]);

    // If there is no first appearance animation (e.g., already rendered), ensure onReady is called
    useEffect(() => {
      if (!isFirstAppearance) {
        onReady?.();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFirstAppearance]);

    // Reset first appearance when search query changes or when results become empty
    useEffect(() => {
      if (allAvailableResults.length === 0) {
        setIsFirstAppearance(true);
      }
    }, [allAvailableResults.length, searchQuery]);

    // Handle component selection
    const handleComponentSelection = useCallback(
      (result: ComponentSearchResult, selected: boolean) => {
        if (onComponentSelection) {
          onComponentSelection(result, selected);
        }
        // Close search after selection
        if (selected && onCloseSearch) {
          setTimeout(() => {
            onCloseSearch();
          }, 100);
        }
      },
      [onComponentSelection, onCloseSearch],
    );

    // Expose methods to parent
    useImperativeHandle(
      ref,
      () => ({
        focusOnResults: () => {
          if (!isFocused) {
            setIsFocused(true);
            setActiveIndex(allAvailableResults.length > 0 ? 0 : -1);
            setStartIndex(0); // Reset to beginning
            containerRef.current?.focus();
          }
        },
        selectActiveComponent: () => {
          if (
            isFocused &&
            activeIndex >= 0 &&
            activeIndex < allAvailableResults.length
          ) {
            const activeResult = allAvailableResults[activeIndex];
            handleComponentSelection(activeResult, true);
            return true;
          }
          return false;
        },
      }),
      [allAvailableResults, isFocused, activeIndex, handleComponentSelection],
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        const currentResults = availableResultsRef.current;

        if (!isFocused || currentResults.length === 0) {
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setActiveIndex((prev) => {
              const nextIndex = prev + 1;
              const newIndex =
                nextIndex < currentResults.length ? nextIndex : 0;

              // Update startIndex to keep the active item visible
              setStartIndex((currentStart) => {
                if (newIndex === 0) {
                  // Wrapped to beginning
                  return 0;
                } else if (newIndex >= currentStart + 3) {
                  // Need to scroll down
                  return Math.min(newIndex - 2, currentResults.length - 3);
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setActiveIndex((prev) => {
              const newIndex = prev > 0 ? prev - 1 : currentResults.length - 1;

              // Update startIndex to keep the active item visible
              setStartIndex((currentStart) => {
                if (newIndex === currentResults.length - 1) {
                  // Wrapped to end
                  return Math.max(0, currentResults.length - 3);
                } else if (newIndex < currentStart) {
                  // Need to scroll up
                  return Math.max(0, newIndex);
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            setActiveIndex((prev) => {
              if (prev >= 0 && prev < currentResults.length) {
                const activeResult = currentResults[prev];
                handleComponentSelection(activeResult, true);
                // Close search and return focus to textarea after selection
                setTimeout(() => {
                  setIsFocused(false);
                  setActiveIndex(-1);
                  setStartIndex(0);
                  if (onCloseSearch) {
                    onCloseSearch();
                  }
                  if (onFocusReturn) {
                    onFocusReturn();
                  }
                }, 100);
              }
              return prev;
            });
            break;
          case 'Escape':
            e.preventDefault();
            // Don't stop propagation - let hotkey listener handle it too
            setIsFocused(false);
            setActiveIndex(-1);
            setStartIndex(0);
            // Notify parent that focus should be completely cleared
            if (onFocusChange) {
              onFocusChange(false);
            }
            if (onFocusReturn) {
              onFocusReturn();
            }
            break;
          default:
            // If user types any character, return focus to textarea
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
              setIsFocused(false);
              setActiveIndex(-1);
              setStartIndex(0);
              if (onFocusReturn) {
                onFocusReturn();
              }
            }
            break;
        }
      },
      [isFocused, handleComponentSelection, onFocusReturn],
    );

    // Reset active index when results change
    useEffect(() => {
      if (activeIndex >= allAvailableResults.length) {
        setActiveIndex(allAvailableResults.length > 0 ? 0 : -1);
        setStartIndex(0); // Reset window to beginning
      }
    }, [allAvailableResults.length, activeIndex]);

    // Auto-set activeIndex when results appear and component is focused
    useEffect(() => {
      if (
        isFocused &&
        allAvailableResults.length > 0 &&
        activeIndex === -1 &&
        isFirstAppearance
      ) {
        // Wait for animation to complete before setting activeIndex
        const totalAnimationTime =
          (Math.min(allAvailableResults.length, 3) - 1) * 50 + 200;
        const timer = setTimeout(() => {
          setActiveIndex(0);
        }, totalAnimationTime);
        return () => clearTimeout(timer);
      } else if (
        isFocused &&
        allAvailableResults.length > 0 &&
        activeIndex === -1 &&
        !isFirstAppearance
      ) {
        // If no animation, set immediately
        setActiveIndex(0);
      }
    }, [isFocused, allAvailableResults.length, activeIndex, isFirstAppearance]);

    // Add keyboard listeners
    useEffect(() => {
      if (isFocused) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [isFocused, handleKeyDown]);

    const handleContainerFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleContainerBlur = useCallback(() => {
      setTimeout(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          setIsFocused(false);
          setActiveIndex(-1);
          setStartIndex(0);
        }
      }, 100);
    }, []);

    // Reset activeIndex and startIndex when focus is lost
    useEffect(() => {
      if (!isFocused) {
        setActiveIndex(-1);
        setStartIndex(0);
        // Reset first appearance for next time results are shown
        if (allAvailableResults.length === 0) {
          setIsFirstAppearance(true);
        }
      }
    }, [isFocused, allAvailableResults.length]);

    // Notify parent about focus changes
    useEffect(() => {
      if (onFocusChange) {
        onFocusChange(isFocused, activeResult);
      }
    }, [isFocused, activeResult, onFocusChange]);

    if (error) {
      return (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-destructive text-xs">
          Search error: {error}
        </div>
      );
    }

    // Only hide if we're not loading AND have no results AND no search query
    if (!isLoading && results.length === 0 && !searchQuery?.trim()) {
      return null;
    }

    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        className="space-y-3 outline-none"
      >
        {/* Preview section at the top */}
        {activeResult &&
          (activeResult.preview_url || activeResult.video_url) && (
            <div
              className={`flex justify-center transition-all duration-200 ease-out ${
                isFirstAppearance
                  ? 'translate-y-1 scale-98 opacity-0 blur-sm'
                  : 'translate-y-0 scale-100 opacity-100 blur-0'
              }`}
            >
              <div className="flex h-[150px] w-[200px] items-center justify-center overflow-hidden rounded-lg border border-border bg-background shadow-md transition-shadow duration-150">
                {activeResult.video_url ? (
                  <video
                    src={activeResult.video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <img
                    src={activeResult.preview_url}
                    alt={`Preview for ${activeResult.component_data.name || activeResult.name}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                )}
              </div>
            </div>
          )}

        {visibleResults.length > 0 ? (
          <div className="space-y-2">
            {/* Search Results Section - Scrollable window of 3 cards */}
            <div className="space-y-1">
              <div ref={scrollContainerRef} className="space-y-1">
                {visibleResults.map((result, index) => {
                  // Calculate the actual index in all results
                  const actualIndex = startIndex + index;
                  const isItemFocused =
                    isFocused && activeIndex === actualIndex;

                  return (
                    <div
                      key={result.id}
                      className={`transition-all duration-200 ease-out ${
                        isFirstAppearance
                          ? 'translate-y-1 scale-98 opacity-0 blur-sm'
                          : 'translate-y-0 scale-100 opacity-100 blur-0'
                      }`}
                      style={{
                        transitionDelay: isFirstAppearance
                          ? `${index * 50}ms`
                          : '0ms',
                      }}
                    >
                      <MiniComponentCard
                        result={result}
                        isSelected={false}
                        isFocused={isItemFocused}
                        onSelectionChange={handleComponentSelection}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-1 py-1">
                {allAvailableResults.length > 0 && (
                  <div
                    className={`text-muted-foreground text-xs transition-all duration-200 ease-out ${
                      isFirstAppearance
                        ? 'translate-y-1 scale-98 opacity-0 blur-sm'
                        : 'translate-y-0 scale-100 opacity-100 blur-0'
                    }`}
                    style={{
                      transitionDelay: isFirstAppearance
                        ? `${visibleResults.length * 50 + 50}ms`
                        : '0ms',
                    }}
                  >
                    {activeIndex >= 0 ? activeIndex + 1 : 1} of{' '}
                    {allAvailableResults.length}
                    {isFocused && activeIndex >= 0 && (
                      <span className="ml-1 text-primary">
                        •{' '}
                        {allAvailableResults[activeIndex].component_data.name ||
                          allAvailableResults[activeIndex].name}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`ml-auto text-primary text-xs transition-all duration-200 ease-out ${
                    isFirstAppearance
                      ? 'translate-y-1 scale-98 opacity-0 blur-sm'
                      : 'translate-y-0 scale-100 opacity-100 blur-0'
                  }`}
                  style={{
                    transitionDelay: isFirstAppearance
                      ? `${visibleResults.length * 50 + 100}ms`
                      : '0ms',
                  }}
                >
                  ↑↓ navigate
                </div>
              </div>
            </div>
          </div>
        ) : searchQuery?.trim() && !isLoading ? (
          <div className="space-y-1">
            <div className="px-1 py-2 text-muted-foreground text-xs">
              No components found for "{searchQuery}"
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
