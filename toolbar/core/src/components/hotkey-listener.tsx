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

          // If minimized - expand and open chat
          if (minimized) {
            expand();
            setTimeout(() => startPromptCreation(), 100);
          } else if (!isPromptCreationActive) {
            // If expanded but chat closed - open chat
            startPromptCreation();
          } else {
            // If chat already open - toggle DOM selector
            if (isDomSelectorActive) {
              stopDomSelector();
            } else {
              startDomSelector();
            }
          }
        }

        if (
          hotkeyActionDefinitions[HotkeyActions.CMD_OPT_PERIOD].isEventMatching(
            event,
          )
        ) {
          event.preventDefault();

          // If chat is not active - first open chat
          if (!isPromptCreationActive) {
            if (minimized) {
              expand();
            }
            startPromptCreation();
            // Activate DOM selector with small delay
            setTimeout(() => startDomSelector(), 100);
          } else {
            // If chat is already active - toggle DOM selector state
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

          // If search results are focused - close search completely
          if (currentState.isSearchResultsFocused) {
            closeSearchResults();
          }
          // If DOM selector is active - deactivate it
          else if (currentState.isDomSelectorActive) {
            stopDomSelector();
          }
          // If chat is open - close it
          else if (currentState.isPromptCreationActive) {
            stopPromptCreation();
          } else if (!currentState.minimized) {
            // If no chat but toolbar expanded - minimize
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
