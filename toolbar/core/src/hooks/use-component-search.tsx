import { TWENTY_FIRST_URL } from '@/constants';
import { supabase } from '@/services/supabase';
import type { ComponentSearchResult } from '@/types/supabase';
import { useCallback, useEffect, useState } from 'preact/hooks';

interface UseComponentSearchReturn {
  results: ComponentSearchResult[];
  isLoading: boolean;
  error: string | null;
}

export function useComponentSearch(query: string): UseComponentSearchReturn {
  const [results, setResults] = useState<ComponentSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractIntent = useCallback(async (text: string): Promise<string> => {
    const url = TWENTY_FIRST_URL + '/api/search/extract-intent';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Intent extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.searchQuery || text; // Fallback to original text if no searchQuery
  }, []);

  const searchComponents = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First, extract the user's intent using the API
        const extractedQuery = await extractIntent(searchQuery);

        const { data: searchResults, error } = await supabase.functions.invoke(
          'search_demos_ai_oai_extended',
          {
            body: {
              search: extractedQuery,
              match_threshold: 0.33,
            },
          },
        );

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

        setResults(transformedResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [extractIntent],
  );

  // Debounced search with 1s delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchComponents(query);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [query, searchComponents]);

  return { results, isLoading, error };
}
