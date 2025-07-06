# Анализ дублирования и план унификации @ панелей

## Детальный анализ дублирования

### 1. **search-results.tsx** - 21st.dev компоненты (592 строки)
```typescript
// Интерфейсы
interface SearchResultsProps {
  results: ComponentSearchResult[];
  isLoading: boolean;
  error: string | null;
  searchQuery?: string;
  onComponentSelection?: (result: ComponentSearchResult, selected: boolean) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (isFocused: boolean, activeResult?: ComponentSearchResult) => void;
  onCloseSearch?: () => void;
  onReady?: () => void;
}

export interface SearchResultsRef {
  focusOnResults: () => void;
  selectActiveComponent: () => boolean;
}

// Данные: ComponentSearchResult[]
// Элементы: 3 элемента (MiniComponentCard)
// Превью: 200x150px с video/image
// Анимации: staggered animation, blur effects
// Навигация: ↑↓ keys, Enter, Escape
// Окно: 3 visible, startIndex для прокрутки
// Счетчик: "1 of 25"
```

### 2. **bookmarks-list.tsx** - закладки пользователя (492 строки)
```typescript
// Интерфейсы
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

// Данные: Bookmark[]
// Элементы: 3 элемента (BookmarkCard)
// Превью: 200x150px с video/image
// Анимации: НЕТ
// Навигация: ↑↓ keys, Enter, Escape
// Окно: 3 visible, startIndex для прокрутки
// Счетчик: "Your bookmarks • 1 of 25"
```

### 3. **icons-list.tsx** - Lucide иконки (414 строк)
```typescript
// Интерфейсы
interface IconsListProps {
  searchQuery?: string;
  onIconSelection?: (iconName: string) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (isFocused: boolean, activeIcon?: string) => void;
  onCloseIcons?: () => void;
  onReady?: () => void;
}

export interface IconsListRef {
  focusOnIcons: () => void;
  selectActiveIcon: () => boolean;
}

// Данные: string[] (icon names)
// Элементы: 3 элемента + recent section
// Превью: 48x48px иконка
// Анимации: НЕТ
// Навигация: ↑↓ keys, Enter, Escape
// Окно: 3 visible, startIndex для прокрутки
// Счетчик: "1 of 1245"
// Recent: localStorage с "Recent used" заголовком
```

### 4. **docs-list.tsx** - Context7 документация (570 строк)
```typescript
// Интерфейсы
interface DocsListProps {
  searchQuery?: string;
  onDocSelection?: (item: DocsItem) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (isFocused: boolean, activeDoc?: DocsItem) => void;
  onCloseDocs?: () => void;
  onReady?: () => void;
}

export interface DocsListRef {
  focusOnDocs: () => void;
  selectActiveDoc: () => boolean;
}

// Данные: DocsItem[] (static + API)
// Элементы: 3 элемента + API search
// Превью: 280px текстовое описание
// Анимации: НЕТ
// Навигация: ↑↓ keys, Enter, Escape
// Окно: 3 visible, startIndex для прокрутки
// Счетчик: НЕТ
// Recent: localStorage с "Recent" заголовком
```

### 5. **logos-list.tsx** - SVGL логотипы (389 строк)
```typescript
// Интерфейсы
interface LogosListProps {
  searchQuery: string;
  onLogoSelection: (logo: SVGLogo) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (focused: boolean) => void;
  onCloseLogos?: () => void;
  onReady?: () => void;
}

export interface LogosListRef {
  focus: () => void;
  blur: () => void;
}

// Данные: SVGLogo[] (from API)
// Элементы: 3 элемента (LogoCard)
// Превью: 200x150px с изображением
// Анимации: НЕТ
// Навигация: ↑↓ keys, Enter, Escape
// Окно: 3 visible, startIndex для прокрутки
// Счетчик: "Found 25 • 1 of 25"
```

## Общие дублированные паттерны

### 1. **Навигация клавиатурой** (200+ строк в каждом файле)
```typescript
// В КАЖДОМ компоненте:
- activeIndex: number
- startIndex: number (для окна 3 элементов)
- isFocused: boolean
- handleKeyDown: ArrowDown, ArrowUp, Enter, Escape
- useEffect для добавления/удаления слушателей
- containerRef для focus/blur
```

### 2. **Состояние фокуса** (50+ строк в каждом файле)
```typescript
// В КАЖДОМ компоненте:
- handleContainerFocus/Blur
- автоматическое управление activeIndex
- уведомления onFocusChange
- сброс состояния при потере фокуса
```

### 3. **Интерфейсы Props** (почти идентичные)
```typescript
// Общие props во всех компонентах:
- searchQuery?: string
- onFocusReturn?: () => void
- onFocusChange?: (isFocused: boolean, activeItem?: T) => void
- onClose*?: () => void
- onReady?: () => void
```

### 4. **Ref интерфейсы** (разные названия, одинаковая логика)
```typescript
// Разные названия, одинаковые методы:
- focusOnResults/focusOnBookmarks/focusOnIcons/focusOnDocs/focus
- selectActiveComponent/selectActiveBookmark/selectActiveIcon/selectActiveDoc
```

### 5. **Окно прокрутки** (60+ строк в каждом файле)
```typescript
// В КАЖДОМ компоненте:
- visibleItems = filteredItems.slice(startIndex, startIndex + 3)
- управление startIndex при навигации
- логика wraparound (0 -> last, last -> 0)
```

### 6. **Карточки элементов** (50+ строк в каждом файле)
```typescript
// Похожие карточки:
- MiniComponentCard (search-results)
- BookmarkCard (bookmarks-list)
- IconCard (icons-list - инлайн)
- DocCard (docs-list - инлайн)
- LogoCard (logos-list)
```

### 7. **Логика поиска и фильтрации** (30+ строк в каждом файле)
```typescript
// В КАЖДОМ компоненте:
- filteredItems = useMemo(() => {...}, [searchQuery, items])
- разная логика фильтрации, но одинаковая структура
```

### 8. **Recent функциональность** (50+ строк в icons + docs)
```typescript
// В icons-list.tsx:
- getRecentIcons(), saveRecentIcon()
- RECENT_ICONS_KEY = '21st-toolbar-recent-icons'
- MAX_RECENT_ICONS = 5

// В docs-list.tsx:
- getRecentDocs(), addToRecentDocs()
- RECENT_DOCS_KEY = 'toolbar-docs-recent'
- MAX_RECENT = 5
```

## Анализ `selected-dom-elements.tsx` и `chat-box.tsx`

### 6. **selected-dom-elements.tsx** - контекст чата (362 строки)
```typescript
// КРИТИЧНАЯ ПРОБЛЕМА: название не соответствует функциональности
// Компонент показывает НЕ только DOM элементы:
interface SelectedDomElementsProps {
  elements: Array<{ element: HTMLElement; pluginContext: any[] }>;        // DOM элементы
  selectedComponents?: SelectedComponentWithCode[];                       // 21st.dev компоненты
  runtimeError?: RuntimeError | null;                                     // Runtime ошибки
  // + логика для всех типов контекста
}

// Дублированная логика с @ панелями:
- isLucideIcon() - такая же функция как в icons-list.tsx
- IconHoverPeek - дублирует превью логику из icons-list.tsx  
- HoverPeek - использует тот же компонент что и bookmarks/search-results
- Avatar/preview логика - дублирует логику из всех @ панелей
```

### 7. **chat-box.tsx** - основной чат (2134 строки)
```typescript
// ОГРОМНОЕ дублирование состояния для @ панелей:
const [isIconsActivated, setIsIconsActivated] = useState(false);
const [isIconsFocused, setIsIconsFocused] = useState(false);
const [isIconsReady, setIsIconsReady] = useState(false);
const iconsListRef = useRef<IconsListRef>(null);

const [isBookmarksActivated, setIsBookmarksActivated] = useState(false);
const [isBookmarksFocused, setIsBookmarksFocused] = useState(false);
const [isBookmarksReady, setIsBookmarksReady] = useState(false);
const bookmarksListRef = useRef<BookmarksListRef>(null);

// ... x5 панелей = 60+ строк дублированного состояния

// Дублированные handlers:
- handleIconSelection, handleCloseIcons, handleIconsFocusChange
- handleBookmarkSelection, handleCloseBookmarks, handleBookmarksFocusChange  
- handleLogoSelection, handleCloseLogos, handleLogosFocusChange
- handleDocSelection, handleCloseDocs, handleDocsFocusChange
// = 200+ строк дублированного кода

// Дублированные useEffect для автофокуса:
useEffect(() => {
  if (shouldShowIcons && isIconsActivated) {
    iconsListRef.current?.focusOnIcons();
  }
}, [shouldShowIcons, isIconsActivated]);
// ... x5 панелей = 50+ строк дублированного кода
```

## Проблемы переиспользования preview компонентов

### Preview дублирование между @ панелями и ChatContext:
```typescript
// В search-results.tsx: большое превью 200x150px
{activeResult.video_url ? (
  <video src={activeResult.video_url} autoPlay loop muted />
) : (
  <img src={activeResult.preview_url} className="h-full w-full" />
)}

// В selected-dom-elements.tsx: hover превью 240x180px  
<HoverPeek imageSrc={component.preview_url} peekWidth={240} peekHeight={180}>
  {componentElement}
</HoverPeek>

// В icons-list.tsx: большое превью 48x48px
<IconComponent className="h-12 w-12 text-foreground" />

// В selected-dom-elements.tsx: hover превью 20x20px
const IconHoverPeek = ({ component }) => {
  return (
    <div className="h-20 w-20">
      <IconComponent className="h-10 w-10 text-foreground" />
    </div>
  );
};
```

**КРИТИЧЕСКАЯ ПРОБЛЕМА:** Один и тот же тип контента (компонент, иконка, логотип) имеет РАЗНЫЕ preview компоненты в @ панелях и в ChatContext!

## План миграции

### Этап 1: Shared компоненты и утилиты
```typescript
// components/shared/previews/ComponentPreview.tsx
interface ComponentPreviewProps {
  component: SelectedComponentWithCode;
  size: 'small' | 'medium' | 'large';       // 150px | 200px | 300px
  showVideo?: boolean;
}

// components/shared/previews/IconPreview.tsx  
interface IconPreviewProps {
  iconName: string;
  size: 'small' | 'medium' | 'large';       // 24px | 48px | 96px
}

// components/shared/previews/LogoPreview.tsx
interface LogoPreviewProps {
  logo: SVGLogo;
  size: 'small' | 'medium' | 'large';
}

// components/shared/previews/DocPreview.tsx
interface DocPreviewProps {
  doc: DocsItem;
  maxWidth?: number;
}

// utils/content-type-detection.ts
export function isLucideIcon(component: SelectedComponentWithCode): boolean
export function isSVGLogo(component: SelectedComponentWithCode): boolean  
export function isReactComponent(component: SelectedComponentWithCode): boolean
export function getContentType(component: SelectedComponentWithCode): 'icon' | 'logo' | 'component'

// components/lists/SearchableList.tsx
interface SearchableListProps<T> {
  items: T[];
  isLoading?: boolean;
  error?: string | null;
  searchQuery?: string;
  onItemSelection: (item: T) => void;
  onFocusReturn?: () => void;
  onFocusChange?: (isFocused: boolean, activeItem?: T) => void;
  onClose?: () => void;
  onReady?: () => void;
  
  // Кастомизация
  renderItem: (item: T, isFocused: boolean) => JSX.Element;
  renderPreview?: (item: T) => JSX.Element;
  renderHeader?: () => JSX.Element;
  renderFooter?: (activeIndex: number, totalItems: number) => JSX.Element;
  
  // Поведение
  filterItems?: (items: T[], query: string) => T[];
  keyExtractor: (item: T) => string;
  enableAnimations?: boolean;
}

// hooks/useKeyboardNav.ts
function useKeyboardNav<T>(items: T[], onSelect: (item: T) => void) {
  // Вся логика навигации клавиатурой
}

// hooks/useRecent.ts
function useRecent<T>(key: string, maxItems: number = 5) {
  // Универсальная логика для recent items
}

// hooks/useAtPanelState.ts
function useAtPanelState() {
  // Универсальное состояние для всех @ панелей
  const [activePanel, setActivePanel] = useState<'bookmarks' | 'icons' | 'docs' | 'logos' | null>(null);
  const [panelStates, setPanelStates] = useState<Record<string, PanelState>>({});
  // Заменяет 60+ строк дублированного состояния в chat-box.tsx
}
```

### Этап 2: ChatContext унификация
```typescript
// components/chat-context/ChatContext.tsx (было selected-dom-elements.tsx)
export function ChatContext({
  elements,
  selectedComponents,
  runtimeError,
  ...props
}: ChatContextProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {/* DOM Elements */}
      {elements.map((elementData) => (
        <ContextItem
          key={elementData.id}
          type="dom"
          data={elementData}
          onRemove={() => handleRemove('dom', elementData)}
        />
      ))}

      {/* Selected Components - ПЕРЕИСПОЛЬЗУЕТ те же preview компоненты */}
      {selectedComponents.map((component) => {
        const contentType = getContentType(component);
        
        return (
          <ContextItem
            key={component.id}
            type="component"
            data={component}
            preview={
              contentType === 'icon' ? (
                <IconPreview iconName={component.name} size="small" />
              ) : contentType === 'logo' ? (
                <LogoPreview logo={component} size="small" />
              ) : (
                <ComponentPreview component={component} size="small" />
              )
            }
            onRemove={() => handleRemove('component', component)}
          />
        );
      })}
      
      {/* Runtime Error */}
      {runtimeError && (
        <ContextItem
          type="error"
          data={runtimeError}
          onRemove={() => handleRemove('error', runtimeError)}
        />
      )}
    </div>
  );
}
```

### Этап 3: @ панели миграция

#### 3.1 Простые компоненты (icons, docs)
```typescript
// panels/lucide-icons.tsx (было icons-list.tsx)
export const LucideIcons = () => {
  const { recentIcons, addToRecent } = useRecent<string>('21st-toolbar-recent-icons');
  
  return (
    <SearchableList
      items={allIconNames}
      onItemSelection={handleIconSelection}
      renderItem={renderIconItem}
      renderPreview={(iconName) => <IconPreview iconName={iconName} size="large" />}
      filterItems={filterIcons}
      keyExtractor={(icon) => icon}
    />
  );
};
```

#### 3.2 Средние компоненты (bookmarks)
```typescript
// panels/bookmarks.tsx (было bookmarks-list.tsx)
export const Bookmarks = () => {
  return (
    <SearchableList
      items={bookmarks}
      onItemSelection={handleBookmarkSelection}
      renderItem={renderBookmarkItem}
      renderPreview={(component) => <ComponentPreview component={component} size="medium" />}
      filterItems={filterBookmarks}
      keyExtractor={(bookmark) => bookmark.id}
    />
  );
};
```

#### 3.3 Сложные компоненты (search-results, logos)
```typescript
// panels/search-results.tsx
export const SearchResults = () => {
  return (
    <SearchableList
      items={results}
      onItemSelection={handleComponentSelection}
      renderItem={renderComponentItem}
      renderPreview={(component) => <ComponentPreview component={component} size="medium" showVideo />}
      enableAnimations={true}
      keyExtractor={(result) => result.id}
    />
  );
};

// panels/svgl-logos.tsx (было logos-list.tsx)
export const SVGLLogos = () => {
  const { results, isLoading, error } = useSVGLSearch(searchQuery);
  
  return (
    <SearchableList
      items={results}
      isLoading={isLoading}
      error={error}
      onItemSelection={handleLogoSelection}
      renderItem={renderLogoItem}
      renderPreview={(logo) => <LogoPreview logo={logo} size="medium" />}
      keyExtractor={(logo) => logo.id}
    />
  );
};
```

### Этап 4: chat-box.tsx упрощение
```typescript
// chat-box.tsx ДО унификации (2134 строки):
const [isIconsActivated, setIsIconsActivated] = useState(false);
const [isIconsFocused, setIsIconsFocused] = useState(false);
const [isIconsReady, setIsIconsReady] = useState(false);
const iconsListRef = useRef<IconsListRef>(null);
// ... x5 панелей = 60+ строк состояния

const handleIconSelection = useCallback((iconName: string) => { /* 30 строк */ }, []);
const handleCloseIcons = useCallback(() => { /* 10 строк */ }, []);
const handleIconsFocusChange = useCallback((isFocused: boolean) => { /* 5 строк */ }, []);
// ... x5 панелей = 200+ строк handlers

// chat-box.tsx ПОСЛЕ унификации (1200 строк):
const { activePanel, panelState, handlers } = useAtPanelState();

// Один handler для всех панелей
const handlePanelSelection = useCallback((type: string, item: any) => {
  // Универсальная логика для всех типов
}, []);

// Один ref для всех панелей
const activePanelRef = useRef<SearchableListRef>(null);
```

### Этап 5: Удаление дублирования

#### Количество удаляемых строк:
- **search-results.tsx**: 592 → 80 строк (-512)
- **bookmarks-list.tsx**: 492 → 60 строк (-432)
- **icons-list.tsx**: 414 → 70 строк (-344)
- **docs-list.tsx**: 570 → 80 строк (-490)
- **logos-list.tsx**: 389 → 60 строк (-329)
- **selected-dom-elements.tsx**: 362 → 0 строк (-362) ➔ ChatContext.tsx
- **chat-box.tsx**: 2134 → 1200 строк (-934)

**Итого удаляется: 3403 строки дублированного кода**

#### Добавляемые компоненты:
- `SearchableList.tsx`: ~200 строк
- `useKeyboardNav.ts`: ~150 строк
- `useRecent.ts`: ~50 строк
- `useAtPanelState.ts`: ~100 строк
- `ChatContext.tsx`: ~150 строк
- Preview компоненты: ~200 строк
- Utils: ~50 строк

**Итого добавляется: 900 строк переиспользуемого кода**

### Этап 6: Рефакторинг файлов

#### Переименования:
- `icons-list.tsx` → `lucide-icons.tsx`
- `logos-list.tsx` → `svgl-logos.tsx`
- `docs-list.tsx` → `context7-docs.tsx`
- `bookmarks-list.tsx` → `bookmarks.tsx`
- `selected-dom-elements.tsx` → `ChatContext.tsx` ⭐
- `search-results.tsx` → `search-results.tsx` (остается)

#### Новая структура:
```
components/
├── lists/
│   └── SearchableList.tsx
├── shared/
│   ├── previews/
│   │   ├── ComponentPreview.tsx
│   │   ├── IconPreview.tsx
│   │   ├── LogoPreview.tsx
│   │   └── DocPreview.tsx
│   └── items/
│       ├── ComponentItem.tsx
│       ├── BookmarkItem.tsx
│       ├── IconItem.tsx
│       ├── LogoItem.tsx
│       └── DocItem.tsx
├── chat-context/
│   ├── ChatContext.tsx         ⭐ (было selected-dom-elements.tsx)
│   └── ContextItem.tsx
└── panels/
    ├── search-results.tsx
    ├── bookmarks.tsx
    ├── lucide-icons.tsx
    ├── context7-docs.tsx
    └── svgl-logos.tsx
```

## Результат унификации

### ✅ Что получаем:
1. **Удаляем 3403 строки дублированного кода** (увеличили с 2107!)
2. **Добавляем 900 строк переиспользуемого кода**
3. **Единый UX во всех @ панелях И в ChatContext**
4. **Централизованные preview компоненты** - используются везде
5. **Единая логика определения типов контента** (icon/logo/component)
6. **Упрощение chat-box.tsx** - с 2134 до 1200 строк (-934)
7. **Правильное именование** - `ChatContext.tsx` вместо `selected-dom-elements.tsx`
8. **Легкое добавление новых панелей** - один SearchableList для всех

### 🎯 Ключевые улучшения:
- **Preview переиспользование**: один IconPreview используется в @ icons панели И в ChatContext
- **Shared утилиты**: `isLucideIcon()`, `getContentType()` работают везде одинаково  
- **Единое состояние**: `useAtPanelState()` заменяет 60+ строк дублированного состояния
- **Consistency**: hover preview в ChatContext = большому preview в @ панелях

### ⚡ Временные затраты:
- **Этап 1**: Shared компоненты и утилиты (2-3 дня)
- **Этап 2**: ChatContext унификация (1-2 дня)
- **Этап 3**: @ панели миграция (3-4 дня)
- **Этап 4**: chat-box.tsx упрощение (2-3 дня)
- **Этап 5**: Тестирование (1-2 дня)
- **Этап 6**: Рефакторинг и переименования (1 день)

**Общее время: 10-15 дней**

### 📊 Статистика:
```
ДО унификации:
- 5 @ панелей: 2457 строк
- ChatContext: 362 строки  
- chat-box.tsx: 2134 строки
= 4953 строки с дублированием

ПОСЛЕ унификации:
- 5 @ панелей: 350 строк
- ChatContext: 150 строк
- chat-box.tsx: 1200 строк
- Shared: 900 строк
= 2600 строк без дублирования

ЭКОНОМИЯ: 2353 строки (-47.5%) 🎉
```