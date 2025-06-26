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
          ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
          : isFocused
            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-400'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={handleClick}
    >
      {/* Mini preview image */}
      <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
        {result.preview_url ? (
          <img
            src={result.preview_url}
            alt={componentName}
            className="h-full w-full rounded border border-gray-200 object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full rounded border border-gray-200 bg-gray-100" />
        )}
      </div>

      {/* Component name only */}
      <span
        className={`flex-1 truncate text-left font-medium ${
          isSelected
            ? 'text-blue-900'
            : isFocused
              ? 'text-blue-800'
              : 'text-gray-900'
        }`}
      >
        {componentName || 'Unknown'}
      </span>

      {/* Checkbox */}
      <div className="flex h-3 w-3 flex-shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
          className="h-3 w-3 cursor-pointer rounded border-gray-300 bg-gray-100 text-blue-600"
          onClick={(e) => e.stopPropagation()}
        />
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
        }, totalAnimationTime);

        return () => clearTimeout(timer);
      }
    }, [visibleResults.length, isFirstAppearance]);

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
      },
      [onComponentSelection],
    );

    // Expose methods to parent
    useImperativeHandle(
      ref,
      () => ({
        focusOnResults: () => {
          if (allAvailableResults.length > 0 && !isFocused) {
            setIsFocused(true);
            setActiveIndex(0);
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
                // Return focus to textarea after selection
                setTimeout(() => {
                  setIsFocused(false);
                  setActiveIndex(-1);
                  setStartIndex(0);
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
            e.stopPropagation(); // Prevent toolbar from closing
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
        <div className="rounded border border-red-200/50 bg-red-50/50 p-2 text-red-500 text-xs">
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
        {activeResult && activeResult.preview_url && (
          <div
            className={`flex justify-center transition-all duration-200 ease-out ${
              isFirstAppearance
                ? 'translate-y-1 scale-98 opacity-0 blur-sm'
                : 'translate-y-0 scale-100 opacity-100 blur-0'
            }`}
          >
            <div
              style={{
                position: 'relative',
                display: 'block',
                overflow: 'hidden',
                borderRadius: '0.5rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow:
                  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                width: 200,
                height: 150,
                transition: 'box-shadow 0.15s ease-in-out',
              }}
            >
              <img
                src={activeResult.preview_url}
                alt={`Preview for ${activeResult.component_data.name || activeResult.name}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                  display: 'block',
                }}
              />
              <div className="absolute right-1 bottom-1 left-1 rounded bg-black/75 px-2 py-1 text-white text-xs backdrop-blur-sm">
                {activeResult.component_data.name || activeResult.name}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="fade-in animate-in space-y-1 duration-200">
            <div className="flex items-center gap-3 px-1 py-2">
              <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <TextShimmer
                duration={1.5}
                className="font-medium text-sm [--base-color:theme(colors.gray.600)] [--base-gradient-color:theme(colors.blue.600)]"
              >
                Searching components...
              </TextShimmer>
            </div>
          </div>
        ) : visibleResults.length > 0 ? (
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
                {allAvailableResults.length > 3 && (
                  <div className="text-gray-500 text-xs">
                    {startIndex + 1}-
                    {Math.min(startIndex + 3, allAvailableResults.length)} of{' '}
                    {allAvailableResults.length}
                  </div>
                )}
                <div className="ml-auto text-blue-600 text-xs">
                  ↓ focus • ↑↓ navigate • ⏎ select • ⎋ close
                </div>
              </div>
            </div>
          </div>
        ) : searchQuery?.trim() ? (
          <div className="space-y-1">
            <div className="px-1 py-2 text-gray-500 text-xs">
              No components found for "{searchQuery}"
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
