import { useState, useEffect, useCallback } from 'preact/hooks';
import type { SVGLogo } from '@/types/svgl';

interface UseSVGLSearchResult {
  results: SVGLogo[];
  isLoading: boolean;
  error: string | null;
}

let allLogosCache: SVGLogo[] | null = null;
let cachePromise: Promise<SVGLogo[]> | null = null;

const fetchAllLogos = async (): Promise<SVGLogo[]> => {
  if (allLogosCache) {
    return allLogosCache;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    console.log('Fetching all logos from SVGL API...');

    // Try multiple approaches
    const attempts = [
      // Direct API
      () => fetch('https://api.svgl.app'),
      // Different CORS proxies
      () => fetch('https://corsproxy.io/?https://api.svgl.app'),
      () => fetch('https://cors-anywhere.herokuapp.com/https://api.svgl.app'),
      () => fetch('https://api.allorigins.win/get?url=https://api.svgl.app'),
    ];

    for (let i = 0; i < attempts.length; i++) {
      try {
        console.log(`Attempt ${i + 1}...`);
        const response = await attempts[i]();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let data: SVGLogo[];
        if (i === 3) {
          // allorigins wraps response
          const wrapped = await response.json();
          data = JSON.parse(wrapped.contents);
        } else {
          data = await response.json();
        }

        console.log(
          `Successfully loaded ${data.length} logos via attempt ${i + 1}`,
        );

        // Sort alphabetically by title
        allLogosCache = data.sort((a: SVGLogo, b: SVGLogo) =>
          a.title.localeCompare(b.title),
        );

        return allLogosCache;
      } catch (err) {
        console.warn(`Attempt ${i + 1} failed:`, err);
        if (i === attempts.length - 1) {
          throw new Error('All attempts to fetch logos failed');
        }
      }
    }

    throw new Error('Unreachable');
  })();

  return cachePromise;
};

const filterLogos = (logos: SVGLogo[], query: string): SVGLogo[] => {
  if (!query.trim()) {
    return logos; // Show all logos alphabetically
  }

  // Filter by search query
  const searchTerm = query.toLowerCase();
  return logos.filter(
    (logo) =>
      logo.title.toLowerCase().includes(searchTerm) ||
      (Array.isArray(logo.category)
        ? logo.category.some((cat) => cat.toLowerCase().includes(searchTerm))
        : logo.category.toLowerCase().includes(searchTerm)),
  );
};

export function useSVGLSearch(query: string): UseSVGLSearchResult {
  const [results, setResults] = useState<SVGLogo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchLogos = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const allLogos = await fetchAllLogos();
      const filteredLogos = filterLogos(allLogos, searchQuery);
      setResults(filteredLogos);
      console.log(
        `Showing ${filteredLogos.length} of ${allLogos.length} logos`,
      );
    } catch (err) {
      console.error('Failed to load logos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load logos');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        searchLogos(query);
      },
      query.trim() ? 300 : 0,
    );

    return () => clearTimeout(timeoutId);
  }, [query, searchLogos]);

  return { results, isLoading, error };
}
