import { TWENTY_FIRST_URL } from '@/constants';
import { supabase } from '@/services/supabase';
import type { ComponentSearchResult } from '@/types/supabase';
import { useCallback, useEffect, useState, useRef } from 'preact/hooks';

interface UseComponentSearchReturn {
  results: ComponentSearchResult[];
  isLoading: boolean;
  error: string | null;
}

export function useComponentSearch(
  query: string,
  preExtractedIntent?: string,
): UseComponentSearchReturn {
  const [results, setResults] = useState<ComponentSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current search to cancel previous requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentQueryRef = useRef<string>('');

  const extractIntent = useCallback(
    async (text: string, signal?: AbortSignal): Promise<string> => {
      const url = TWENTY_FIRST_URL + '/api/search/extract-intent';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal, // Pass AbortSignal to fetch
      });

      if (!response.ok) {
        throw new Error(`Intent extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.searchQuery || text; // Fallback to original text if no searchQuery
    },
    [],
  );

  const searchComponents = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        // Cancel any pending request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        currentQueryRef.current = '';
        return;
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      currentQueryRef.current = searchQuery;

      setIsLoading(true);
      setError(null);

      try {
        // Use pre-extracted intent if available, otherwise extract it
        const extractedQuery =
          preExtractedIntent ||
          (await extractIntent(searchQuery, controller.signal));

        // Check if request was cancelled after intent extraction
        if (controller.signal.aborted) {
          return;
        }

        const { data: searchResults, error } = await supabase.functions.invoke(
          'search_demos_ai_oai_extended',
          {
            body: {
              search: extractedQuery,
              match_threshold: 0.33,
            },
          },
        );

        // Check if this is still the current search query
        if (
          currentQueryRef.current !== searchQuery ||
          controller.signal.aborted
        ) {
          return;
        }

        if (error) throw error;

        if (!searchResults || !Array.isArray(searchResults)) {
          setResults([]);
          return;
        }

        // Transform and limit results to 10
        const transformedResults = searchResults
          .slice(0, 10) // Limit to 10 results
          .map((result) => ({
            id: result.id,
            name: result.name,
            preview_url: result.preview_url,
            video_url: result.video_url,
            demo_slug: result.demo_slug,
            user_id: result.user_id,
            component_data: result.component_data,
            user_data: result.user_data,
            usage_data: result.usage_data,
          }));

        // Final check if this is still the current search query
        if (
          currentQueryRef.current === searchQuery &&
          !controller.signal.aborted
        ) {
          setResults(transformedResults);
        }
      } catch (err) {
        // Ignore aborted requests
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        // Only update error if this is still the current search query
        if (
          currentQueryRef.current === searchQuery &&
          !controller.signal.aborted
        ) {
          setError(err instanceof Error ? err.message : 'Search failed');
          setResults([]);
        }
      } finally {
        // Only update loading state if this is still the current search query
        if (
          currentQueryRef.current === searchQuery &&
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }

        // Clear the controller reference if this was the active request
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [extractIntent, preExtractedIntent],
  );

  // Debounced search with 1s delay, but immediate if we have preExtractedIntent
  useEffect(() => {
    const delay = preExtractedIntent ? 0 : 300; // Reduced from 1000ms to 300ms for faster search
    const timeoutId = setTimeout(() => {
      searchComponents(query);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, preExtractedIntent, searchComponents]);

  // Cleanup: cancel any pending request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return { results, isLoading, error };
}
