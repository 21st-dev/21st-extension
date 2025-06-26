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

  useEffect(() => {
    if (visible && suggestion) {
      // Small delay to make it feel more natural
      const timer = setTimeout(() => setShowSuggestion(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowSuggestion(false);
    }
  }, [visible, suggestion]);

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
          'fade-in-0 slide-in-from-left-2 animate-in duration-500',
          'inline-flex items-center gap-1 font-medium text-gray-400',
          'rounded border border-gray-200/50 bg-gray-50/90 px-1.5 py-0.5 backdrop-blur-sm',
          'ml-1', // Small gap from text
        )}
      >
        <span className="rounded bg-gray-200 px-1 py-0.5 font-mono text-[10px] text-gray-600 leading-none">
          Tab
        </span>
        <span className="text-[11px] leading-none">to search 21st.dev</span>
      </span>
    </div>
  );
}
