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
import { Loader } from 'lucide-react';

export interface DocsItem {
  id: string;
  title: string;
  description: string;
  category: 'popular' | 'recent';
}

interface DocsListProps {
  searchQuery?: string;
  onDocSelection?: (item: DocsItem) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (isFocused: boolean, activeDoc?: DocsItem) => void;
  onCloseDocs?: () => void;
  onReady?: () => void;
}

export interface DocsListRef {
  focusOnDocs: () => void;
  selectActiveDoc: () => boolean;
}

// Popular frameworks and libraries (expanded list)
const POPULAR_DOCS: DocsItem[] = [
  // Frontend Frameworks
  {
    id: '/reactjs/react.dev',
    title: 'React',
    description: 'A JavaScript library for building user interfaces',
    category: 'popular',
  },
  {
    id: '/vuejs/docs',
    title: 'Vue',
    description: 'The Progressive JavaScript Framework',
    category: 'popular',
  },
  {
    id: '/angular/angular',
    title: 'Angular',
    description: 'Platform for building mobile and desktop web applications',
    category: 'popular',
  },
  {
    id: '/sveltejs/kit',
    title: 'Svelte',
    description: 'Cybernetically enhanced web apps',
    category: 'popular',
  },
  // Meta Frameworks
  {
    id: '/vercel/next.js',
    title: 'Next.js',
    description: 'The React Framework for Production',
    category: 'popular',
  },
  {
    id: '/nuxt/nuxt',
    title: 'Nuxt',
    description: 'The Intuitive Vue Framework',
    category: 'popular',
  },
  {
    id: '/remix-run/remix',
    title: 'Remix',
    description: 'Full stack web framework focused on web standards',
    category: 'popular',
  },
  // Build Tools
  {
    id: '/vitejs/vite',
    title: 'Vite',
    description: 'Next generation frontend tooling',
    category: 'popular',
  },
  {
    id: '/webpack/webpack',
    title: 'Webpack',
    description: 'Module bundler for modern JavaScript applications',
    category: 'popular',
  },
  {
    id: '/esbuild/esbuild',
    title: 'ESBuild',
    description: 'Extremely fast JavaScript bundler',
    category: 'popular',
  },
  // Backend & Server
  {
    id: '/expressjs/express',
    title: 'Express',
    description: 'Fast, unopinionated, minimalist web framework for Node.js',
    category: 'popular',
  },
  {
    id: '/nestjs/nest',
    title: 'NestJS',
    description: 'Progressive Node.js framework for building server-side apps',
    category: 'popular',
  },
  {
    id: '/fastify/fastify',
    title: 'Fastify',
    description: 'Fast and low overhead web framework for Node.js',
    category: 'popular',
  },
  // Styling
  {
    id: '/tailwindlabs/tailwindcss',
    title: 'Tailwind CSS',
    description: 'A utility-first CSS framework',
    category: 'popular',
  },
  {
    id: '/styled-components/styled-components',
    title: 'Styled Components',
    description: 'CSS-in-JS styling for React components',
    category: 'popular',
  },
  {
    id: '/emotion-js/emotion',
    title: 'Emotion',
    description: 'CSS-in-JS library for styling React applications',
    category: 'popular',
  },
  // Languages & Tools
  {
    id: '/microsoft/typescript',
    title: 'TypeScript',
    description: 'TypeScript extends JavaScript by adding types',
    category: 'popular',
  },
  {
    id: '/eslint/eslint',
    title: 'ESLint',
    description: 'Find and fix problems in JavaScript code',
    category: 'popular',
  },
  {
    id: '/prettier/prettier',
    title: 'Prettier',
    description: 'Opinionated code formatter',
    category: 'popular',
  },
  // Testing
  {
    id: '/jestjs/jest',
    title: 'Jest',
    description: 'JavaScript testing framework',
    category: 'popular',
  },
  {
    id: '/vitest-dev/vitest',
    title: 'Vitest',
    description: 'Blazing fast unit testing framework',
    category: 'popular',
  },
  {
    id: '/testing-library/react-testing-library',
    title: 'React Testing Library',
    description: 'Testing utilities for React components',
    category: 'popular',
  },
  // Databases & ORM
  {
    id: '/prisma/prisma',
    title: 'Prisma',
    description: 'Database toolkit for TypeScript and Node.js',
    category: 'popular',
  },
  {
    id: '/drizzle-team/drizzle-orm',
    title: 'Drizzle ORM',
    description: 'TypeScript ORM for SQL databases',
    category: 'popular',
  },
  // State Management
  {
    id: '/reduxjs/redux',
    title: 'Redux',
    description: 'Predictable state container for JavaScript apps',
    category: 'popular',
  },
  {
    id: '/pmndrs/zustand',
    title: 'Zustand',
    description: 'Small, fast, and scalable state management',
    category: 'popular',
  },
  // Package Managers
  {
    id: '/pnpm/pnpm',
    title: 'pnpm',
    description: 'Fast, disk space efficient package manager',
    category: 'popular',
  },
  {
    id: '/yarnpkg/yarn',
    title: 'Yarn',
    description: 'Fast, reliable, and secure dependency management',
    category: 'popular',
  },
];

const RECENT_DOCS_KEY = 'toolbar-docs-recent';

// Helper functions for localStorage
const getRecentDocs = (): DocsItem[] => {
  try {
    const stored = localStorage.getItem(RECENT_DOCS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToRecentDocs = (item: DocsItem) => {
  try {
    const recent = getRecentDocs();
    // Remove if already exists
    const filtered = recent.filter((doc) => doc.id !== item.id);
    // Add to beginning with recent category
    const updatedRecent = [
      { ...item, category: 'recent' as const },
      ...filtered,
    ].slice(0, 5);
    localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(updatedRecent));
  } catch (error) {
    console.warn('Failed to save recent docs:', error);
  }
};

export const DocsList = forwardRef<DocsListRef, DocsListProps>(
  (
    {
      searchQuery,
      onDocSelection,
      onFocusReturn,
      onFocusChange,
      onCloseDocs,
      onReady,
    },
    ref,
  ) => {
    const [recentDocs, setRecentDocs] = useState<DocsItem[]>([]);
    const [searchResults, setSearchResults] = useState<DocsItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Load recent docs on mount
    useEffect(() => {
      setRecentDocs(getRecentDocs());
    }, []);

    // Hybrid search: local first, then API
    useEffect(() => {
      if (!searchQuery?.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      const searchTimeout = setTimeout(async () => {
        setIsSearching(true);
        setSearchError(null);

        try {
          const query = searchQuery.trim().toLowerCase();

          // Step 1: Quick local search first
          const allSearchableDocs = [...POPULAR_DOCS, ...recentDocs];
          const localResults = allSearchableDocs.filter((doc) => {
            const titleMatch =
              doc.title?.toLowerCase().includes(query) || false;
            const descriptionMatch =
              doc.description?.toLowerCase().includes(query) || false;
            const idMatch = doc.id?.toLowerCase().includes(query) || false;

            return titleMatch || descriptionMatch || idMatch;
          });

          // Show local results immediately
          setSearchResults(localResults);

          // Step 2: Try to fetch from Context7 API (non-blocking)
          try {
            const response = await fetch(
              `https://api.allorigins.win/get?url=${encodeURIComponent(
                `https://context7.com/api/v1/search?query=${encodeURIComponent(searchQuery.trim())}`,
              )}`,
              {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
                signal: AbortSignal.timeout(5000), // 5 second timeout
              },
            );

            if (response.ok) {
              const proxyData = await response.json();
              const data = JSON.parse(proxyData.contents);

              // Convert API results to DocsItem format
              const apiResults: DocsItem[] = (data.results || []).map(
                (item: any) => ({
                  id: item.id || `api-${Math.random()}`,
                  title:
                    item.title ||
                    item.name ||
                    item.id?.split('/').pop() ||
                    'Unknown',
                  description:
                    item.description ||
                    `Documentation for ${item.title || item.name || 'Unknown'}`,
                  category: 'popular' as const,
                }),
              );

              // Combine local and API results, remove duplicates
              const combinedResults = [...localResults, ...apiResults];
              const uniqueResults = combinedResults.filter(
                (doc, index, self) =>
                  index === self.findIndex((d) => d.id === doc.id),
              );

              // Sort results: exact title matches first, then partial matches
              const sortedResults = uniqueResults.sort((a, b) => {
                const aExactTitle = a.title?.toLowerCase() === query;
                const bExactTitle = b.title?.toLowerCase() === query;

                if (aExactTitle && !bExactTitle) return -1;
                if (!aExactTitle && bExactTitle) return 1;

                const aTitleStarts = a.title?.toLowerCase().startsWith(query);
                const bTitleStarts = b.title?.toLowerCase().startsWith(query);

                if (aTitleStarts && !bTitleStarts) return -1;
                if (!aTitleStarts && bTitleStarts) return 1;

                return a.title?.localeCompare(b.title || '') || 0;
              });

              setSearchResults(sortedResults);
            }
          } catch (apiError) {
            // API failed, but we already have local results - no need to show error
            console.warn(
              'Context7 API search failed, using local results only:',
              apiError,
            );
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchError('Search failed');
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms debounce for API requests

      return () => clearTimeout(searchTimeout);
    }, [searchQuery, recentDocs]);

    // Combine popular and recent docs (only when no search query)
    const allDocs = useMemo(() => {
      // Recent docs first, then popular (excluding duplicates)
      const recentIds = new Set(recentDocs.map((doc) => doc.id));
      const popularFiltered = POPULAR_DOCS.filter(
        (doc) => !recentIds.has(doc.id),
      );
      return [...recentDocs, ...popularFiltered];
    }, [recentDocs]);

    // Use search results from API if searching, otherwise use local docs
    const filteredDocs = useMemo(() => {
      if (searchQuery?.trim()) {
        // When searching, use API results
        return searchResults;
      } else {
        // When no search, show local popular + recent docs
        return allDocs;
      }
    }, [searchQuery, searchResults, allDocs]);

    // Keyboard navigation state
    const [activeIndex, setActiveIndex] = useState(-1);
    const [startIndex, setStartIndex] = useState(0); // Start of the visible window
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Show 3 docs starting from startIndex (like bookmarks-list)
    const visibleDocs = useMemo(() => {
      return filteredDocs.slice(startIndex, startIndex + 3);
    }, [filteredDocs, startIndex]);

    // Reset activeIndex when search results change
    useEffect(() => {
      if (activeIndex >= filteredDocs.length && filteredDocs.length > 0) {
        setActiveIndex(filteredDocs.length - 1);
        setStartIndex(Math.max(0, filteredDocs.length - 3));
      } else if (filteredDocs.length === 0 && activeIndex !== -1) {
        setActiveIndex(-1);
        setStartIndex(0);
      }
    }, [filteredDocs.length, activeIndex]);

    // Auto-set activeIndex when docs appear and component is focused
    useEffect(() => {
      if (isFocused && filteredDocs.length > 0 && activeIndex === -1) {
        setActiveIndex(0);
        setStartIndex(0);
      }
    }, [isFocused, filteredDocs.length, activeIndex]);

    // Reset activeIndex when losing focus
    useEffect(() => {
      if (!isFocused) {
        setActiveIndex(-1);
        setStartIndex(0);
      }
    }, [isFocused]);

    const activeDoc = useMemo(() => {
      if (isFocused && activeIndex >= 0 && activeIndex < filteredDocs.length) {
        return filteredDocs[activeIndex];
      }
      return null;
    }, [isFocused, activeIndex, filteredDocs]);

    // Notify ready immediately
    useEffect(() => {
      onReady?.();
    }, [onReady]);

    const handleDocSelection = useCallback(
      (item: DocsItem) => {
        // Add to recent docs
        addToRecentDocs(item);
        setRecentDocs(getRecentDocs());

        onDocSelection?.(item);
        if (onCloseDocs) {
          setTimeout(() => onCloseDocs(), 100);
        }
      },
      [onDocSelection, onCloseDocs],
    );

    // Expose methods
    useImperativeHandle(
      ref,
      () => ({
        focusOnDocs: () => {
          if (!isFocused) {
            setIsFocused(true);
            setActiveIndex(filteredDocs.length > 0 ? 0 : -1);
            setStartIndex(0);
            containerRef.current?.focus();
          }
        },
        selectActiveDoc: () => {
          if (
            isFocused &&
            activeIndex >= 0 &&
            activeIndex < filteredDocs.length
          ) {
            const activeDocItem = filteredDocs[activeIndex];
            handleDocSelection(activeDocItem);
            return true;
          }
          return false;
        },
      }),
      [filteredDocs, isFocused, activeIndex, handleDocSelection],
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!isFocused || filteredDocs.length === 0) {
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setActiveIndex((prev) => {
              const nextIndex = prev + 1;
              const newIndex = nextIndex < filteredDocs.length ? nextIndex : 0;

              // Update startIndex to keep active element visible (like bookmarks-list)
              setStartIndex((currentStart) => {
                if (newIndex === 0) {
                  return 0; // Wrapped to beginning
                } else if (newIndex >= currentStart + 3) {
                  return Math.min(newIndex - 2, filteredDocs.length - 3); // Scroll down
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setActiveIndex((prev) => {
              const newIndex = prev > 0 ? prev - 1 : filteredDocs.length - 1;

              // Update startIndex to keep active element visible (like bookmarks-list)
              setStartIndex((currentStart) => {
                if (newIndex === filteredDocs.length - 1) {
                  return Math.max(0, filteredDocs.length - 3); // Wrapped to end
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
            if (activeIndex >= 0 && activeIndex < filteredDocs.length) {
              const activeDocItem = filteredDocs[activeIndex];
              handleDocSelection(activeDocItem);
              setTimeout(() => {
                setIsFocused(false);
                setActiveIndex(-1);
                setStartIndex(0);
                if (onCloseDocs) {
                  onCloseDocs();
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
        filteredDocs.length,
        activeIndex,
        handleDocSelection,
        onFocusReturn,
        onFocusChange,
        onCloseDocs,
      ],
    );

    // Add keyboard listeners when focused
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
      onFocusChange?.(isFocused, activeDoc);
    }, [isFocused, activeDoc, onFocusChange]);

    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        className="space-y-3 outline-none"
      >
        {/* Preview */}
        {activeDoc && (
          <div className="flex justify-center">
            <div className="max-w-[280px] space-y-2 rounded-md border border-border bg-muted p-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-sm">
                  {activeDoc.title}
                </span>
                {activeDoc.category === 'recent' && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-300">
                    Recent
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {activeDoc.description}
              </p>
            </div>
          </div>
        )}

        {isSearching ? (
          <div className="flex items-center justify-center p-4">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-muted-foreground text-xs">
              Searching documentation...
            </span>
          </div>
        ) : searchError ? (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-destructive text-xs">
            Search error: {searchError}
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="space-y-1">
            {/* Show category headers only for local docs (when not searching) */}
            {!searchQuery?.trim() && (
              <>
                {/* Show Recent header only if there are visible recent docs */}
                {visibleDocs.some((doc) => doc.category === 'recent') && (
                  <div className="px-1 font-medium text-muted-foreground text-xs">
                    Recent
                  </div>
                )}
                {/* Show Popular header only if there are visible popular docs */}
                {visibleDocs.some((doc) => doc.category === 'popular') && (
                  <div
                    className={cn(
                      'px-1 font-medium text-muted-foreground text-xs',
                      visibleDocs.some((doc) => doc.category === 'recent') &&
                        'mt-2',
                    )}
                  >
                    Popular
                  </div>
                )}
              </>
            )}

            {visibleDocs.map((doc, idx) => {
              const isItemFocused =
                isFocused && activeIndex === startIndex + idx;
              return (
                <button
                  key={doc.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors',
                    isItemFocused
                      ? 'border-border bg-background ring-2 ring-muted-foreground'
                      : 'border-border bg-background hover:border-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => handleDocSelection(doc)}
                >
                  <span className="truncate font-medium text-foreground">
                    {doc.title}
                  </span>
                  {doc.category === 'recent' && !searchQuery?.trim() && (
                    <span className="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-300">
                      Recent
                    </span>
                  )}
                </button>
              );
            })}

            <div className="flex items-center justify-between px-1 py-1">
              {filteredDocs.length > 0 && (
                <div className="text-muted-foreground text-xs">
                  {searchQuery?.trim() ? (
                    <>
                      Found {filteredDocs.length} docs •{' '}
                      {activeIndex >= 0 ? activeIndex + 1 : 1} of{' '}
                      {filteredDocs.length}
                    </>
                  ) : (
                    <>
                      {activeIndex >= 0 ? activeIndex + 1 : 1} of{' '}
                      {filteredDocs.length}
                    </>
                  )}
                </div>
              )}
              <div className="ml-auto text-primary text-xs">
                ↑↓ navigate • ⏎ select
              </div>
            </div>
          </div>
        ) : (
          <div className="px-1 py-2 text-muted-foreground text-xs">
            {searchQuery?.trim()
              ? `No documentation found for "${searchQuery}"`
              : 'No documentation found'}
          </div>
        )}
      </div>
    );
  },
);

DocsList.displayName = 'DocsList';
