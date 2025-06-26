import type { ComponentSearchResult } from '@/types/supabase';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HoverPeek } from '../../ui/link-preview';

// Cache for failed image loads to avoid retrying
const imageErrorCache = new Set<string>();

interface ComponentResultButtonProps {
  result: ComponentSearchResult;
  isSelected?: boolean;
  onSelectionChange?: (
    result: ComponentSearchResult,
    selected: boolean,
  ) => void;
}

export function ComponentResultButton({
  result,
  isSelected = false,
  onSelectionChange,
}: ComponentResultButtonProps) {
  const previewUrl = result.preview_url;
  const hasImageError = previewUrl ? imageErrorCache.has(previewUrl) : false;
  const componentName = result.component_data.name || result.name;
  const [showPreview, setShowPreview] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleImageError = useCallback(() => {
    if (previewUrl) {
      imageErrorCache.add(previewUrl);
    }
  }, [previewUrl]);

  const handleSelectionToggle = useCallback(
    (e: Event) => {
      e.stopPropagation();
      if (onSelectionChange) {
        onSelectionChange(result, !isSelected);
      }
    },
    [result, isSelected, onSelectionChange],
  );

  const handleButtonClick = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange(result, !isSelected);
    }
  }, [result, isSelected, onSelectionChange]);

  const handleMouseEnter = useCallback(() => {
    if (previewUrl && !hasImageError) {
      const timeout = setTimeout(() => {
        setShowPreview(true);
      }, 1000); // 1 second delay
      setHoverTimeout(timeout);
    }
  }, [previewUrl, hasImageError]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPreview(false);
  }, [hoverTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const button = (
    <button
      className={`flex items-center gap-3 p-2 w-full text-sm rounded-lg transition-all duration-200 text-left border shadow-sm ${
        isSelected
          ? 'bg-blue-50 hover:bg-blue-100 border-blue-300 ring-1 ring-blue-200'
          : 'bg-white hover:bg-gray-100 border-gray-200 hover:border-gray-300'
      }`}
      onClick={handleButtonClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Component preview image */}
      <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
        {previewUrl && !hasImageError ? (
          <img
            src={previewUrl}
            alt={componentName}
            className="w-full h-full object-cover rounded border border-gray-200 shadow-sm"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 rounded border border-gray-200" />
        )}
      </div>

      {/* Component info */}
      <div className="flex flex-col items-start flex-1 min-w-0">
        <span
          className={`truncate text-left font-medium ${
            isSelected ? 'text-blue-900' : 'text-gray-900'
          }`}
        >
          {componentName || 'Unknown'}
        </span>
        {result.component_data.description && (
          <span
            className={`text-xs truncate max-w-full ${
              isSelected ? 'text-blue-700' : 'text-gray-600'
            }`}
          >
            {result.component_data.description}
          </span>
        )}
      </div>

      {/* Checkbox - removed spinner logic */}
      <div className="flex items-center justify-center w-4 h-4 flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelectionToggle}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </button>
  );

  // If there's a preview URL and we should show preview, wrap with HoverPeek
  if (previewUrl && !hasImageError && showPreview) {
    return (
      <HoverPeek
        url={previewUrl}
        isStatic={true}
        imageSrc={previewUrl}
        peekWidth={280}
        peekHeight={210}
        enableMouseFollow={true}
        followAxis="y"
        side="left"
      >
        {button}
      </HoverPeek>
    );
  }

  return button;
}
