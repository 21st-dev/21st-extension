import { useState, useEffect, useCallback } from 'preact/hooks';
import { SearchIcon, BookOpenIcon, CheckIcon, LoaderIcon } from 'lucide-react';
import { cn } from '@/utils';

interface Library {
  id: string;
  title: string;
  description: string;
  totalSnippets: number;
  trustScore: number;
  versions?: string[];
}

interface DocsSearchProps {
  onAddToPrompt: (content: string) => void;
  onClose: () => void;
}

export function DocsSearch({ onAddToPrompt, onClose }: DocsSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Search libraries using Context7 API
  const searchLibraries = useCallback(async (query: string) => {
    if (!query.trim()) {
      setLibraries([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://context7.com/api/v1/search?query=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setLibraries(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setLibraries([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fetch documentation for a library
  const fetchDocumentation = useCallback(
    async (library: Library) => {
      setIsFetchingDocs(true);
      setError(null);

      try {
        const libraryId = library.id.startsWith('/')
          ? library.id.slice(1)
          : library.id;
        const response = await fetch(
          `https://context7.com/api/v1/${libraryId}?tokens=1000&type=txt`,
        );

        if (!response.ok) {
          throw new Error(`Documentation fetch failed: ${response.status}`);
        }

        const docs = await response.text();

        if (docs.includes('No code snippets available')) {
          throw new Error('No documentation available for this library');
        }

        // Format the documentation for the prompt
        const formattedDocs = `📚 ${library.title} Documentation\n\n${docs}`;
        onAddToPrompt(formattedDocs);
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch documentation',
        );
      } finally {
        setIsFetchingDocs(false);
      }
    },
    [onAddToPrompt, onClose],
  );

  // Handle search input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLibraries(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchLibraries]);

  // Reset active index when libraries change
  useEffect(() => {
    setActiveIndex(0);
  }, [libraries.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (libraries.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % libraries.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(
            (prev) => (prev - 1 + libraries.length) % libraries.length,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < libraries.length) {
            fetchDocumentation(libraries[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [libraries, activeIndex, fetchDocumentation, onClose]);

  return (
    <div className="min-w-[300px] max-w-[400px] space-y-3 rounded-[12px] border border-border bg-background p-3 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Documentation Search</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for libraries (e.g., react, vue, next.js)"
          className="w-full rounded-md border border-border bg-background py-2 pr-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          autoFocus
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-red-500 text-xs dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <LoaderIcon className="h-4 w-4 animate-spin" />
          Searching documentation...
        </div>
      )}

      {/* Fetching Docs State */}
      {isFetchingDocs && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <LoaderIcon className="h-4 w-4 animate-spin" />
          Fetching documentation...
        </div>
      )}

      {/* Results */}
      {libraries.length > 0 && !isSearching && !isFetchingDocs && (
        <div className="max-h-[300px] space-y-1 overflow-y-auto">
          {libraries.map((library, index) => (
            <button
              key={library.id}
              type="button"
              className={cn(
                'w-full rounded-md p-2 text-left text-sm transition-colors',
                index === activeIndex
                  ? 'bg-zinc-200 dark:bg-zinc-800'
                  : 'hover:bg-muted',
              )}
              onClick={() => fetchDocumentation(library)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">
                    {library.title}
                  </div>
                  <div className="truncate text-muted-foreground text-xs">
                    {library.description}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-green-600 text-xs dark:text-green-400">
                      {library.totalSnippets} snippets
                    </span>
                    <span className="text-blue-600 text-xs dark:text-blue-400">
                      Trust: {library.trustScore}/10
                    </span>
                  </div>
                </div>
                <CheckIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {searchQuery && libraries.length === 0 && !isSearching && !error && (
        <div className="py-4 text-center text-muted-foreground text-sm">
          No libraries found for "{searchQuery}"
        </div>
      )}

      {/* Instructions */}
      {!searchQuery && (
        <div className="text-muted-foreground text-xs">
          Search for any library or framework to get up-to-date documentation
        </div>
      )}
    </div>
  );
}
