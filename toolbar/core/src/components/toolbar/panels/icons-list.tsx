import { cn } from '@/utils';
import { forwardRef } from 'preact/compat';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import * as LucideIcons from 'lucide-react';

// Recent icons storage utilities
const RECENT_ICONS_KEY = '21st-toolbar-recent-icons';
const MAX_RECENT_ICONS = 5;

function getRecentIcons(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_ICONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentIcon(iconName: string) {
  try {
    const recent = getRecentIcons();
    const filtered = recent.filter((name) => name !== iconName);
    const updated = [iconName, ...filtered].slice(0, MAX_RECENT_ICONS);
    localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

interface IconsListProps {
  searchQuery?: string;
  onIconSelection?: (iconName: string) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (isFocused: boolean, activeIcon?: string) => void;
  onCloseIcons?: () => void;
  onReady?: () => void;
}

export interface IconsListRef {
  focusOnIcons: () => void;
  selectActiveIcon: () => boolean;
}

// Build icons array once
const allIconNames: string[] = Object.keys(LucideIcons).filter((key) => {
  // Exclude non-component exports if any
  // lucide-react exports IconNode types etc. We keep only components with capital first letter and length > 0
  return typeof (LucideIcons as any)[key] === 'function' && /^[A-Z]/.test(key);
});

export const IconsList = forwardRef<IconsListRef, IconsListProps>(
  (
    {
      searchQuery,
      onIconSelection,
      onFocusReturn,
      onFocusChange,
      onCloseIcons,
      onReady,
    },
    ref,
  ) => {
    // Keyboard navigation state
    const [activeIndex, setActiveIndex] = useState(-1);
    const [startIndex, setStartIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Recent icons state
    const [recentIcons, setRecentIcons] = useState<string[]>([]);

    // Load recent icons on mount
    useEffect(() => {
      setRecentIcons(getRecentIcons());
    }, []);

    // Filter icons by query
    const filteredIcons = useMemo(() => {
      if (!searchQuery?.trim()) {
        // No search query - show recent icons first, then all others
        const validRecentIcons = recentIcons.filter((name) =>
          allIconNames.includes(name),
        );
        const remainingIcons = allIconNames.filter(
          (name) => !validRecentIcons.includes(name),
        );
        return [...validRecentIcons, ...remainingIcons];
      }
      const q = searchQuery.toLowerCase();

      // Split into two groups: starts with query, and contains query
      const startsWith: string[] = [];
      const contains: string[] = [];

      for (const name of allIconNames) {
        const lowerName = name.toLowerCase();
        if (lowerName.startsWith(q)) {
          startsWith.push(name);
        } else if (lowerName.includes(q)) {
          contains.push(name);
        }
      }

      // Return startsWith first, then contains
      return [...startsWith, ...contains];
    }, [searchQuery, recentIcons]);

    // Reset activeIndex when search results change (copied from bookmarks-list)
    useEffect(() => {
      if (activeIndex >= filteredIcons.length && filteredIcons.length > 0) {
        // If current index is beyond results, set to last item
        setActiveIndex(filteredIcons.length - 1);
        setStartIndex(Math.max(0, filteredIcons.length - 3));
      } else if (filteredIcons.length === 0 && activeIndex !== -1) {
        // If no results, reset index
        setActiveIndex(-1);
        setStartIndex(0);
      }
    }, [filteredIcons.length, activeIndex]);

    // Auto-set activeIndex when icons appear and component is focused (copied from bookmarks-list)
    useEffect(() => {
      if (isFocused && filteredIcons.length > 0 && activeIndex === -1) {
        // Set active index only if there isn't one
        setActiveIndex(0);
        setStartIndex(0);
      }
    }, [isFocused, filteredIcons.length, activeIndex]);

    // Reset activeIndex when losing focus (copied from bookmarks-list)
    useEffect(() => {
      if (!isFocused) {
        setActiveIndex(-1);
        setStartIndex(0);
      }
    }, [isFocused]);

    // Visible window of 3 icons
    const visibleIcons = useMemo(() => {
      return filteredIcons.slice(startIndex, startIndex + 3);
    }, [filteredIcons, startIndex]);

    const activeIconName = useMemo(() => {
      if (isFocused && activeIndex >= 0 && activeIndex < filteredIcons.length) {
        return filteredIcons[activeIndex];
      }
      return null;
    }, [isFocused, activeIndex, filteredIcons]);

    // Notify ready immediately
    useEffect(() => {
      onReady?.();
    }, [onReady]);

    const handleIconSelection = useCallback(
      (iconName: string) => {
        // Save to recent icons
        saveRecentIcon(iconName);
        setRecentIcons(getRecentIcons());

        onIconSelection?.(iconName);
        if (onCloseIcons) {
          setTimeout(() => onCloseIcons(), 100);
        }
      },
      [onIconSelection, onCloseIcons],
    );

    // Expose methods (copied from bookmarks-list)
    useImperativeHandle(
      ref,
      () => ({
        focusOnIcons: () => {
          if (!isFocused) {
            setIsFocused(true);
            setActiveIndex(filteredIcons.length > 0 ? 0 : -1);
            setStartIndex(0);
            containerRef.current?.focus();
          }
        },
        selectActiveIcon: () => {
          if (
            isFocused &&
            activeIndex >= 0 &&
            activeIndex < filteredIcons.length
          ) {
            const activeIcon = filteredIcons[activeIndex];
            handleIconSelection(activeIcon);
            return true;
          }
          return false;
        },
      }),
      [filteredIcons, isFocused, activeIndex, handleIconSelection],
    );

    // Keyboard navigation (copied from bookmarks-list)
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!isFocused || filteredIcons.length === 0) {
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setActiveIndex((prev) => {
              const nextIndex = prev + 1;
              const newIndex = nextIndex < filteredIcons.length ? nextIndex : 0;

              // Update startIndex to keep active element visible
              setStartIndex((currentStart) => {
                if (newIndex === 0) {
                  return 0; // Wrapped to beginning
                } else if (newIndex >= currentStart + 3) {
                  return Math.min(newIndex - 2, filteredIcons.length - 3); // Scroll down
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setActiveIndex((prev) => {
              const newIndex = prev > 0 ? prev - 1 : filteredIcons.length - 1;

              // Update startIndex to keep active element visible
              setStartIndex((currentStart) => {
                if (newIndex === filteredIcons.length - 1) {
                  return Math.max(0, filteredIcons.length - 3); // Wrapped to end
                } else if (newIndex < currentStart) {
                  return Math.max(0, newIndex); // Scroll up
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < filteredIcons.length) {
              const activeIcon = filteredIcons[activeIndex];
              handleIconSelection(activeIcon);
              setTimeout(() => {
                setIsFocused(false);
                setActiveIndex(-1);
                setStartIndex(0);
                if (onCloseIcons) {
                  onCloseIcons();
                }
                if (onFocusReturn) {
                  onFocusReturn();
                }
              }, 100);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsFocused(false);
            setActiveIndex(-1);
            setStartIndex(0);
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
      [
        isFocused,
        filteredIcons.length,
        activeIndex,
        handleIconSelection,
        onFocusReturn,
        onFocusChange,
        onCloseIcons,
      ],
    );

    // Add keyboard listeners when focused (copied from bookmarks-list)
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

    // Notify focus change
    useEffect(() => {
      onFocusChange?.(isFocused, activeIconName || undefined);
    }, [isFocused, activeIconName, onFocusChange]);

    const IconComponent = activeIconName
      ? (LucideIcons as any)[activeIconName]
      : null;

    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        className="space-y-3 outline-none"
      >
        {/* Preview */}
        {IconComponent && (
          <div className="flex justify-center">
            <IconComponent className="h-12 w-12 text-foreground" />
          </div>
        )}

        {visibleIcons.length > 0 ? (
          <div className="space-y-2">
            {/* Recent used section */}
            {!searchQuery?.trim() &&
              recentIcons.length > 0 &&
              startIndex === 0 && (
                <div className="px-1 py-1">
                  <div className="text-muted-foreground text-xs">
                    Recent used
                  </div>
                </div>
              )}

            {visibleIcons.map((iconName, idx) => {
              const Comp = (LucideIcons as any)[iconName];
              const isItemFocused =
                isFocused && activeIndex === startIndex + idx;
              const isRecentIcon =
                !searchQuery?.trim() && recentIcons.includes(iconName);

              return (
                <button
                  key={iconName}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors',
                    isItemFocused
                      ? 'border-border bg-background ring-2 ring-muted-foreground'
                      : 'border-border bg-background hover:border-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => handleIconSelection(iconName)}
                >
                  <Comp className="h-4 w-4" />
                  <span className="truncate font-medium text-foreground">
                    {iconName}
                  </span>
                  {isRecentIcon && (
                    <span className="ml-auto text-muted-foreground text-xs">
                      recent
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex items-center justify-between px-1 py-1">
              {filteredIcons.length > 0 && (
                <div className="text-muted-foreground text-xs">
                  {activeIndex >= 0 ? activeIndex + 1 : 1} of{' '}
                  {filteredIcons.length}
                </div>
              )}
              <div className="ml-auto text-primary text-xs">↑↓ navigate</div>
            </div>
          </div>
        ) : (
          <div className="px-1 py-2 text-muted-foreground text-xs">
            {searchQuery?.trim()
              ? `No icons found for "${searchQuery}"`
              : 'No icons found'}
          </div>
        )}
      </div>
    );
  },
);
