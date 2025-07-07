import type { Bookmark } from '@/hooks/use-bookmarks';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  useMemo,
} from 'preact/hooks';
import { forwardRef } from 'preact/compat';
import { Loader } from 'lucide-react';

interface BookmarksListProps {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  searchQuery?: string;
  onBookmarkSelection?: (bookmark: Bookmark) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (isFocused: boolean, activeBookmark?: Bookmark) => void;
  onCloseBookmarks?: () => void;
  onReady?: () => void;
}

export interface BookmarksListRef {
  focusOnBookmarks: () => void;
  selectActiveBookmark: () => boolean;
}

// Компонент для карточки букмарка
const BookmarkCard = ({
  bookmark,
  isFocused,
  onClick,
}: {
  bookmark: Bookmark;
  isFocused?: boolean;
  onClick?: (bookmark: Bookmark) => void;
}) => {
  // Логика названий как в SearchResults
  const componentName =
    bookmark.component.name || bookmark.component.display_name;

  // Фильтрация стандартных названий демо
  const shouldShowDemoName = (demoName: string) => {
    const normalizedName = demoName.toLowerCase().trim();
    const defaultNames = ['default', 'default demo', 'default.tsx'];
    return !defaultNames.includes(normalizedName);
  };

  const demoName =
    bookmark.component.name && shouldShowDemoName(bookmark.name)
      ? bookmark.name
      : null;
  const authorName = bookmark.component.display_name;
  const authorAvatar = bookmark.component.image_url;

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(bookmark);
    }
  }, [bookmark, onClick]);

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
      {/* Preview image */}
      <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
        {bookmark.preview_url ? (
          <img
            src={bookmark.preview_url}
            alt={componentName}
            className="h-full w-full rounded border border-border object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full rounded border border-border bg-muted" />
        )}
      </div>

      {/* Component name and demo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate text-left font-medium text-foreground">
            {componentName || 'Unknown'}
          </span>
          {demoName && (
            <span className="truncate text-[10px] text-muted-foreground">
              {demoName}
            </span>
          )}
        </div>
      </div>

      {/* Author info */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {authorAvatar && (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-4 w-4 rounded-full border border-border"
            loading="eager"
          />
        )}
        {authorName && (
          <span className="max-w-16 truncate text-[10px] text-muted-foreground">
            {authorName}
          </span>
        )}
      </div>
    </button>
  );
};

export const BookmarksList = forwardRef<BookmarksListRef, BookmarksListProps>(
  (
    {
      bookmarks,
      isLoading,
      error,
      searchQuery,
      onBookmarkSelection,
      onFocusReturn,
      onFocusChange,
      onCloseBookmarks,
      onReady,
    },
    ref,
  ) => {
    // Навигация клавиатурой
    const [activeIndex, setActiveIndex] = useState(-1);
    const [startIndex, setStartIndex] = useState(0); // Начало видимого окна
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Фильтрация букмарков по поисковому запросу
    const filteredBookmarks = useMemo(() => {
      if (!searchQuery?.trim()) {
        return bookmarks;
      }

      const query = searchQuery.toLowerCase().trim();
      return bookmarks.filter((bookmark) => {
        // Ищем только по тем полям, которые видны пользователю
        const componentName = (
          bookmark.component.name ||
          bookmark.component.display_name ||
          ''
        ).toLowerCase();

        // Проверяем, показывается ли demo name пользователю
        const shouldShowDemoName = (demoName: string) => {
          const normalizedName = demoName.toLowerCase().trim();
          const defaultNames = ['default', 'default demo', 'default.tsx'];
          return !defaultNames.includes(normalizedName);
        };

        const demoName =
          bookmark.component.name && shouldShowDemoName(bookmark.name)
            ? bookmark.name.toLowerCase()
            : '';

        // Ищем только в видимых полях
        return (
          componentName.includes(query) ||
          (demoName && demoName.includes(query))
        );
      });
    }, [bookmarks, searchQuery]);

    // Показываем 3 букмарка начиная с startIndex
    const visibleBookmarks = useMemo(() => {
      return filteredBookmarks.slice(startIndex, startIndex + 3);
    }, [filteredBookmarks, startIndex]);

    // Получаем активный букмарк для предпросмотра
    const activeBookmark = useMemo(() => {
      if (
        isFocused &&
        activeIndex >= 0 &&
        activeIndex < filteredBookmarks.length
      ) {
        return filteredBookmarks[activeIndex];
      }
      return null;
    }, [isFocused, activeIndex, filteredBookmarks]);

    // Немедленное уведомление о готовности
    useEffect(() => {
      onReady?.();
    }, [onReady]);

    // Обработка выбора букмарка
    const handleBookmarkSelection = useCallback(
      (bookmark: Bookmark) => {
        if (onBookmarkSelection) {
          onBookmarkSelection(bookmark);
        }
        // Закрываем список после выбора
        if (onCloseBookmarks) {
          setTimeout(() => {
            onCloseBookmarks();
          }, 100);
        }
      },
      [onBookmarkSelection, onCloseBookmarks],
    );

    // Методы для родительского компонента
    useImperativeHandle(
      ref,
      () => ({
        focusOnBookmarks: () => {
          if (!isFocused) {
            setIsFocused(true);
            setActiveIndex(filteredBookmarks.length > 0 ? 0 : -1);
            setStartIndex(0);
            containerRef.current?.focus();
          }
        },
        selectActiveBookmark: () => {
          if (
            isFocused &&
            activeIndex >= 0 &&
            activeIndex < filteredBookmarks.length
          ) {
            const activeBookmark = filteredBookmarks[activeIndex];
            handleBookmarkSelection(activeBookmark);
            return true;
          }
          return false;
        },
      }),
      [filteredBookmarks, isFocused, activeIndex, handleBookmarkSelection],
    );

    // Навигация клавиатурой
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!isFocused || filteredBookmarks.length === 0) {
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setActiveIndex((prev) => {
              const nextIndex = prev + 1;
              const newIndex =
                nextIndex < filteredBookmarks.length ? nextIndex : 0;

              // Обновляем startIndex чтобы активный элемент оставался видимым
              setStartIndex((currentStart) => {
                if (newIndex === 0) {
                  return 0; // Вернулись к началу
                } else if (newIndex >= currentStart + 3) {
                  return Math.min(newIndex - 2, filteredBookmarks.length - 3); // Прокрутка вниз
                }
                return currentStart;
              });

              return newIndex;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setActiveIndex((prev) => {
              const newIndex =
                prev > 0 ? prev - 1 : filteredBookmarks.length - 1;

              // Обновляем startIndex чтобы активный элемент оставался видимым
              setStartIndex((currentStart) => {
                if (newIndex === filteredBookmarks.length - 1) {
                  return Math.max(0, filteredBookmarks.length - 3); // Перешли к концу
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
            if (activeIndex >= 0 && activeIndex < filteredBookmarks.length) {
              const activeBookmark = filteredBookmarks[activeIndex];
              handleBookmarkSelection(activeBookmark);
              setTimeout(() => {
                setIsFocused(false);
                setActiveIndex(-1);
                setStartIndex(0);
                if (onCloseBookmarks) {
                  onCloseBookmarks();
                }
                if (onFocusReturn) {
                  onFocusReturn();
                }
              }, 100);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsFocused(false);
            setActiveIndex(-1);
            setStartIndex(0);
            if (onFocusChange) {
              onFocusChange(false);
            }
            if (onFocusReturn) {
              onFocusReturn();
            }
            break;
          default:
            // Если пользователь вводит символ, возвращаем фокус к textarea
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
              setIsFocused(false);
              setActiveIndex(-1);
              setStartIndex(0);
              if (onFocusReturn) {
                onFocusReturn();
              }
            }
            break;
        }
      },
      [
        isFocused,
        filteredBookmarks.length,
        activeIndex,
        handleBookmarkSelection,
        onFocusReturn,
        onFocusChange,
        onCloseBookmarks,
      ],
    );

    // Сброс активного индекса при изменении результатов
    useEffect(() => {
      if (
        activeIndex >= filteredBookmarks.length &&
        filteredBookmarks.length > 0
      ) {
        // Если текущий индекс больше количества результатов, устанавливаем на последний
        setActiveIndex(filteredBookmarks.length - 1);
        setStartIndex(Math.max(0, filteredBookmarks.length - 3));
      } else if (filteredBookmarks.length === 0 && activeIndex !== -1) {
        // Если нет результатов, сбрасываем индекс
        setActiveIndex(-1);
        setStartIndex(0);
      }
    }, [filteredBookmarks.length, activeIndex]);

    // Автоустановка activeIndex когда букмарки появляются и компонент в фокусе
    useEffect(() => {
      if (isFocused && filteredBookmarks.length > 0 && activeIndex === -1) {
        // Устанавливаем активный индекс только если его нет
        setActiveIndex(0);
        setStartIndex(0);
      }
    }, [isFocused, filteredBookmarks.length, activeIndex]);

    // Добавляем слушатели клавиатуры
    useEffect(() => {
      if (isFocused) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [isFocused, handleKeyDown]);

    const handleContainerFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleContainerBlur = useCallback(() => {
      setTimeout(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          setIsFocused(false);
          setActiveIndex(-1);
          setStartIndex(0);
        }
      }, 100);
    }, []);

    // Сброс активного индекса при потере фокуса
    useEffect(() => {
      if (!isFocused) {
        setActiveIndex(-1);
        setStartIndex(0);
      }
    }, [isFocused]);

    // Уведомляем родителя об изменениях фокуса
    useEffect(() => {
      if (onFocusChange) {
        onFocusChange(isFocused, activeBookmark);
      }
    }, [isFocused, activeBookmark, onFocusChange]);

    if (error) {
      return (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-destructive text-xs">
          Bookmarks error: {error}
        </div>
      );
    }

    if (!isLoading && filteredBookmarks.length === 0) {
      return (
        <div className="rounded border border-border bg-background p-2 text-muted-foreground text-xs">
          {searchQuery?.trim()
            ? `No bookmarks found for "${searchQuery}"`
            : 'No bookmarks found'}
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
        {/* Предпросмотр активного букмарка */}
        {activeBookmark &&
          (activeBookmark.preview_url || activeBookmark.video_url) && (
            <div className="flex justify-center">
              <div className="flex h-[150px] w-[200px] items-center justify-center overflow-hidden rounded-lg border border-border bg-background shadow-md transition-shadow duration-150">
                {activeBookmark.video_url ? (
                  <video
                    src={activeBookmark.video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <img
                    src={activeBookmark.preview_url}
                    alt={`Preview for ${activeBookmark.name}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                )}
              </div>
            </div>
          )}

        {visibleBookmarks.length > 0 ? (
          <div className="space-y-2">
            {/* Список букмарков */}
            {visibleBookmarks.map((bookmark, index) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                isFocused={isFocused && activeIndex === startIndex + index}
                onClick={handleBookmarkSelection}
              />
            ))}

            {/* Счетчик и навигация */}
            <div className="flex items-center justify-between px-1 py-1">
              {filteredBookmarks.length > 0 && (
                <div className="text-muted-foreground text-xs">
                  Your bookmarks • {activeIndex >= 0 ? activeIndex + 1 : 1} of{' '}
                  {filteredBookmarks.length}
                </div>
              )}
              <div className="ml-auto text-primary text-xs">↑↓ navigate</div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-muted-foreground text-xs">
              Loading bookmarks...
            </span>
          </div>
        ) : null}
      </div>
    );
  },
);
