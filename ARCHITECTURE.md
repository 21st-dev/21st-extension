# 21st Extension Architecture

21st Extension is a browser toolbar that connects frontend UI with AI agents in code editors. The project provides visual code interaction through a web interface.

## System Overview

The system consists of several main components interacting with each other:

```
┌─────────────────┐    WebSocket/HTTP    ┌─────────────────┐
│  Browser        │◄──────────────────►│  VSCode         │
│  (Toolbar)      │     SRPC Protocol   │  Extension      │
└─────────────────┘                     └─────────────────┘
        │                                        │
        │                                        │ MCP Protocol
        ▼                                        ▼
┌─────────────────┐                     ┌─────────────────┐
│  Web App        │                     │  AI Agents      │
│  (User's Site)  │                     │  (Cursor/Cline) │
└─────────────────┘                     └─────────────────┘
```

## Monorepo Structure

The project is organized as a monorepo using:
- **pnpm workspaces** - dependency management
- **Turbo** - build system and caching
- **TypeScript** - primary development language

### Main Directories

```
21st-extension/
├── apps/                    # Applications
│   └── vscode-extension/    # VSCode/Cursor extension
├── packages/                # Shared packages
│   ├── srpc/               # Simple RPC system
│   ├── extension-toolbar-srpc-contract/  # Communication contract
│   ├── ui/                 # UI components
│   └── typescript-config/  # TypeScript configurations
├── toolbar/                 # Browser toolbar
│   ├── core/               # Core toolbar logic
│   ├── react/              # React integration
│   ├── vue/                # Vue integration
│   └── next/               # Next.js integration
├── plugins/                 # Framework plugins
│   ├── react/              # React plugin
│   ├── vue/                # Vue plugin
│   └── angular/            # Angular plugin
└── examples/               # Usage examples
```

## System Components

### 1. VSCode Extension (`apps/vscode-extension/`)

**Purpose**: Extension for code editors (VSCode, Cursor, Windsurf) that provides the connection between toolbar and AI agents.

**Key Features**:
- Launch HTTP/WebSocket server for toolbar communication
- AI agent integration through MCP (Model Context Protocol)
- Automatic toolbar setup in projects
- Editor window discovery and switching
- Telemetry and analytics

**Архитектура**:
```
Extension
├── activation/          # Активация расширения
├── http-server/        # HTTP сервер для коммуникации
│   ├── handlers/       # Обработчики запросов (MCP, SSE)
│   └── middleware/     # Middleware (error handling)
├── mcp/               # Model Context Protocol сервер
├── services/          # Сервисы (аналитика, storage, workspace)
├── utils/             # Утилиты (агенты, парсеры, discovery)
└── webviews/          # Веб-панели для VSCode
```

**Протоколы коммуникации**:
- **HTTP REST API** - базовая коммуникация с toolbar
- **WebSocket** - реальное время обновления через SRPC
- **Server-Sent Events (SSE)** - потоковая передача данных
- **MCP** - интеграция с AI агентами

### 2. Toolbar (`toolbar/core/`)

**Назначение**: Браузерная панель инструментов, которая внедряется в веб-приложения для визуального взаимодействия с кодом.

**Ключевые возможности**:
- Выбор DOM элементов на странице
- Визуальная аннотация элементов
- Отправка промптов AI агентам с контекстом
- Поиск и подключение к расширению
- Плагинная архитектура

**Технологии**:
- **Preact** - легковесная альтернатива React
- **Shadow DOM** - изоляция стилей от основного приложения
- **Tailwind CSS** - стилизация
- **Framer Motion** - анимации

**Архитектура**:
```
Toolbar Core
├── components/         # UI компоненты
│   ├── toolbar/       # Основная toolbar
│   ├── dom-context/   # DOM селекторы
│   └── layouts/       # Макеты (desktop/mobile)
├── hooks/             # React хуки
├── services/          # Внешние сервисы (Supabase)
├── plugin-ui/         # API для плагинов
└── utils/             # Утилиты
```

### 3. SRPC (`packages/srpc/`)

**Назначение**: Simple RPC система для типизированной коммуникации между toolbar и расширением через WebSocket.

**Особенности**:
- Типизированные контракты с Zod валидацией
- Автоматическая серializация/десериализация
- Поддержка потоковых обновлений
- Обработка ошибок и переподключений

**Архитектура**:
```
SRPC
├── core.ts            # Базовые типы и WebSocket мост
├── server.ts          # Серверная часть (VSCode Extension)
├── client.ts          # Клиентская часть (Toolbar)
├── zod-contract.ts    # Создание типизированных контрактов
└── zod-bridge.ts      # Zod интеграция
```

### 4. Плагины (`plugins/*/`)

**Назначение**: Расширения функциональности toolbar для конкретных фреймворков.

**Возможности плагинов**:
- Анализ DOM элементов с учетом фреймворка
- Извлечение метаданных компонентов
- Генерация контекстной информации для AI
- Кастомные аннотации элементов

**Пример React плагина**:
```typescript
export const ReactPlugin: ToolbarPlugin = {
  displayName: 'React',
  description: 'Adds React-specific metadata',
  iconSvg: <ReactLogo />,
  pluginName: 'react',
  onContextElementHover: getSelectedElementAnnotation,
  onContextElementSelect: getSelectedElementAnnotation,
  onPromptSend: (prompt) => ({
    contextSnippets: [{
      promptContextName: 'elements-react-component-info',
      content: getSelectedElementsPrompt(prompt.contextElements),
    }]
  }),
};
```

## Поток данных

### 1. Инициализация
```
1. VSCode Extension активируется
2. Запускается HTTP сервер на порту 5746+
3. Toolbar внедряется в веб-приложение
4. Toolbar находит расширение через ping endpoint
5. Устанавливается WebSocket соединение
```

### 2. Взаимодействие с UI
```
1. Пользователь выбирает элемент на странице
2. Плагины анализируют элемент
3. Toolbar показывает аннотации
4. Пользователь пишет промпт
5. Контекст + промпт отправляется в расширение
6. Расширение передает данные AI агенту
7. Результат возвращается пользователю
```

### 3. Система плагинов
```
1. Toolbar загружает плагины из конфигурации
2. При наведении/выборе элемента вызываются хуки плагинов
3. Плагины возвращают метаданные элемента
4. При отправке промпта плагины добавляют контекст
5. Все данные агрегируются и отправляются агенту
```

## Технологические решения

### Коммуникация
- **WebSocket** - основной канал связи с расширением
- **SRPC** - типизированная RPC система поверх WebSocket
- **Zod** - валидация и типизация контрактов
- **Server-Sent Events** - потоковая передача от агентов

### UI и Frontend
- **Preact** - легковесная библиотека для toolbar
- **Shadow DOM** - изоляция стилей
- **Tailwind CSS** - утилитарный CSS фреймворк
- **Framer Motion** - библиотека анимаций

### Сборка и разработка
- **Turbo** - monorepo система сборки
- **pnpm** - пакетный менеджер
- **Vite** - сборщик для фронтенда
- **Webpack** - сборщик для VSCode расширения
- **TypeScript** - типизация

### AI интеграция
- **MCP (Model Context Protocol)** - стандарт коммуникации с AI
- Поддержка агентов: Cursor, Cline, GitHub Copilot, Windsurf, Roo Code

## Безопасность

- **CORS** - настроен для локальной разработки
- **Shadow DOM** - изоляция toolbar от основного приложения
- **Локальная коммуникация** - только между localhost компонентами
- **Валидация данных** - через Zod схемы
- **Телеметрия** - анонимная, с возможностью отключения

## Развертывание

### VSCode Extension
- Публикуется в VS Code Marketplace
- Автоматическая активация при запуске редактора
- Поддерживает auto-update

### Toolbar
- Устанавливается как npm пакет
- Интегрируется в существующие приложения
- Работает только в development режиме

### Плагины
- Отдельные npm пакеты для каждого фреймворка
- Подключаются через конфигурацию toolbar
- Могут быть кастомными для проекта

## Масштабируемость

- **Плагинная архитектура** - легко добавлять поддержку новых фреймворков
- **Monorepo** - переиспользование кода между компонентами
- **Типизированные контракты** - безопасные изменения API
- **Модульная структура** - независимые компоненты

## Мониторинг

- **Телеметрия** - анонимные метрики использования
- **Error Handling** - централизованная обработка ошибок
- **Логирование** - подробные логи для отладки
- **Analytics Service** - отслеживание ключевых событий 