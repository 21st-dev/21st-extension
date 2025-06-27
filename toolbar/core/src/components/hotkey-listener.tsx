import { useCallback, useEffect, useRef } from 'preact/hooks';
import { HotkeyActions, hotkeyActionDefinitions } from '../utils';
import { useEventListener } from '../hooks/use-event-listener';
import { useAppState } from '../hooks/use-app-state';
import { useChatState } from '../hooks/use-chat-state';

// This listener is responsible for listening to hotkeys and triggering the appropriate actions in the global app state.
const HotkeyListener = () => {
  const { minimized, expand, minimize } = useAppState();
  const {
    isPromptCreationActive,
    stopPromptCreation,
    startPromptCreation,
    isSearchResultsFocused,
    closeSearchResults,
    isDomSelectorActive,
    startDomSelector,
    stopDomSelector,
  } = useChatState();

  // Use refs to store current state for immediate access in event handlers
  const stateRef = useRef({
    isSearchResultsFocused,
    isDomSelectorActive,
    isPromptCreationActive,
    minimized,
  });

  // Update ref whenever state changes
  useEffect(() => {
    stateRef.current = {
      isSearchResultsFocused,
      isDomSelectorActive,
      isPromptCreationActive,
      minimized,
    };
  }, [
    isSearchResultsFocused,
    isDomSelectorActive,
    isPromptCreationActive,
    minimized,
  ]);

  useEventListener(
    'keydown',
    useCallback(
      (event: KeyboardEvent) => {
        if (
          hotkeyActionDefinitions[HotkeyActions.ALT_PERIOD].isEventMatching(
            event,
          )
        ) {
          event.preventDefault();

          // Если минимизирован - разворачиваем и открываем чат
          if (minimized) {
            expand();
            setTimeout(() => startPromptCreation(), 100);
          } else if (!isPromptCreationActive) {
            // Если развернут но чат закрыт - открываем чат
            startPromptCreation();
          }
        }

        if (
          hotkeyActionDefinitions[HotkeyActions.CMD_OPT_PERIOD].isEventMatching(
            event,
          )
        ) {
          event.preventDefault();

          // Если чат не активен - сначала открываем чат
          if (!isPromptCreationActive) {
            if (minimized) {
              expand();
            }
            startPromptCreation();
            // Активируем DOM селектор с небольшой задержкой
            setTimeout(() => startDomSelector(), 100);
          } else {
            // Если чат уже активен - переключаем состояние DOM селектора
            if (isDomSelectorActive) {
              stopDomSelector();
            } else {
              startDomSelector();
            }
          }
        }

        if (hotkeyActionDefinitions[HotkeyActions.ESC].isEventMatching(event)) {
          event.preventDefault();

          // Get current state from ref to avoid stale closures
          const currentState = stateRef.current;

          // Если в фокусе search results - полностью закрываем поиск
          if (currentState.isSearchResultsFocused) {
            closeSearchResults();
          }
          // Если активен DOM селектор - деактивируем его
          else if (currentState.isDomSelectorActive) {
            stopDomSelector();
          }
          // Если чат открыт - закрываем его
          else if (currentState.isPromptCreationActive) {
            stopPromptCreation();
          } else if (!currentState.minimized) {
            // Если нет чата но toolbar развернут - минимизируем
            minimize();
          }
        }
      },
      [
        expand,
        minimize,
        stopPromptCreation,
        startPromptCreation,
        closeSearchResults,
        startDomSelector,
        stopDomSelector,
        stateRef,
      ],
    ),
  );

  return null;
};

export default HotkeyListener;
