import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'preact/hooks';
import { forwardRef } from 'preact/compat';
import { useSVGLSearch } from '@/hooks/use-svgl-search';
import { cn, fetchSVGContent, processSVGForInline } from '@/utils';
import type { SVGLogo, ThemeOptions } from '@/types/svgl';
import { Loader } from 'lucide-react';

interface LogosListProps {
  searchQuery: string;
  onLogoSelection: (logo: SVGLogo) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (focused: boolean) => void;
  onCloseLogos?: () => void;
  onReady?: () => void;
}

export interface LogosListRef {
  focusOnLogos: () => void;
  selectActiveLogo: () => boolean;
  focus: () => void;
  blur: () => void;
}

// Компонент для отображения SVG контента
const SVGDisplay = ({ 
  logo, 
  className = "h-6 w-6" 
}: { 
  logo: SVGLogo; 
  className?: string; 
}) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logoUrl = useMemo(() => {
    if (typeof logo.route === 'string') {
      return logo.route;
    }
    return (
      (logo.route as ThemeOptions).light || (logo.route as ThemeOptions).dark
    );
  }, [logo.route]);

  useEffect(() => {
    let isCancelled = false;

    const loadSVG = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const content = await fetchSVGContent(logoUrl);
        if (!isCancelled) {
          const processedContent = processSVGForInline(content, className);
          setSvgContent(processedContent);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load SVG');
          console.warn('Failed to load SVG:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSVG();

    return () => {
      isCancelled = true;
    };
  }, [logoUrl, className]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50 rounded", className)}>
        <Loader className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (error || !svgContent) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50 rounded", className)}>
        <span className="text-xs text-muted-foreground">SVG</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// Компонент для карточки логотипа
const LogoCard = ({
  logo,
  isFocused,
  onClick,
}: {
  logo: SVGLogo;
  isFocused?: boolean;
  onClick?: (logo: SVGLogo) => void;
}) => {


  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(logo);
    }
  }, [logo, onClick]);

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition-all duration-200 ${
        isFocused
          ? 'border-border bg-background ring-2 ring-blue-500'
          : 'border-border bg-background hover:border-muted-foreground hover:bg-muted'
      }`}
      onClick={handleClick}
    >
      {/* Logo icon */}
      <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
        <SVGDisplay 
          logo={logo} 
          className="h-full w-full rounded border border-border"
        />
      </div>

      {/* Logo name and category */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate text-left font-medium text-foreground">
            {logo.title}
          </span>
          <span className="truncate text-[10px] text-muted-foreground">
            {Array.isArray(logo.category)
              ? logo.category.join(', ')
              : logo.category}
          </span>
        </div>
      </div>

      {/* URL info */}
      {logo.url && (
        <div className="flex flex-shrink-0 items-center gap-1">
          <span className="max-w-20 truncate text-[10px] text-muted-foreground">
            {new URL(logo.url).hostname}
          </span>
        </div>
      )}
    </button>
  );
};

export const LogosList = forwardRef<LogosListRef, LogosListProps>(
  (
    {
      searchQuery,
      onLogoSelection,
      onFocusReturn,
      onFocusChange,
      onCloseLogos,
      onReady,
    },
    ref,
  ) => {
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [startIndex, setStartIndex] = useState(0); // Начало видимого окна
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { results, isLoading, error } = useSVGLSearch(searchQuery);

    // Limit results to first 100 for performance
    const limitedResults = useMemo(() => results.slice(0, 100), [results]);

    // Показываем 3 логотипа начиная с startIndex
    const visibleLogos = useMemo(() => {
      return limitedResults.slice(startIndex, startIndex + 3);
    }, [limitedResults, startIndex]);

    // Получаем активный логотип для предпросмотра
    const activeLogo = useMemo(() => {
      if (
        isFocused &&
        selectedIndex >= 0 &&
        selectedIndex < limitedResults.length
      ) {
        return limitedResults[selectedIndex];
      }
      return null;
    }, [isFocused, selectedIndex, limitedResults]);



    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!isFocused || limitedResults.length === 0) return;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => {
              const nextIndex = prev + 1;
              const newIndex =
                nextIndex < limitedResults.length ? nextIndex : 0;

              // Обновляем startIndex чтобы активный элемент оставался видимым
              setStartIndex((currentStart) => {
                if (newIndex === 0) {
                  return 0; // Вернулись к началу
                } else if (newIndex >= currentStart + 3) {
                  return Math.min(newIndex - 2, limitedResults.length - 3); // Прокрутка вниз
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => {
              const newIndex = prev > 0 ? prev - 1 : limitedResults.length - 1;

              // Обновляем startIndex чтобы активный элемент оставался видимым
              setStartIndex((currentStart) => {
                if (newIndex === limitedResults.length - 1) {
                  return Math.max(0, limitedResults.length - 3); // Перешли к концу
                } else if (newIndex < currentStart) {
                  return Math.max(0, newIndex); // Прокрутка вверх
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < limitedResults.length) {
              onLogoSelection(limitedResults[selectedIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            if (onCloseLogos) {
              onCloseLogos();
            }
            break;
          default:
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
              if (onFocusReturn) {
                onFocusReturn();
              }
            }
            break;
        }
      },
      [
        isFocused,
        limitedResults,
        selectedIndex,
        onLogoSelection,
        onCloseLogos,
        onFocusReturn,
      ],
    );

    useEffect(() => {
      if (isFocused) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [isFocused, handleKeyDown]);

    useEffect(() => {
      if (onFocusChange) {
        onFocusChange(isFocused);
      }
    }, [isFocused, onFocusChange]);

    useEffect(() => {
      if (onReady) {
        onReady();
      }
    }, [onReady]);

    // Reset selected index when results change
    useEffect(() => {
      if (selectedIndex >= limitedResults.length && limitedResults.length > 0) {
        setSelectedIndex(limitedResults.length - 1);
        setStartIndex(Math.max(0, limitedResults.length - 3));
      } else if (limitedResults.length === 0 && selectedIndex !== -1) {
        setSelectedIndex(-1);
        setStartIndex(0);
      }
    }, [limitedResults.length, selectedIndex]);

    // Auto-set activeIndex when logos appear and component is focused
    useEffect(() => {
      if (isFocused && limitedResults.length > 0 && selectedIndex === -1) {
        setSelectedIndex(0);
        setStartIndex(0);
      }
    }, [isFocused, limitedResults.length, selectedIndex]);

    const handleContainerFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleContainerBlur = useCallback(() => {
      setTimeout(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          setIsFocused(false);
          setSelectedIndex(-1);
          setStartIndex(0);
        }
      }, 100);
    }, []);

    // Reset active index when losing focus
    useEffect(() => {
      if (!isFocused) {
        setSelectedIndex(-1);
        setStartIndex(0);
      }
    }, [isFocused]);

    useImperativeHandle(
      ref,
      () => ({
        focusOnLogos: () => {
          setIsFocused(true);
          if (limitedResults.length > 0) {
            setSelectedIndex(0);
            setStartIndex(0);
          }
          containerRef.current?.focus();
        },
        selectActiveLogo: () => {
          if (selectedIndex >= 0 && selectedIndex < limitedResults.length) {
            onLogoSelection(limitedResults[selectedIndex]);
            return true;
          }
          return false;
        },
        focus: () => {
          setIsFocused(true);
          if (limitedResults.length > 0) {
            setSelectedIndex(0);
            setStartIndex(0);
          }
          containerRef.current?.focus();
        },
        blur: () => {
          setIsFocused(false);
          setSelectedIndex(-1);
          setStartIndex(0);
        },
      }),
      [limitedResults.length, selectedIndex, onLogoSelection],
    );

    if (error) {
      return (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-destructive text-xs">
          Error loading logos: {error}
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-muted-foreground text-xs">
            Loading logos...
          </span>
        </div>
      );
    }

    if (limitedResults.length === 0) {
      return (
        <div className="rounded border border-border bg-background p-2 text-muted-foreground text-xs">
          {searchQuery
            ? `No logos found for "${searchQuery}"`
            : 'No logos available'}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        className="space-y-3 outline-none"
      >
        {/* Предпросмотр активного логотипа */}
        {activeLogo && (
          <div className="flex justify-center">
            <div className="flex h-[150px] w-[200px] items-center justify-center overflow-hidden rounded-lg border border-border bg-background shadow-md transition-shadow duration-150">
              <SVGDisplay 
                logo={activeLogo} 
                className="max-h-full max-w-full p-4"
              />
            </div>
          </div>
        )}

        {visibleLogos.length > 0 && (
          <div className="space-y-2">
            {/* Список логотипов */}
            {visibleLogos.map((logo, index) => (
              <LogoCard
                key={logo.id || `${logo.title}-${index}`}
                logo={logo}
                isFocused={isFocused && selectedIndex === startIndex + index}
                onClick={onLogoSelection}
              />
            ))}

            {/* Счетчик и навигация */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="text-muted-foreground text-xs">
                {searchQuery
                  ? `Found ${results.length}`
                  : `Brand logos (${results.length})`}{' '}
                • {selectedIndex >= 0 ? selectedIndex + 1 : 1} of{' '}
                {limitedResults.length}
                {results.length > 100 && ' (showing first 100)'}
              </div>
              <div className="ml-auto text-primary text-xs">↑↓ navigate</div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
