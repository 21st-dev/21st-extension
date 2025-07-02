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

  const button = (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm shadow-sm transition-all duration-200 ${
        isSelected
          ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/15'
          : 'border-border bg-background hover:border-border/60 hover:bg-muted/50'
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
            className="h-full w-full rounded border border-border object-cover shadow-sm"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full rounded border border-border bg-muted" />
        )}
      </div>

      {/* Component info */}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <span
          className={`truncate text-left font-medium ${
            isSelected ? 'text-primary' : 'text-foreground'
          }`}
        >
          {componentName || 'Unknown'}
        </span>
        {result.component_data.description && (
          <span
            className={`max-w-full truncate text-xs ${
              isSelected ? 'text-primary/80' : 'text-muted-foreground'
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
          className="h-4 w-4 cursor-pointer rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/20"
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
                    // Image loaded successfully
                  }}
                  onError={() => {
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
