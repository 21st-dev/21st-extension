import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { TWENTY_FIRST_URL } from '@/constants';

interface UseSearchIntentReturn {
  searchIntent: string;
  isLoading: boolean;
  error: string | null;
}

export function useSearchIntent(text: string): UseSearchIntentReturn {
  const [searchIntent, setSearchIntent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the text for which the intent was requested and received
  const requestedForTextRef = useRef<string>('');
  const receivedForTextRef = useRef<string>('');

  const extractIntent = useCallback(
    async (inputText: string): Promise<string> => {
      if (!inputText.trim()) {
        return '';
      }

      const url = TWENTY_FIRST_URL + '/api/search/extract-intent';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error(`Intent extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.searchQuery || ''; // Return empty string if no searchQuery
    },
    [],
  );

  const getSearchIntent = useCallback(
    async (inputText: string) => {
      if (!inputText.trim()) {
        setSearchIntent('');
        setIsLoading(false);
        setError(null);
        requestedForTextRef.current = '';
        receivedForTextRef.current = '';
        return;
      }

      // Mark that we're requesting intent for this text
      requestedForTextRef.current = inputText;
      setIsLoading(true);
      setError(null);

      try {
        const intent = await extractIntent(inputText);

        // Only update state if the text hasn't changed since the request
        if (requestedForTextRef.current === inputText) {
          setSearchIntent(intent);
          receivedForTextRef.current = inputText;
        }
        // If text changed, ignore this result
      } catch (err) {
        // Only update error if the text hasn't changed since the request
        if (requestedForTextRef.current === inputText) {
          setError(
            err instanceof Error ? err.message : 'Intent extraction failed',
          );
          setSearchIntent('');
          receivedForTextRef.current = '';
        }
      } finally {
        // Only update loading state if the text hasn't changed since the request
        if (requestedForTextRef.current === inputText) {
          setIsLoading(false);
        }
      }
    },
    [extractIntent],
  );

  // Effect to handle text changes and invalidation
  useEffect(() => {
    // If text changed and we have an intent that doesn't match current text, invalidate it
    if (text !== receivedForTextRef.current && searchIntent) {
      setSearchIntent('');
      receivedForTextRef.current = '';
    }

    // Debounced intent extraction with 800ms delay
    const timeoutId = setTimeout(() => {
      getSearchIntent(text);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [text, getSearchIntent, searchIntent]);

  // Return intent only if it matches the current text
  const validSearchIntent =
    text === receivedForTextRef.current ? searchIntent : '';

  return { searchIntent: validSearchIntent, isLoading, error };
}
