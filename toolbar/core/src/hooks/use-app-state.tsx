// This hook manages the state of the companion app. It provides information about all high level stuff that affects what components are rendered etc.

// This hook provides information to all components about whether certain parts of the companion layout should be rendered or not.
// Components can use this information to hide themselves or show additional information.

import { createRef, type RefObject, createContext } from 'preact';
import { useContext, useState, useCallback, useEffect } from 'preact/hooks';

export interface AppState {
  requestMainAppBlock: () => number;
  requestMainAppUnblock: () => number;
  discardMainAppBlock: (handle: number) => void;
  discardMainAppUnblock: (handle: number) => void;

  isMainAppBlocked: boolean;

  toolbarBoxRef: RefObject<HTMLElement | null>; // used to place popovers in case the reference is not available
  setToolbarBoxRef: (ref: RefObject<HTMLElement | null>) => void;
  unsetToolbarBoxRef: () => void;

  minimized: boolean;
  minimize: () => void;
  expand: () => void;

  position: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  setPosition: (
    position: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight',
  ) => void;

  promptAction: 'send' | 'copy' | 'both';
  setPromptAction: (action: 'send' | 'copy' | 'both') => void;

  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

interface InternalAppState extends AppState {
  appBlockRequestList: number[];
  appUnblockRequestList: number[];
  lastBlockRequestNumber: number;
  lastUnblockRequestNumber: number;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = 'stgws:companion';

function loadStateFromStorage(): Partial<InternalAppState> {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load state from storage:', error);
    return {};
  }
}

function saveStateToStorage(state: Partial<InternalAppState>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to storage:', error);
  }
}

export function AppStateProvider({
  children,
}: {
  children: preact.ComponentChildren;
}) {
  const [state, setState] = useState<InternalAppState>(() => {
    const storedState = loadStateFromStorage();
    return {
      appBlockRequestList: [],
      appUnblockRequestList: [],
      lastBlockRequestNumber: 0,
      lastUnblockRequestNumber: 0,
      isMainAppBlocked: false,
      toolbarBoxRef: createRef(),
      minimized: storedState.minimized ?? true,
      position: storedState.position ?? 'bottomRight',
      promptAction: storedState.promptAction ?? 'send',
      theme: storedState.theme ?? 'system',
      requestMainAppBlock: () => 0,
      requestMainAppUnblock: () => 0,
      discardMainAppBlock: () => {},
      discardMainAppUnblock: () => {},
      setToolbarBoxRef: () => {},
      unsetToolbarBoxRef: () => {},
      minimize: () => {},
      expand: () => {},
      setPosition: () => {},
      setPromptAction: () => {},
      setTheme: () => {},
    };
  });

  // Save state changes to storage
  useEffect(() => {
    saveStateToStorage({
      minimized: state.minimized,
      position: state.position,
      promptAction: state.promptAction,
      theme: state.theme,
    });
  }, [state.minimized, state.position, state.promptAction, state.theme]);

  const requestMainAppBlock = useCallback(() => {
    let newHandleValue = 0;
    setState((prev) => {
      newHandleValue = prev.lastBlockRequestNumber + 1;
      return {
        ...prev,
        appBlockRequestList: [...prev.appBlockRequestList, newHandleValue],
        lastBlockRequestNumber: newHandleValue,
        isMainAppBlocked: prev.appUnblockRequestList.length === 0,
      };
    });
    return newHandleValue;
  }, []);

  const requestMainAppUnblock = useCallback(() => {
    let newHandleValue = 0;
    setState((prev) => {
      newHandleValue = prev.lastUnblockRequestNumber + 1;
      return {
        ...prev,
        appUnblockRequestList: [...prev.appUnblockRequestList, newHandleValue],
        lastUnblockRequestNumber: newHandleValue,
        isMainAppBlocked: false,
      };
    });
    return newHandleValue;
  }, []);

  const discardMainAppBlock = useCallback((handle: number) => {
    setState((prev) => {
      const newBlockRequestList = prev.appBlockRequestList.filter(
        (h) => h !== handle,
      );
      return {
        ...prev,
        appBlockRequestList: newBlockRequestList,
        isMainAppBlocked:
          newBlockRequestList.length > 0 &&
          prev.appUnblockRequestList.length === 0,
      };
    });
  }, []);

  const discardMainAppUnblock = useCallback((handle: number) => {
    setState((prev) => {
      const newUnblockRequestList = prev.appUnblockRequestList.filter(
        (h) => h !== handle,
      );
      return {
        ...prev,
        appUnblockRequestList: newUnblockRequestList,
        isMainAppBlocked:
          prev.appBlockRequestList.length > 0 &&
          newUnblockRequestList.length === 0,
      };
    });
  }, []);

  const setToolbarBoxRef = useCallback((ref: RefObject<HTMLElement | null>) => {
    setState((prev) => ({ ...prev, toolbarBoxRef: ref }));
  }, []);

  const unsetToolbarBoxRef = useCallback(() => {
    setState((prev) => ({ ...prev, toolbarBoxRef: createRef() }));
  }, []);

  const minimize = useCallback(() => {
    setState((prev) => ({ ...prev, minimized: true }));
  }, []);

  const expand = useCallback(() => {
    setState((prev) => ({ ...prev, minimized: false }));
  }, []);

  const setPosition = useCallback(
    (position: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight') => {
      setState((prev) => ({ ...prev, position }));
    },
    [],
  );

  const setPromptAction = useCallback((action: 'send' | 'copy' | 'both') => {
    setState((prev) => ({ ...prev, promptAction: action }));
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  // Apply theme to toolbar element
  useEffect(() => {
    const applyTheme = () => {
      // Find the toolbar anchor element
      const toolbarElement = document.querySelector(
        'stagewise-companion-anchor',
      );
      const isDark =
        state.theme === 'dark' ||
        (state.theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (toolbarElement) {
        if (isDark) {
          toolbarElement.classList.add('dark');
        } else {
          toolbarElement.classList.remove('dark');
        }
      }
    };

    // Delay the theme application to ensure the toolbar element exists
    const timeoutId = setTimeout(applyTheme, 100);

    // Listen for system theme changes when using 'system' mode
    if (state.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => {
        clearTimeout(timeoutId);
        mediaQuery.removeEventListener('change', applyTheme);
      };
    }

    return () => clearTimeout(timeoutId);
  }, [state.theme]);

  const value: AppState = {
    requestMainAppBlock,
    requestMainAppUnblock,
    discardMainAppBlock,
    discardMainAppUnblock,
    isMainAppBlocked: state.isMainAppBlocked,
    toolbarBoxRef: state.toolbarBoxRef,
    setToolbarBoxRef,
    unsetToolbarBoxRef,
    minimized: state.minimized,
    minimize,
    expand,
    position: state.position,
    setPosition,
    promptAction: state.promptAction,
    setPromptAction,
    theme: state.theme,
    setTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
