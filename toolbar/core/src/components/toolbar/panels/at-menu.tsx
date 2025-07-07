import { BookmarkIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/utils';
import { useCallback, useEffect, useState, useMemo } from 'preact/hooks';
import { LucideLogo } from './lucide-logo';
import { Context7Logo } from './context7-logo';
import { SVGLLogo } from './svgl-logo';
import { useAuthStatus } from '@/hooks/use-auth';

interface AtMenuProps {
  onSelect: (type: 'bookmarks' | 'icons' | 'docs' | 'logos') => void;
  onFocusReturn?: () => void;
  searchQuery?: string;
}

const options: Array<{
  type: 'bookmarks' | 'icons' | 'docs' | 'logos';
  label: string;
  Icon: typeof BookmarkIcon | 'LucideLogo' | 'Context7Logo' | 'SVGLLogo';
}> = [
  {
    type: 'bookmarks',
    label: '21st.dev Bookmarks',
    Icon: BookmarkIcon,
  },
  {
    type: 'icons',
    label: 'Lucide Icons',
    Icon: 'LucideLogo',
  },
  {
    type: 'docs',
    label: 'Documentation',
    Icon: 'Context7Logo',
  },
  {
    type: 'logos',
    label: 'SVG Logos',
    Icon: 'SVGLLogo',
  },
];

export function AtMenu({ onSelect, onFocusReturn, searchQuery }: AtMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { isAuthenticated } = useAuthStatus();

  // Filter options based on authentication and search query
  const filteredOptions = useMemo(() => {
    // First filter by authentication - hide bookmarks if not authenticated
    const availableOptions = isAuthenticated
      ? options
      : options.filter((option) => option.type !== 'bookmarks');

    // Then filter by search query
    if (!searchQuery?.trim()) {
      return availableOptions;
    }
    const query = searchQuery.toLowerCase();
    return availableOptions.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [searchQuery, isAuthenticated]);

  // Reset activeIndex when filtered options change
  useEffect(() => {
    if (filteredOptions.length > 0) {
      setActiveIndex(0);
    } else {
      setActiveIndex(-1);
    }
  }, [filteredOptions.length]);

  const handleClick = useCallback(
    (type: 'bookmarks' | 'icons' | 'docs' | 'logos') => {
      onSelect(type);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(
            (prev) =>
              (prev - 1 + filteredOptions.length) % filteredOptions.length,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            handleClick(filteredOptions[activeIndex].type);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (onFocusReturn) {
            onFocusReturn();
          }
          break;
        default:
          // If user types any character, return focus to textarea
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            if (onFocusReturn) {
              onFocusReturn();
            }
          }
          break;
      }
    },
    [activeIndex, filteredOptions, handleClick, onFocusReturn],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Don't render if no filtered options
  if (filteredOptions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-2 shadow-md">
        <div className="text-center text-muted-foreground text-xs">
          No options found for "{searchQuery}"
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-1 rounded-[12px] border border-border bg-background p-1 shadow-md"
      tabIndex={-1}
    >
      {filteredOptions.map(({ type, label, Icon }, index) => (
        <button
          key={type}
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors',
            index === activeIndex
              ? 'bg-zinc-200 text-foreground dark:bg-zinc-800'
              : 'hover:bg-muted',
          )}
          onClick={() => handleClick(type)}
        >
          {Icon === 'LucideLogo' ? (
            <LucideLogo className="h-4 w-4" />
          ) : Icon === 'Context7Logo' ? (
            <Context7Logo className="h-4 w-4" />
          ) : Icon === 'SVGLLogo' ? (
            <SVGLLogo className="h-4 w-4" />
          ) : (
            <Icon
              className={cn(
                'h-4 w-4',
                index === activeIndex
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            />
          )}
          <span
            className={cn(
              'flex-1 text-left',
              index === activeIndex ? 'text-foreground' : 'text-foreground',
            )}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
