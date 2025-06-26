import type { ComponentSearchResult } from '@/types/supabase';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HoverPeek } from '../../ui/link-preview';

// Cache for failed image loads to avoid retrying
const imageErrorCache = new Set<string>();

interface ComponentResultButtonProps {
  result: ComponentSearchResult;
  isSelected?: boolean;
  isFocused?: boolean;
  onSelectionChange?: (
    result: ComponentSearchResult,
    selected: boolean,
  ) => void;
}

export function ComponentResultButton({
  result,
  isSelected = false,
  isFocused = false,
  onSelectionChange,
}: ComponentResultButtonProps) {
  const previewUrl = result.preview_url;
  const hasImageError = previewUrl ? imageErrorCache.has(previewUrl) : false;
  const componentName = result.component_data.name || result.name;

  // Debug image error cache (only if there's an error)
  if (isFocused && previewUrl && hasImageError) {
    console.log('❌ Image error for', componentName, ':', {
      previewUrl,
      isInCache: imageErrorCache.has(previewUrl),
      cacheSize: imageErrorCache.size,
    });
  }
  const [showPreviewFromHover, setShowPreviewFromHover] = useState(false);
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
        setShowPreviewFromHover(true);
      }, 1000); // 1 second delay
      setHoverTimeout(timeout);
    }
  }, [previewUrl, hasImageError]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPreviewFromHover(false);
  }, [hoverTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Show preview if hovering or focused (immediately for focus, delayed for hover)
  const shouldShowPreview =
    showPreviewFromHover || (isFocused && previewUrl && !hasImageError);

  // Debug logging - only show problems
  useEffect(() => {
    if (isFocused) {
      const focusCondition = isFocused && previewUrl && !hasImageError;
      const calculatedShouldShow = showPreviewFromHover || focusCondition;

      // Only log if there's a mismatch
      if (calculatedShouldShow !== shouldShowPreview) {
        console.log('❌ PREVIEW LOGIC MISMATCH for', componentName, ':', {
          showPreviewFromHover,
          focusCondition,
          calculatedShouldShow,
          reactShouldShowPreview: shouldShowPreview,
          previewUrl: !!previewUrl,
          hasImageError,
        });
      } else if (shouldShowPreview) {
        console.log('✅ Preview logic OK for', componentName);
      }
    }
  }, [
    isFocused,
    showPreviewFromHover,
    componentName,
    previewUrl,
    hasImageError,
    shouldShowPreview,
  ]);

  const button = (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm shadow-sm transition-all duration-200 ${
        isSelected
          ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200 hover:bg-blue-100'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-100'
      }`}
      onClick={handleButtonClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Component preview image */}
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
        {previewUrl && !hasImageError ? (
          <img
            src={previewUrl}
            alt={componentName}
            className="h-full w-full rounded border border-gray-200 object-cover shadow-sm"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full rounded border border-gray-200 bg-gray-100" />
        )}
      </div>

      {/* Component info */}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <span
          className={`truncate text-left font-medium ${
            isSelected ? 'text-blue-900' : 'text-gray-900'
          }`}
        >
          {componentName || 'Unknown'}
        </span>
        {result.component_data.description && (
          <span
            className={`max-w-full truncate text-xs ${
              isSelected ? 'text-blue-700' : 'text-gray-600'
            }`}
          >
            {result.component_data.description}
          </span>
        )}
      </div>

      {/* Checkbox - removed spinner logic */}
      <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelectionToggle}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </button>
  );

  // For hover preview (only when not focused), wrap with HoverPeek
  const wrappedButton =
    showPreviewFromHover && !isFocused ? (
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
    ) : (
      button
    );

  return (
    <>
      {wrappedButton}

      {/* Inline preview for focus - exact HoverPeek styling */}
      {isFocused && shouldShowPreview && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            perspective: '800px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'block',
                overflow: 'hidden',
                borderRadius: '0.5rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow:
                  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                width: 280,
                height: 210,
                transition: 'box-shadow 0.15s ease-in-out',
              }}
            >
              {hasImageError ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '0.75rem',
                    width: 280,
                    height: 210,
                  }}
                >
                  Preview unavailable
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt={`Preview for ${componentName}`}
                  onLoad={() => {
                    console.log('✅ Image loaded for', componentName);
                  }}
                  onError={() => {
                    console.log('❌ Image failed to load for', componentName);
                    handleImageError();
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '0.5rem',
                    display: 'block',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
