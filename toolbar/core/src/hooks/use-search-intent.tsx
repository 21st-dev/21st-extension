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
  // Track current AbortController to cancel previous requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Cache for storing results
  const cacheRef = useRef<Map<string, string>>(new Map());

  const extractIntent = useCallback(
    async (inputText: string, signal?: AbortSignal): Promise<string> => {
      if (!inputText.trim()) {
        return '';
      }

      // Check cache first
      const cached = cacheRef.current.get(inputText);
      if (cached !== undefined) {
        return cached;
      }

      const url = TWENTY_FIRST_URL + '/api/search/extract-intent';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
        signal, // Pass AbortSignal to fetch
      });

      // Handle server-side abort (status 499)
      if (response.status === 499) {
        throw new Error('AbortError'); // Treat as abort error
      }

      if (!response.ok) {
        throw new Error(`Intent extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      const searchQuery = data.searchQuery?.trim();
      const result =
        !searchQuery ||
        searchQuery === 'empty' ||
        searchQuery === '( empty )' ||
        searchQuery.replace(/[()]/g, '').trim() === 'empty'
          ? ''
          : data.searchQuery; // Return empty string if no searchQuery or if searchQuery indicates no intent

      // Cache the result
      cacheRef.current.set(inputText, result);

      return result;
    },
    [],
  );

  const getSearchIntent = useCallback(
    async (inputText: string) => {
      if (!inputText.trim() || inputText.length < 3) {
        // Added minimum length check
        setSearchIntent('');
        setIsLoading(false);
        setError(null);
        requestedForTextRef.current = '';
        receivedForTextRef.current = '';
        // Cancel any pending request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        return;
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Mark that we're requesting intent for this text
      requestedForTextRef.current = inputText;
      setIsLoading(true);
      setError(null);

      try {
        const intent = await extractIntent(inputText, controller.signal);

        // Only update state if the text hasn't changed since the request AND request wasn't aborted
        if (
          requestedForTextRef.current === inputText &&
          !controller.signal.aborted
        ) {
          setSearchIntent(intent);
          receivedForTextRef.current = inputText;
        }
        // If text changed, ignore this result
      } catch (err) {
        // Ignore aborted requests (client-side or server-side)
        if (
          (err instanceof Error && err.name === 'AbortError') ||
          (err instanceof Error && err.message === 'AbortError') ||
          (err instanceof TypeError && err.message.includes('Failed to fetch'))
        ) {
          return;
        }

        // Only update error if the text hasn't changed since the request AND request wasn't aborted
        if (
          requestedForTextRef.current === inputText &&
          !controller.signal.aborted
        ) {
          setError(
            err instanceof Error ? err.message : 'Intent extraction failed',
          );
          setSearchIntent('');
          receivedForTextRef.current = '';
        }
      } finally {
        // Only update loading state if the text hasn't changed since the request AND request wasn't aborted
        if (
          requestedForTextRef.current === inputText &&
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
    [extractIntent],
  );

  // Effect to handle text changes and invalidation
  useEffect(() => {
    // If text changed and we have an intent that doesn't match current text, invalidate it
    if (text !== receivedForTextRef.current && searchIntent) {
      setSearchIntent('');
      receivedForTextRef.current = '';
    }

    // Debounced intent extraction with 500ms delay for optimal balance
    const timeoutId = setTimeout(() => {
      getSearchIntent(text);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [text, getSearchIntent, searchIntent]);

  // Cleanup: cancel any pending request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Return intent only if it matches the current text
  const validSearchIntent =
    text === receivedForTextRef.current ? searchIntent : '';

  return { searchIntent: validSearchIntent, isLoading, error };
}
