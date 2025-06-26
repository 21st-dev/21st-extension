import {
  useChatState,
  type SelectedComponentWithCode,
} from '@/hooks/use-chat-state';
import type { ComponentSearchResult } from '@/types/supabase';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { TextShimmer } from '../../ui/text-shimmer';
import { ComponentResultButton } from './component-result-button';

interface SearchResultsProps {
  results: ComponentSearchResult[];
  isLoading: boolean;
  error: string | null;
  searchQuery?: string;
  domContextElements?: HTMLElement[];
  pluginContextSnippets?: any[];
  onSelectionChange?: (selectedResults: SelectedComponentWithCode[]) => void;
}

export function SearchResults({
  results,
  isLoading,
  error,
  searchQuery,
  domContextElements,
  pluginContextSnippets,
  onSelectionChange,
}: SearchResultsProps) {
  const { selectedComponents, addComponent, removeComponent, clearSelection } =
    useChatState();

  // Use ref to track if we need to notify parent
  const prevSelectedRef = useRef<number>(0);

  // Notify parent only when selection count changes
  useEffect(() => {
    if (
      onSelectionChange &&
      selectedComponents.length !== prevSelectedRef.current
    ) {
      prevSelectedRef.current = selectedComponents.length;
      onSelectionChange(selectedComponents);
    }
  }, [selectedComponents, onSelectionChange]);

  // Handle component selection - simplified without code fetching
  const handleComponentSelection = useCallback(
    (result: ComponentSearchResult, selected: boolean) => {
      if (selected) {
        addComponent(result);
      } else {
        removeComponent(result.id);
      }
    },
    [addComponent, removeComponent],
  );

  if (error) {
    return (
      <div className="p-2 text-xs text-red-500 bg-red-50/50 rounded border border-red-200/50">
        Search error: {error}
      </div>
    );
  }

  // Don't render anything if not loading and no results
  if (!isLoading && results.length === 0) {
    return null;
  }

  return (
    <div>
      {isLoading ? (
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <TextShimmer
              duration={1.5}
              className="text-sm font-medium [--base-color:theme(colors.gray.600)] [--base-gradient-color:theme(colors.blue.600)]"
            >
              Searching components...
            </TextShimmer>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Unified Results Section */}
          {results.length > 0 && (
            <div className="space-y-1">
              {selectedComponents.length > 0 && (
                <div className="flex items-center justify-between px-0.5 py-1">
                  <h4 className="text-xs font-medium text-gray-700">
                    Components ({selectedComponents.length} selected)
                  </h4>
                  <button onClick={clearSelection} className="text-xs">
                    Clear all
                  </button>
                </div>
              )}
              <div className="max-h-[210px] overflow-y-auto space-y-1">
                {results.map((result) => (
                  <ComponentResultButton
                    key={result.id}
                    result={result}
                    isSelected={selectedComponents.some(
                      (c) => c.id === result.id,
                    )}
                    onSelectionChange={handleComponentSelection}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
