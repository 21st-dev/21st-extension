import { useCallback } from 'preact/hooks';
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
    setSearchResultsFocused,
  } = useChatState();

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

        if (hotkeyActionDefinitions[HotkeyActions.ESC].isEventMatching(event)) {
          event.preventDefault();

          // Если в фокусе search results - только убираем фокус
          if (isSearchResultsFocused) {
            setSearchResultsFocused(false);
          }
          // Если чат открыт - закрываем его
          else if (isPromptCreationActive) {
            stopPromptCreation();
          } else if (!minimized) {
            // Если нет чата но toolbar развернут - минимизируем
            minimize();
          }
        }
      },
      [
        minimized,
        expand,
        minimize,
        isPromptCreationActive,
        stopPromptCreation,
        startPromptCreation,
        isSearchResultsFocused,
        setSearchResultsFocused,
      ],
    ),
  );

  return null;
};

export default HotkeyListener;
