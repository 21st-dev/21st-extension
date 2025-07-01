import { useState, useEffect } from 'preact/hooks';
import { cn } from '@/utils';

interface InlineSuggestionProps {
  text: string;
  suggestion: string;
  visible: boolean;
  className?: string;
}

export function InlineSuggestion({
  text,
  suggestion,
  visible,
  className,
}: InlineSuggestionProps) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isFirstAppearance, setIsFirstAppearance] = useState(true);

  useEffect(() => {
    if (visible && suggestion) {
      // Small delay to make it feel more natural
      const timer = setTimeout(() => {
        setShowSuggestion(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowSuggestion(false);
      setIsFirstAppearance(true);
    }
  }, [visible, suggestion]);

  useEffect(() => {
    if (showSuggestion) {
      // Start animation after showing
      const animationTimer = setTimeout(() => {
        setIsFirstAppearance(false);
      }, 50);
      return () => clearTimeout(animationTimer);
    }
  }, [showSuggestion]);

  if (!showSuggestion || !suggestion) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 left-0 flex items-baseline whitespace-pre-wrap text-xs',
        className,
      )}
      style={{
        // Position overlay on top of the text with exact textarea padding
        paddingLeft: '10px',
        lineHeight: '1.5', // Match textarea line height
      }}
    >
      {/* Invisible text to align suggestion */}
      <span className="invisible text-sm">{text}</span>

      {/* Suggestion text */}
      <span
        className={cn(
          'inline-flex items-center gap-1 font-medium text-muted-foreground',
          'rounded border border-border bg-background px-1 py-0.5 backdrop-blur-sm',
          'ml-0.5 transition-all duration-200 ease-out',
          isFirstAppearance
            ? 'translate-x-1 scale-98 opacity-0 blur-sm'
            : 'translate-x-0 scale-100 opacity-100 blur-0',
        )}
      >
        <span className="rounded-[2px] bg-muted p-0.5 font-bold text-[10px] text-muted-foreground leading-none">
          Tab
        </span>
        <span className="text-[11px] leading-none">to search 21st.dev</span>
      </span>
    </div>
  );
}
